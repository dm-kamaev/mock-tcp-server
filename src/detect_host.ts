export default function detectHost(inputHost: string | undefined) {
  const defaultHost = '127.0.0.1';
  if (!inputHost) {
    return defaultHost;
  }

  const host = inputHost.trim();
  if (host === 'localhost' || host === '127.0.0.1') {
    return defaultHost;
  }

  return inputHost;
}
