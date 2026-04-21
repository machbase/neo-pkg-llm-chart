'use strict';

const process = require('process');
const path = require('path');
const fs = require('fs');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIG_FILE = path.join(APP_DIR, 'llm', 'configs', 'sys.json');

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

try {
  const raw = fs.readFileSync(CONFIG_FILE, { encoding: 'utf8' });
  const config = JSON.parse(raw);
  const port = config && config.server && config.server.port;
  if (!port) {
    reply({ ok: false, reason: 'server.port not found in configs/sys.json' });
  } else {
    reply({ ok: true, data: { port: String(port) } });
  }
} catch (err) {
  reply({ ok: false, reason: err.message || String(err) });
}
