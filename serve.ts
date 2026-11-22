// serve.ts — a tiny static server for playing the game on your own machine.
// Run `node serve.ts` (or PORT=8091 node serve.ts) and open the printed URL.
// It serves game/ only and never touches the network beyond localhost.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), 'game');
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};
const port = Number(process.env.PORT || 8091);

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = join(root, path);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, () => console.log(`The Gilded Hour at http://localhost:${port}/`));
