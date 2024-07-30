import EventEmitter from 'node:events';
import type net from 'node:net';
import type TcpServers from './Tcp_Servers';
import { getTcpServers } from './tcp_servers.store';
import detectHost from './detect_host';
import { execHookOnCreateClientSocket, execHookOnCreateServerSocket } from './settings.store';

export interface ITcpSocket extends EventEmitter {
  write(input: any): boolean;
  end(onError: (err?: Error) => void): this;
  destroy(_error: Error | undefined): this;
  set<Key extends keyof net.Socket>(key: Key, value: net.Socket[Key]): this;
  connect(
    ...args:
      | [options: net.NetConnectOpts, connectionListener?: () => void]
      | [port: number, host?: string, connectionListener?: () => void]
      | [path: string, connectionListener?: () => void]
      // input type for net.connect
      | [port: number, connectionListener?: () => void]
  ): net.Socket;
}

export default class TcpSocket extends EventEmitter implements ITcpSocket {
  private getSocket: () => ITcpSocket;

  constructor(options?: { getSocket(): ITcpSocket }) {
    super();
    if (options && options?.getSocket) {
      this.getSocket = options?.getSocket;
    }
  }

  write(input) {
    // We are currently waiting to attach event listeners
    // Espesially it's important when socket is created and immediately emit events
    process.nextTick(() => {
      this.getSocket().emit('data', input);
    });
    return true;
  }

  end(onError?: (err?: Error) => void) {
    try {
      // calling events on another side
      this.getSocket().emit('close');
      this.getSocket().emit('end');
      // calling events on this socket
      this.emit('end');
      this.emit('close');
      if (onError) {
        onError();
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    } finally {
      // eslint-disable-next-line no-unsafe-finally
      return this;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  destroy(_error?: Error | undefined) {
    this.end();
    return this;
  }

  /**
   * Set property for socket
   */
  set<Key extends keyof net.Socket>(key: Key, value: net.Socket[Key]) {
    this[key as string] = value;
    return this;
  }

  connect(
    ...args:
      | [options: net.NetConnectOpts, connectionListener?: () => void]
      | [port: number, host?: string, connectionListener?: () => void]
      | [path: string, connectionListener?: () => void]
      // input type for net.connect
      | [port: number, connectionListener?: () => void]
  ) {
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
    const clientSocket = this;
    const serverSocket = (context.serverSocket = new TcpSocket({
      getSocket: () => clientSocket,
    }));
    this.getSocket = () => serverSocket;

    execHookOnCreateServerSocket(serverSocket);
    execHookOnCreateClientSocket(clientSocket);

    // We are currently waiting to attach event listeners
    process.nextTick(() => {
      if (connectionListener) {
        connectionListener();
      }
      this.emit('connect');
      tcpServer.onConnection(serverSocket);
      tcpServer.emit('connection', serverSocket);
    });

    return this as unknown as net.Socket;
  }
}
