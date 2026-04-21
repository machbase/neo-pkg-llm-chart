'use strict';

// /cgi-bin/api/configs/sys
//   GET → { config, running } (비밀번호/API 키 마스킹)
//   PUT → { name }            (마스킹된 시크릿은 기존값 복원)

const path = require('path');
const process = require('process');
const fs = require('fs');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const CONFIGS_DIR = path.join(APP_DIR, 'llm', 'configs');
const USER_NAME = 'sys';
const CONFIG_FILE = path.join(CONFIGS_DIR, USER_NAME + '.json');

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

// --- secret masking ---

function maskSecret(s) {
  if (!s) return '';
  if (s.length <= 8) return '********';
  return s.substring(0, 4) + '********' + s.substring(s.length - 4);
}

function maskedCopy(cfg) {
  const copy = JSON.parse(JSON.stringify(cfg));
  if (copy.machbase && copy.machbase.password) {
    copy.machbase.password = maskSecret(copy.machbase.password);
  }
  if (copy.claude && copy.claude.api_key) {
    copy.claude.api_key = maskSecret(copy.claude.api_key);
  }
  if (copy.chatgpt && copy.chatgpt.api_key) {
    copy.chatgpt.api_key = maskSecret(copy.chatgpt.api_key);
  }
  if (copy.gemini && copy.gemini.api_key) {
    copy.gemini.api_key = maskSecret(copy.gemini.api_key);
  }
  return copy;
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

// --- file IO ---

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return null;
  const raw = fs.readFileSync(CONFIG_FILE, { encoding: 'utf8' });
  return JSON.parse(raw);
}

function saveConfig(cfg) {
  if (!fs.existsSync(CONFIGS_DIR)) {
    fs.mkdirSync(CONFIGS_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// --- dispatch ---

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();

if (method === 'GET') {
  const cfg = readConfig();
  if (!cfg) {
    reply(404, null, 'not found');
  } else {
    reply(200, { config: maskedCopy(cfg), running: null });
  }
} else if (method === 'PUT') {
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
    const existing = readConfig();
    restoreSecrets(body, existing);
    try {
      saveConfig(body);
      reply(200, { name: USER_NAME });
    } catch (err) {
      reply(500, null, 'failed to save: ' + (err.message || String(err)));
    }
  }
} else {
  reply(405, null, 'method not allowed');
}
