'use strict';

// /cgi-bin/api/config
//   GET → 현재 cgi-bin/config.json 반환
//   PUT → port 수정 (body: { server: { port: "..." } })

const path = require('path');
const process = require('process');
const fs = require('fs');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIG_FILE = path.join(APP_DIR, 'config.json');
const DEFAULT = { server: { port: '8884' } };

const _tick = Date.now();

function reply(status, data, reason) {
  const elapse = (Date.now() - _tick) + 'ms';
  const success = status >= 200 && status < 300;
  const body = JSON.stringify({
    success,
    reason: reason || (success ? 'success' : 'error'),
    elapse,
    data: data !== undefined ? data : null,
  });
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('Status: ' + status + '\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

function parseBody() {
  const raw = process.stdin.read();
  if (!raw) return null;
  return JSON.parse(raw);
}

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return JSON.parse(JSON.stringify(DEFAULT));
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, { encoding: 'utf8' }));
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT));
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();

if (method === 'GET') {
  reply(200, readConfig());
} else if (method === 'PUT' || method === 'POST') {
  let body = null;
  let parseErr = null;
  try {
    body = parseBody();
  } catch (err) {
    parseErr = err;
  }
  if (parseErr) {
    reply(400, null, 'invalid JSON: ' + (parseErr.message || String(parseErr)));
  } else if (!body) {
    reply(400, null, 'request body required');
  } else {
    try {
      const existing = readConfig();
      if (body.server && body.server.port) {
        existing.server = existing.server || {};
        existing.server.port = String(body.server.port);
      }
      saveConfig(existing);
      reply(200, existing);
    } catch (err) {
      reply(500, null, 'failed to save: ' + (err.message || String(err)));
    }
  }
} else {
  reply(405, null, 'method not allowed');
}
