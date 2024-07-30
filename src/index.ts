import net from 'node:net';
import TcpServers from './Tcp_Servers';
import TcpServer from './Tcp_Server';
import TcpSocket from './Tcp_Socket';
import detectHost from './detect_host';
import { getTcpServers } from './tcp_servers.store';
import { Settings, execHookOnCreateClientSocket, execHookOnCreateServerSocket, setSettings } from './settings.store';

export { getTcpServers } from './tcp_servers.store';
export { TcpServer, TcpSocket };

const createServerOriginal = net.createServer.bind(net);
const createConnectionOriginal = net.createConnection.bind(net);
const connectOriginal = net.connect.bind(net);
const SocketOriginal = net.Socket.bind(net);

export function enableMock(settings?: Settings) {
  if (settings) {
    setSettings(settings);
  }
  /**
   * This "console.log" is required!!!
   * We fix this error:
   * node:tty:107
   *  this._handle.setBlocking(true);
   *    TypeError: Cannot read properties of undefined (reading 'setBlocking')
   *      at new WriteStream (node:tty:107:16)
   * This  error occurred, because, the Node js runtime called the console constructor under the hood which uses the tty.ReadStream (which inherits from the net.Socket class) for process.stdin.
   * Thus we must execute console.log before redefined net.Socket.
   * I don't know how fix this problem another way
   */
  console.log('');

  // function createServer(connectionListener?: (socket: Socket) => void): Server;
  // function createServer(options?: ServerOpts, connectionListener?: (socket: Socket) => void): Server;
  net.createServer = (
    ...args:
      | [connectionListener?: (socket: net.Socket) => void]
      | [options?: net.ServerOpts, connectionListener?: (socket: net.Socket) => void]
  ) => {
    const onConnection = typeof args[0] === 'function' ? args[0] : (args.at(-1) as (socket: net.Socket) => void);

    const tcpServers = getTcpServers();
    const server = new TcpServer(tcpServers, onConnection);

    tcpServers.add(server);

    return server as unknown as net.Server;
  };

  // connect(options: SocketConnectOpts, connectionListener?: () => void): this;
  // connect(port: number, host: string, connectionListener?: () => void): this;
  // connect(port: number, connectionListener?: () => void): this;
  // connect(path: string, connectionListener?: () => void): this;

  // function createConnection(options: net.NetConnectOpts, connectionListener?: () => void): Socket;
  // function createConnection(port: number, host?: string, connectionListener?: () => void): Socket;
  // function createConnection(path: string, connectionListener?: () => void): Socket;

  net.createConnection = net.connect = (
    ...args:
      | [options: net.NetConnectOpts, connectionListener?: () => void]
      | [port: number, host?: string, connectionListener?: () => void]
      | [path: string, connectionListener?: () => void]
      // input type for net.connect
      | [port: number, connectionListener?: () => void]
  ) => {
    let serverParams = {} as Parameters<TcpServers['findBy']>[0];
    let connectionListener: (() => void) | undefined;
    if (args[0] instanceof Object) {
      const inputParams = args as [options: net.NetConnectOpts, connectionListener?: () => void];
      const options = inputParams[0];
      // because may be IPC connection
      const { port, host: inputHost } = options as net.TcpNetConnectOpts;
      if (!port) {
        throw new Error(`Not found port ${port} in ${JSON.stringify(options, null, 2)}`);
      }

      serverParams = { port, host: detectHost(inputHost) };

      connectionListener = typeof inputParams.at(-1) === 'function' ? (inputParams.at(-1) as () => void) : undefined;
    } else if (typeof args[0] === 'string') {
      const inputParams = args as [path: string, connectionListener?: () => void];
      const path = inputParams[0];
      serverParams = { path };

      connectionListener = typeof inputParams.at(-1) === 'function' ? (inputParams.at(-1) as () => void) : undefined;
    } else if (typeof args[0] === 'number') {
      const inputParams = args as
        | [port: number, host?: string, connectionListener?: () => void]
        | [port: number, connectionListener?: () => void];

      serverParams = {
        port: inputParams[0],
        host: typeof inputParams[1] === 'function' ? detectHost(undefined) : detectHost(inputParams[1]),
      };

      connectionListener = typeof inputParams.at(-1) === 'function' ? (inputParams.at(-1) as () => void) : undefined;
    }

    const tcpServer = getTcpServers().findBy(serverParams);

    if (!tcpServer) {
      throw new Error(`Not found server with params: ${JSON.stringify(serverParams, null, 2)}`);
    }

    const context = {} as { clientSocket: TcpSocket; serverSocket: TcpSocket };
    const serverSocket = (context.serverSocket = new TcpSocket({
      getSocket: () => context.clientSocket,
    }));
    const clientSocket = (context.clientSocket = new TcpSocket({
      getSocket: () => context.serverSocket,
    }));

    execHookOnCreateServerSocket(serverSocket);
    execHookOnCreateClientSocket(clientSocket);

    // OLD VERSION
    // tcpServer.onConnection(serverSocket);
    // process.nextTick(() => {
    //   tcpServer.emit('connection', serverSocket);
    //   if (connectionListener) {
    //     connectionListener();
    //   }
    //   clientSocket.emit('connect');
    // });

    // We are currently waiting to attach event listeners
    process.nextTick(() => {
      if (connectionListener) {
        connectionListener();
      }
      clientSocket.emit('connect');
      tcpServer.onConnection(serverSocket);
      tcpServer.emit('connection', serverSocket);
    });

    return clientSocket as unknown as net.Socket;
  };

  // OLD VERSION
  // net.Socket = class Wrapper {
  //   constructor() {
  //     // eslint-disable-next-line no-constructor-return
  //     return new TcpSocket();
  //   }
  // } as any;

  net.Socket = function Wrapper() {
    return new TcpSocket();
  } as any;

  // (net as any).Socket = () => {
  // // net.Socket = () => {
  //   // class Wrapper extends Stream.Duplex {
  //   class Wrapper {
  //     constructor(options?: net.SocketConstructorOpts) {
  //       // super(options);
  //       return new TcpSocket() as any;
  //     }
  //   };
  //   return new Wrapper();
  // };
}

export function disableMock() {
  net.createServer = createServerOriginal;
  net.createConnection = createConnectionOriginal;
  net.connect = connectOriginal;
  net.Socket = SocketOriginal;
}
