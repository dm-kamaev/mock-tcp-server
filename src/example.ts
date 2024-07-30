import { enableMock, disableMock } from '.';
import net from 'node:net';
import path from 'node:path';

enableMock({
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
// eslint-disable-next-line no-use-before-define
run();
disableMock();

function run() {
  // Create a net server
  const server = net.createServer((socket) => {
    // Handle incoming connections
    console.log('Client connected');

    // Handle incoming data from the client
    socket.on('data', (data) => {
      console.log(
        'Server socket ',
        {
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
        },
        // socket.address(),
      );
      console.log(`[Server]: Received data from client: ${data}`);
      socket.write('OK');
      // socket.write('PONG');

      // socket.end();
      // server.close();
    });

    // Handle client disconnection
    socket.on('end', () => {
      console.log('[Server]: Client disconnected');
    });
  });

  server.on('connection', (socket) => {
    console.log(
      '[Server]: Accept new connection',
      // socket.address(),
      socket.remoteAddress,
      socket.remotePort,
    );
  });

  server.on('close', () => {
    console.log('[Server]: Server closed');
  });

  // setTimeout(() => {
  //   server.close();
  // }, 2000);

  // Define the path for the Unix socket
  const socketPath = path.join(__dirname, 'mysocket');

  // Listen on the Unix socket
  // server.listen(socketPath, () => {
  server.listen(5004, () => {
    console.log(`Server is listening on Unix socket: ${socketPath}`);
    // console.log('Address=>', server.address());
    // eslint-disable-next-line no-use-before-define
    startClient(socketPath);
  });

  setTimeout(() => {
    server.close((err) => console.log('Server was closed!', err));
  }, 1000);
  // server.emit('connection', { data: 'sdfdsf'})

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function startClient(socketPath: string) {
    // Create a net client to socket
    // const client = net.createConnection(socketPath, () => {
    //   console.log('[Client]: Call connectionListener');
    // });
    const client = net.createConnection(5004, 'localhost', () => {
      console.log('[Client]: Call connectionListener');
    });

    // Handle connection to the server
    client.on('connect', () => {
      console.log('[Client]: Connected to server');
      console.log(
        'Client socket ',
        {
          remoteAddress: client.remoteAddress,
          remotePort: client.remotePort,
        },
        // client.address(),
      );
      // Send data to the server
      const data = 'Hello, server!';
      client.write(data);
    });

    // Handle incoming data from the server
    client.on('data', (data) => {
      console.log(`[Client]: Received data from server: ${data}`);
      // client.write('PING');
      client.end();
      // client.destroy();
    });

    client.on('close', () => {
      console.log('[Client]: Client was closed');
    });

    // Handle client disconnection
    client.on('end', () => {
      console.log('[Client]: Disconnected from server');
    });

    // setTimeout(() => {
    //   client.end();
    //   console.log('[Client]: Client was closed!');
    // }, 2000);
  }
}
