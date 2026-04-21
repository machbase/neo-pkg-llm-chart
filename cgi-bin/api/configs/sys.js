'use strict';

// /cgi-bin/api/configs/sys  — 바이너리 /api/configs/sys 로의 thin proxy
//   GET → { config, running }      (바이너리가 마스킹 처리)
//   PUT → save + restart instance   (바이너리가 처리)

const path = require('path');
const process = require('process');
const fs = require('fs');
const http = require('http');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const USER_NAME = 'sys';
const BOOTSTRAP_CONFIG = path.join(APP_DIR, 'llm', 'configs', USER_NAME + '.json');

const _tick = Date.now();

function replyError(status, reason) {
  const elapse = (Date.now() - _tick) + 'ms';
  const body = JSON.stringify({
    success: false,
    reason: reason,
    elapse: elapse,
    data: null,
  });
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('Status: ' + status + '\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

function forwardResponse(statusCode, body) {
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('Status: ' + statusCode + '\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body || '');
}

function getBinaryPort() {
  try {
    if (fs.existsSync(BOOTSTRAP_CONFIG)) {
      const raw = fs.readFileSync(BOOTSTRAP_CONFIG, { encoding: 'utf8' });
      const cfg = JSON.parse(raw);
      return (cfg && cfg.server && cfg.server.port) || '8884';
    }
  } catch (e) {
    // ignore
  }
  return '8884';
}

function proxy(method, endpoint, bodyStr) {
  const port = getBinaryPort();
  const url = 'http://127.0.0.1:' + port + endpoint;
  let handled = false;

  try {
    const req = http.request(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    });

    req.on('response', function (response) {
      if (handled) return;
      handled = true;
      const text = response.text ? response.text() : '';
      forwardResponse(response.statusCode, text);
    });

    req.on('error', function (err) {
      if (handled) return;
      handled = true;
      replyError(503, 'binary not running (' + (err && err.message ? err.message : 'connection failed') + ')');
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  } catch (e) {
    if (handled) return;
    handled = true;
    replyError(503, 'binary not running: ' + (e.message || String(e)));
  }
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();
const endpoint = '/api/configs/' + USER_NAME;

if (method === 'GET') {
  proxy('GET', endpoint, null);
} else if (method === 'PUT') {
  const raw = process.stdin.read();
  if (!raw) {
    replyError(400, 'request body required');
  } else {
    proxy('PUT', endpoint, raw);
  }
} else {
  replyError(405, 'method not allowed');
}
