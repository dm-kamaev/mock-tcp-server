import TcpServers from './Tcp_Servers';

const tcpServers = new TcpServers([]);

export function getTcpServers() {
  return tcpServers;
}

export function closeAllTcpServers() {
  tcpServers.closeAll();
}
