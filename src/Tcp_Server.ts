import EventEmitter from 'node:events';
import net from 'node:net';
import type TcpServers from './Tcp_Servers';
import type TcpSocket from './Tcp_Socket';
import detectHost from './detect_host';
import { execHookOnCreateServer } from './settings.store';

export default class TcpServer extends EventEmitter {
  private port: number;

  // unix socket
  private path: string;

  private host: string;

  private _address: string | net.AddressInfo | null = null;

  private idle: NodeJS.Timeout;

  constructor(
    private tcpServers: TcpServers,
    private readonly _onConnection: (socket: net.Socket) => void,
  ) {
    super();
  }

  // listen(port?: number, hostname?: string, listeningListener?: () => void): this;
  // listen(port?: number, backlog?: number, listeningListener?: () => void): this;
  // listen(port?: number, listeningListener?: () => void): this;
  // listen(path: string, backlog?: number, listeningListener?: () => void): this;
  // listen(path: string, listeningListener?: () => void): this;
  // listen(options: ListenOptions, listeningListener?: () => void): this;
  // listen(handle: any, backlog?: number, listeningListener?: () => void): this;
  // listen(handle: any, listeningListener?: () => void): this;
  // listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void) {
  listen(
    ...args:
      | [port?: number, hostname?: string, listeningListener?: () => void]
      | [port?: number, backlog?: number, listeningListener?: () => void]
      | [port?: number, listeningListener?: () => void]
      | [path: string, backlog?: number, listeningListener?: () => void]
      | [path: string, listeningListener?: () => void]
      | [options: net.ListenOptions, listeningListener?: () => void]
      | [handle: any, backlog?: number, listeningListener?: () => void]
      | [handle: any, listeningListener?: () => void]
      | [port?: number, hostname?: string, backlog?: number, listeningListener?: () => void]
  ) {
    if (typeof args[0] === 'number') {
      this.port = args[0] as number;
      const hostname = args[1];
      this._address =
        typeof hostname === 'string'
          ? { address: hostname, family: net.isIPv4(hostname) ? 'IPv4' : 'IPv6', port: this.port }
          : { address: '::', family: 'IPv6', port: this.port };
    }

    if (typeof args[0] === 'string') {
      this.path = args[0] as string;
      this._address = this.path;
    }

    if (args[0] instanceof Object) {
      const { host, port, path } = args[0] as net.ListenOptions;

      if (path) {
        this.path = path;
        this._address = this.path;
      } else {
        this.host = detectHost(host);

        if (!port) {
          throw new Error('The argument \'options\' must have the property "port" or "path');
        }

        this.port = port;
        this._address = {
          address: host || '::',
          family: host ? (net.isIPv4(host) ? 'IPv4' : 'IPv6') : 'IPv6',
          port: this.port,
        };
      }
    }

    if (typeof args[1] === 'string') {
      this.host = detectHost(args[1]);
      // { address: '::', family: 'IPv6', port: 5004 }
    }

    // if host wasn't passed generally
    if (!this.host) {
      this.host = detectHost(undefined);
    }

    const onStart = args.at(-1);
    if (onStart) {
      onStart();
    }

    // emulate run server
    this.idle = setInterval(() => undefined, 2000);

    const server = this;

    execHookOnCreateServer(server);

    return this;
  }

  /**
   * Set property for socket
   */
  set<Key extends keyof net.Server>(key: Key, value: net.Server[Key]) {
    this[key as string] = value;
  }

  address() {
    return this._address;
  }

  onConnection(socket: TcpSocket) {
    this._onConnection(socket as unknown as net.Socket);
  }

  close(onError?: (err?: Error) => void) {
    try {
      clearInterval(this.idle);

      const tcpServer = this;
      this.emit('close');
      this.tcpServers.remove(tcpServer);
      if (onError) {
        onError();
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }
  }

  isBindTo(selector: { port: number; host: string } | { path: string }) {
    if ('port' in selector) {
      if (this.port === selector.port && this.host === selector.host) {
        return true;
      }
    } else if (this.path && this.path === selector.path) {
      return true;
    }
    return false;
  }
}
