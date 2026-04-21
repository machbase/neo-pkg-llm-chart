'use strict';

// /cgi-bin/api/configs
//   GET  → 바이너리로 proxy (목록)
//   POST → 바이너리 up: proxy (save + Instance 시작)
//          바이너리 down: 직접 파일 저장 (부트스트랩)

const path = require('path');
const process = require('process');
const fs = require('fs');
const http = require('http');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIGS_DIR = path.join(APP_DIR, 'llm', 'configs');
const BINARY_PORT = '8884';

const _tick = Date.now();

function replyJSON(status, payload) {
  const body = JSON.stringify(payload);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('Status: ' + status + '\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

function replyError(status, reason) {
  replyJSON(status, {
    success: false,
    reason: reason,
    elapse: (Date.now() - _tick) + 'ms',
    data: null,
  });
}

function forwardResponse(statusCode, body) {
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('Status: ' + statusCode + '\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body || '');
}

function proxyOrFallback(method, endpoint, bodyStr, onFallback) {
  const url = 'http://127.0.0.1:' + BINARY_PORT + endpoint;
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

    req.on('error', function () {
      if (handled) return;
      handled = true;
      if (onFallback) onFallback();
      else replyError(503, 'binary not running');
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  } catch (e) {
    if (handled) return;
    handled = true;
    if (onFallback) onFallback();
    else replyError(503, 'binary not running: ' + (e.message || String(e)));
  }
}

function saveFileDirectly(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    replyError(400, 'invalid JSON: ' + (e.message || String(e)));
    return;
  }
  if (!body.machbase || !body.machbase.user) {
    replyError(400, 'machbase.user is required');
    return;
  }
  const name = body.machbase.user;
  if (name.indexOf('/') !== -1 || name.indexOf('\\') !== -1 || name.indexOf('..') !== -1) {
    replyError(400, 'machbase.user contains invalid characters');
    return;
  }
  try {
    if (!fs.existsSync(CONFIGS_DIR)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
    }
    const filePath = path.join(CONFIGS_DIR, name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2));
    replyJSON(200, {
      success: true,
      reason: 'saved to file (binary not running, will load on next start)',
      elapse: (Date.now() - _tick) + 'ms',
      data: { name: name },
    });
  } catch (err) {
    replyError(500, 'failed to save: ' + (err.message || String(err)));
  }
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();

if (method === 'GET') {
  // 바이너리 down 시 frontend가 [] 로 받아들여 settings 탭으로 분기됨
  proxyOrFallback('GET', '/api/configs', null, null);
} else if (method === 'POST') {
  const raw = process.stdin.read();
  if (!raw) {
    replyError(400, 'request body required');
  } else {
    proxyOrFallback('POST', '/api/configs', raw, function () {
      saveFileDirectly(raw);
    });
  }
} else {
  replyError(405, 'method not allowed');
}
