import net from 'node:net';
import { enableMock, disableMock, getTcpServers } from '../src';

async function createServer(logs: string[], socketPath?: string, serverOptions?: net.ListenOptions) {
  return new Promise<net.Server>((resolve) => {
    // Create a net server
    const server = net.createServer((socket) => {
      // Handle incoming connections
      logs.push('Client connected');

      // Handle incoming data from the client
      socket.on('data', (data) => {
        logs.push(
          'Server socket ' +
            JSON.stringify({
              remoteAddress: socket.remoteAddress,
              remotePort: socket.remotePort,
            }),
          // socket.address(),
        );
        logs.push(`[Server]: Received data from client: ${data}`);
        socket.write('OK');
        // socket.write('PONG');

        // socket.end();
        // server.close();
      });

      // Handle client disconnection
      socket.on('end', () => {
        logs.push('[Server]: Client disconnected');
      });
    });

    server.on('connection', (socket) => {
      logs.push(
        '[Server]: Accept new connection ' +
          // socket.address(),
          socket.remoteAddress +
          ' ' +
          socket.remotePort,
      );
    });

    server.on('close', () => {
      logs.push('[Server]: Server closed');
    });

    // Listen on the Unix socket
    if (socketPath) {
      server.listen('/tmp/server_socket', () => {
        // /tmp/server_socket
        // console.log('Socket Address =>', server.address());
        logs.push(`Server is listening on port: ${socketPath}`);
        resolve(server);
      });
    } else if (serverOptions) {
      server.listen(serverOptions, () => {
        const address = server.address();
        const port = typeof address === 'string' ? address : address?.port;
        logs.push(`Server is listening on port: ${port}`);
        resolve(server);
      });
    } else {
      const PORT = 5004;
      server.listen(PORT, () => {
        // { address: '::', family: 'IPv6', port: 5004 }
        // console.log('Address =>', server.address());
        logs.push(`Server is listening on port: ${PORT}`);
        resolve(server);
      });
    }
  });
}

describe('[MockTcpServer]', () => {
  const logs: string[] = [];

  beforeAll(() => {
    enableMock({
      hookOnCreateServer(tcpServer) {
        tcpServer.set('address', () => ({ address: '::', family: 'IPv6', port: 5004 }));
      },
      hookOnCreateServerSocket(tcpSocket) {
        tcpSocket.set('remoteAddress', '::ffff:127.0.0.1');
        tcpSocket.set('remotePort', 36816);
        tcpSocket.set('address', () => ({
          address: '::ffff:127.0.0.1',
          family: 'IPv6',
          port: 5004,
        }));
      },
      hookOnCreateClientSocket(tcpSocket) {
        tcpSocket.set('remoteAddress', '127.0.0.1');
        tcpSocket.set('remotePort', 5004);
        tcpSocket.set('address', () => ({
          address: '127.0.0.1',
          family: 'IPv4',
          port: 45284,
        }));
      },
    });
  });

  afterAll(() => {
    getTcpServers().closeAll();
    disableMock();
  });

  afterEach(() => {
    logs.length = 0;
  });

  it('[createConnection]: to localhost:port (as parameter) and pass callback', async () => {
    const server = await createServer(logs);

    const client = net.createConnection(5004, 'localhost', () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
        // client.destroy();
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

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[createConnection]: to localhost:port (as object) and pass callback', async () => {
    const server = await createServer(logs);

    const client = net.createConnection({ port: 5004, host: 'localhost' }, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
        // client.destroy();
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

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[createConnection]: to socket and pass callback', async () => {
    const socketPath = '/tmp/server_socket';
    const server = await createServer(logs, socketPath);

    const client = net.createConnection(socketPath, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
        // client.destroy();
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

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      `Server is listening on port: ${socketPath}`,
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[createConnection]: to socket and pass callback. server.listen(object)', async () => {
    const socketPath = '/tmp/server_socket';
    const server = await createServer(logs, undefined, { path: socketPath });

    const client = net.createConnection(socketPath, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
        // client.destroy();
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

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      `Server is listening on port: ${socketPath}`,
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[createConnection]: to localhost:port and pass callback. server.listen(object)', async () => {
    const server = await createServer(logs, undefined, { host: 'localhost', port: 5004 });

    const client = net.createConnection({ port: 5004 }, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.end();
        // client.destroy();
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

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[manual connect]: to localhost:port (as object) and pass callback', async () => {
    const server = await createServer(logs);

    const client = new net.Socket();
    client.connect({ port: 5004, host: 'localhost' }, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        client.destroy();
      });

      client.on('close', () => {
        logs.push('[Client]: Client was closed');
        resolve();
      });

      // Handle client disconnection
      client.on('end', () => {
        logs.push('[Client]: Disconnected from server');
      });

      client.on('error', (error) => {
        console.log(error);
      });
    });

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[manual connect]: to localhost:port (as parameters) and pass callback', async () => {
    const server = await createServer(logs);

    const client = new net.Socket();
    client.connect(5004, 'localhost', () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
        // Send data to the server
        const data = 'Hello, server!';
        client.write(data);
      });

      // Handle incoming data from the server
      client.on('data', (data) => {
        logs.push(`[Client]: Received data from server: ${data}`);
        // client.end();
        client.destroy();
      });

      client.on('close', () => {
        logs.push('[Client]: Client was closed');
        resolve();
      });

      // Handle client disconnection
      client.on('end', () => {
        logs.push('[Client]: Disconnected from server');
      });

      client.on('error', (error) => {
        console.log(error);
      });
    });

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      'Server is listening on port: 5004',
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });

  it('[manual connect]: to socket and pass callback', async () => {
    const socketPath = '/tmp/server_socket';
    const server = await createServer(logs, socketPath);

    const client = new net.Socket();
    client.connect(socketPath, () => {
      logs.push('[Client]: Call connectionListener');
    });

    await new Promise<void>((resolve) => {
      // Handle connection to the server
      client.on('connect', () => {
        logs.push('[Client]: Connected to server');
        logs.push(
          'Client socket ' +
            JSON.stringify({
              remoteAddress: client.remoteAddress,
              remotePort: client.remotePort,
            }),
          // client.address(),
        );
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

      client.on('error', (error) => {
        console.log(error);
      });
    });

    server.close((err) => logs.push('Server was closed! ' + err));

    expect(logs).toEqual([
      `Server is listening on port: ${socketPath}`,
      '[Client]: Call connectionListener',
      '[Client]: Connected to server',
      'Client socket {"remoteAddress":"127.0.0.1","remotePort":5004}',
      'Client connected',
      '[Server]: Accept new connection ::ffff:127.0.0.1 36816',
      'Server socket {"remoteAddress":"::ffff:127.0.0.1","remotePort":36816}',
      '[Server]: Received data from client: Hello, server!',
      '[Client]: Received data from server: OK',
      '[Server]: Client disconnected',
      '[Client]: Disconnected from server',
      '[Client]: Client was closed',
      '[Server]: Server closed',
      'Server was closed! undefined',
    ]);
  });
});
