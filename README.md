# Mock Tcp Server

[![Actions Status](https://github.com/dm-kamaev/mock-tcp-server/workflows/Build/badge.svg)](https://github.com/dm-kamaev/mock-tcp-server/actions) ![Coverage](https://github.com/dm-kamaev/mock-tcp-server/blob/master/coverage/badge-statements.svg)

This library helps to testing tcp server and client in Node js. It simulates the internal behaviour  of  "net" module allowing you to test tcp server and client in memory of process without access to port or socket. This approach was inspired library [supertest](https://www.npmjs.com/package/supertest) but for tcp server.



## Install
```sh
npm i mock-tcp-server -S
```

## Example

```ts
import net from 'node:net';
import { enableMock, disableMock, getTcpServers } from 'mock-tcp-server';

// Create a net server
async function createTcpServer(logs: string[]) {
  return new Promise<net.Server>((resolve) => {
    const server = net.createServer((socket) => {
      logs.push('Client connected');

      socket.on('data', (data) => {
        logs.push(`[Server]: Received data from client: ${data}`);
        socket.write('OK');
      });

      socket.on('end', () => {
        logs.push('[Server]: Client disconnected');
      });
    });

    server.on('connection', (socket) => {
      logs.push('[Server]: Accept new connection');
    });

    server.on('close', () => {
      logs.push('[Server]: Server closed');
    });

    server.listen(5004, () => {
      logs.push(`Server is listening on port: 5004`);
      resolve(server);
    });
  });
}



describe('[Tcp Server]', () => {
  const logs: string[] = [];

  beforeAll(async () => {
    enableMock();
  });

  afterAll(() => {
    // close all servers
    getTcpServers().closeAll();
    disableMock();
  });

  afterEach(() => {
    logs.length = 0;
  });

  it('connect to tcp server', async () => {
    const server = await createTcpServer(logs);

    // Create connection to TCP server
    const client = net.createConnection(5004, 'localhost', () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
      });

      client.on('close', () => {
        logs.push('[Client]: Client was closed');
        resolve();
      });

      // Handle client disconnection
      client.on('end', () => {
        logs.push('[Client]: Disconnected from server');
      });
    });


    server.close((err) => logs.push('Server was closed! '+err));

    // Expected behaviour
    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client connected',
      '[Server]: Accept new connection',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined'
    ]);
  });

});
```

## Socket and server properties
You can use hook `hookOnCreateClientSocket/hookOnCreateServerSocket` for set or redefined properties of socket. Hook `hookOnCreateServer` may be using for set properties of server.
```ts
beforeAll(() => {
  enableMock({
    // Set address for server
    hookOnCreateServer(tcpServer) {
      /**
      * server.listen(5004, () => {
      *   console.log(`Server is listening: ${server.address()}`);
      * });
      */
      tcpServer.set('address', () => ({ address: '::', family: 'IPv6', port: 5004 }));
    },
    // Set properties for socket which connected to server
    hookOnCreateServerSocket(tcpSocket) {
      // socket.remoteAddress
      tcpSocket.set('remoteAddress', '::ffff:127.0.0.1');
      // socket.remotePort
      tcpSocket.set('remotePort', 36816);
      // socket.address()
      tcpSocket.set('address', () => ({
        address: '::ffff:127.0.0.1',
        family: 'IPv6',
        port: 5004,
      }));
    },
    // Set properties for socket which connected to client
    hookOnCreateClientSocket(tcpSocket) {
      // socket.remoteAddress
      tcpSocket.set('remoteAddress', '127.0.0.1');
      // socket.remotePort
      tcpSocket.set('remotePort', 5004);
      // socket.address()
      tcpSocket.set('address', () => ({
        address: '127.0.0.1',
        family: 'IPv4',
        port: 45284,
      }));
    },
  });
});
```



