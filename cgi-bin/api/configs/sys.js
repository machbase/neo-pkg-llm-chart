'use strict';

// /cgi-bin/api/configs/sys
//   GET → 바이너리로 proxy
//   PUT → 바이너리 up: proxy (save + Instance 재시작)
//         바이너리 down: 직접 파일 저장 (마스킹된 시크릿은 기존값 복원)

const path = require('path');
const process = require('process');
const fs = require('fs');
const http = require('http');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIGS_DIR = path.join(APP_DIR, 'llm', 'configs');
const USER_NAME = 'sys';
const CONFIG_FILE = path.join(CONFIGS_DIR, USER_NAME + '.json');
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

// --- masking helpers (fallback 용) ---

function maskSecret(s) {
  if (!s) return '';
  if (s.length <= 8) return '********';
  return s.substring(0, 4) + '********' + s.substring(s.length - 4);
}

function isMasked(s) {
  return typeof s === 'string' && s.indexOf('********') !== -1;
}

function restoreSecrets(incoming, existing) {
  if (!existing) return incoming;
  if (incoming.machbase && isMasked(incoming.machbase.password) && existing.machbase) {
    incoming.machbase.password = existing.machbase.password;
  }
  if (incoming.claude && isMasked(incoming.claude.api_key) && existing.claude) {
    incoming.claude.api_key = existing.claude.api_key;
  }
  if (incoming.chatgpt && isMasked(incoming.chatgpt.api_key) && existing.chatgpt) {
    incoming.chatgpt.api_key = existing.chatgpt.api_key;
  }
  if (incoming.gemini && isMasked(incoming.gemini.api_key) && existing.gemini) {
    incoming.gemini.api_key = existing.gemini.api_key;
  }
  return incoming;
}

function readExistingConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, { encoding: 'utf8' }));
  } catch (e) {
    return null;
  }
}

// --- proxy + fallback ---

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

function saveFallbackPut(raw) {
  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    replyError(400, 'invalid JSON: ' + (e.message || String(e)));
    return;
  }
  try {
    const existing = readExistingConfig();
    restoreSecrets(body, existing);
    if (!fs.existsSync(CONFIGS_DIR)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(body, null, 2));
    replyJSON(200, {
      success: true,
      reason: 'saved to file (binary not running, will load on next start)',
      elapse: (Date.now() - _tick) + 'ms',
      data: { name: USER_NAME },
    });
  } catch (err) {
    replyError(500, 'failed to save: ' + (err.message || String(err)));
  }
}

// --- dispatch ---

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();
const endpoint = '/api/configs/' + USER_NAME;

if (method === 'GET') {
  proxyOrFallback('GET', endpoint, null, null);
} else if (method === 'PUT') {
  const raw = process.stdin.read();
  if (!raw) {
    replyError(400, 'request body required');
  } else {
    proxyOrFallback('PUT', endpoint, raw, function () {
      saveFallbackPut(raw);
    });
  }
} else {
  replyError(405, 'method not allowed');
}
