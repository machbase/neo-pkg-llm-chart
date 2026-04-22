'use strict';

// cgi-bin/config.json의 server.port를 반환. 파일 없거나 에러면 기본 8884.

const path = require('path');
const process = require('process');
const fs = require('fs');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIG_FILE = path.join(APP_DIR, 'config.json');

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

let port = '8884';
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, { encoding: 'utf8' }));
    if (cfg && cfg.server && cfg.server.port) {
      port = String(cfg.server.port);
    }
  }
} catch (e) {
  // fall through to default
}

reply({ ok: true, data: { port } });
