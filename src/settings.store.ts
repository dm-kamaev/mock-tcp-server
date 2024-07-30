import type TcpSocket from './Tcp_Socket';
import type TcpServer from './Tcp_Server';

export interface Settings {
  hookOnCreateClientSocket?: (socket: TcpSocket) => void;
  hookOnCreateServerSocket?: (socket: TcpSocket) => void;
  hookOnCreateServer?: (server: TcpServer) => void;
}

let settings: Settings = {};

export function setSettings(inputSettings: Settings) {
  settings = inputSettings;
}

export function execHookOnCreateServer(server: TcpServer) {
  if (settings?.hookOnCreateServer) {
    settings.hookOnCreateServer(server);
  }
}

export function execHookOnCreateServerSocket(serverSocket: TcpSocket) {
  if (settings?.hookOnCreateServerSocket) {
    settings.hookOnCreateServerSocket(serverSocket);
  }
}

export function execHookOnCreateClientSocket(clientSocket: TcpSocket) {
  if (settings?.hookOnCreateClientSocket) {
    settings.hookOnCreateClientSocket(clientSocket);
  }
}
