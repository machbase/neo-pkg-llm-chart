'use strict';

// /cgi-bin/api/configs
//   GET  → list configs: { configs: [{ name }] }
//   POST → save new config (filename = machbase.user)

const path = require('path');
const process = require('process');
const fs = require('fs');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIGS_DIR = path.join(APP_DIR, 'llm', 'configs');

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

function listConfigs() {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs.readdirSync(CONFIGS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({ name: name.slice(0, -5) }));
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();

if (method === 'GET') {
  reply(200, { configs: listConfigs() });
} else if (method === 'POST') {
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
  } else if (!body.machbase || !body.machbase.user) {
    reply(400, null, 'machbase.user is required');
  } else {
    const name = body.machbase.user;
    if (name.indexOf('/') !== -1 || name.indexOf('\\') !== -1 || name.indexOf('..') !== -1) {
      reply(400, null, 'machbase.user contains invalid characters');
    } else {
      try {
        if (!fs.existsSync(CONFIGS_DIR)) {
          fs.mkdirSync(CONFIGS_DIR, { recursive: true });
        }
        const filePath = path.join(CONFIGS_DIR, name + '.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
        reply(200, { name: name, path: filePath });
      } catch (err) {
        reply(500, null, 'failed to save: ' + (err.message || String(err)));
      }
    }
  }
} else {
  reply(405, null, 'method not allowed');
}
