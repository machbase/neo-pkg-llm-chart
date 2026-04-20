interface InfoResponse {
  ok: boolean;
  data?: { port: string };
  reason?: string;
}

let cachedPort: Promise<string> | null = null;

const pkgBasePath = (): string => {
  const pathname = window.location.pathname;
  const trimmed = pathname.replace(/\/[^/]*$/, '/');
  return trimmed === '' ? '/' : trimmed;
};

export const getLlmPort = (): Promise<string> => {
  if (cachedPort) return cachedPort;
  const url = `${pkgBasePath()}cgi-bin/info.js`;
  cachedPort = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`info.js HTTP ${res.status}`);
      return res.json() as Promise<InfoResponse>;
    })
    .then((body) => {
      if (!body.ok || !body.data?.port) {
        throw new Error(body.reason || 'info.js returned no port');
      }
      return body.data.port;
    })
    .catch((err) => {
      cachedPort = null;
      throw err;
    });
  return cachedPort;
};

export const getApiBase = async (): Promise<string> => {
  const port = await getLlmPort();
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
};

export const getWsBase = async (): Promise<string> => {
  const port = await getLlmPort();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:${port}`;
};
