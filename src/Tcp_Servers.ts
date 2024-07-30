import type TcpServer from './Tcp_Server';

export default class TcpServers {
  constructor(private servers: Array<TcpServer> = []) {}

  add(server: TcpServer) {
    this.servers.push(server);
  }

  remove(serverRemove: TcpServer) {
    this.servers = this.servers.filter((el) => el !== serverRemove);
  }

  findBy(selector: { port: number; host: string } | { path: string }) {
    for (const server of this.servers) {
      if (server.isBindTo(selector)) {
        return server;
      }
    }
    return undefined;
  }

  closeAll() {
    this.servers.forEach((server) => server.close());
  }
}
