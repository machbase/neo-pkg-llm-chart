'use strict';

const path = require('path');
const process = require('process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const tar = require('archive/tar');

const ROOT = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(ROOT, 'llm');
const CONFIGS_DIR = path.join(LLM_DIR, 'configs');
const SYS_CONFIG = path.join(CONFIGS_DIR, 'sys.json');
const REPO = 'machbase/neo-pkg-llm';

const DEFAULT_CONFIG = {
  server: {
    port: '8884',
  },
  machbase: {
    host: '127.0.0.1',
    port: '5654',
    user: 'sys',
    password: 'manager',
  },
  claude: {
    api_key: '',
    models: [
      { name: 'sonnet', model_id: 'claude-sonnet-4-20250514' },
      { name: 'haiku', model_id: 'claude-haiku-4-5-20251001' },
    ],
  },
  chatgpt: {
    api_key: '',
    models: [
      { name: 'gpt-4o', model_id: '' },
      { name: 'gpt-4o-mini', model_id: '' },
    ],
  },
  gemini: {
    api_key: '',
    models: [
      { name: 'gemini-2.5-flash', model_id: 'gemini-2.5-flash-preview-04-17' },
    ],
  },
  ollama: {
    base_url: '',
    models: [
      { name: 'qwen3:8b', model_id: '' },
    ],
  },
};

const logs = [];
function log() {
  const parts = [];
  for (let i = 0; i < arguments.length; i++) {
    const a = arguments[i];
    parts.push(typeof a === 'string' ? a : JSON.stringify(a));
  }
  logs.push(parts.join(' '));
}

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

function detectPlatform() {
  const platform = os.platform();
  const arch = os.arch();

  let osPart;
  if (platform === 'darwin') osPart = 'darwin';
  else if (platform === 'windows') osPart = 'windows';
  else osPart = 'linux';

  let archPart;
  if (arch === 'aarch64' || arch === 'arm64') archPart = 'arm64';
  else archPart = 'amd64';

  return `${osPart}-${archPart}`;
}

function download(url, destPath, callback) {
  const MAX_REDIRECTS = 10;
  const headers = { 'User-Agent': 'neo-pkg-llm-chat' };

  function fetch(fetchUrl, remaining) {
    http.get(fetchUrl, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400) {
        const location = res.headers && res.headers.location;
        if (!location) {
          callback(new Error('redirect ' + res.statusCode + ' without location'));
          return;
        }
        if (remaining <= 0) {
          callback(new Error('too many redirects'));
          return;
        }
        fetch(location, remaining - 1);
        return;
      }
      if (!res.ok) {
        callback(new Error('HTTP ' + res.statusCode));
        return;
      }
      const buffer = res.readBodyBuffer();
      if (!buffer || buffer.byteLength === 0) {
        callback(new Error('empty download'));
        return;
      }
      fs.writeFileSync(destPath, buffer);
      callback(null);
    });
  }

  fetch(url, MAX_REDIRECTS);
}

function extractTarGz(tarPath, destDir) {
  const zlib = require('zlib');
  const compressed = fs.readFileSync(tarPath, { encoding: 'buffer' });
  const decompressed = zlib.gunzipSync(compressed);
  const entries = tar.untarSync(decompressed);

  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of entries) {
    const parts = entry.name.split('/');
    if (parts.length > 1) {
      parts.shift();
    }
    const relativePath = parts.join('/');
    if (!relativePath) continue;

    const fullPath = path.join(destDir, relativePath);
    if (entry.isDir) {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, entry.data);
      if (entry.mode) {
        fs.chmod(fullPath, entry.mode & 0o777);
      }
    }
  }
}

// ── main ──

const platform = detectPlatform();
const assetName = `neo-pkg-llm-${platform}.tar.gz`;
// GitHub /releases/latest/download/ 는 최신 릴리스 asset으로 자동 리다이렉트 (API rate limit 없음)
const url = `https://github.com/${REPO}/releases/latest/download/${assetName}`;

log('platform:', platform);
log('downloading:', url);

const tmpFile = path.join(ROOT, '.llm-download.tar.gz');
download(url, tmpFile, (err) => {
  if (err) {
    reply({ ok: false, reason: err.message || String(err), log: logs });
    return;
  }

  log('extracting to:', LLM_DIR);
  try {
    extractTarGz(tmpFile, LLM_DIR);
    fs.unlinkSync(tmpFile);
  } catch (exErr) {
    reply({ ok: false, reason: exErr.message || String(exErr), log: logs });
    return;
  }

  log('done. llm installed at', LLM_DIR);

  // 기본 config 씨앗 생성 (이미 있으면 유지 — 사용자가 입력한 API 키 보존)
  try {
    if (!fs.existsSync(SYS_CONFIG)) {
      fs.mkdirSync(CONFIGS_DIR, { recursive: true });
      fs.writeFileSync(SYS_CONFIG, JSON.stringify(DEFAULT_CONFIG, null, 2));
      log('created default config:', SYS_CONFIG);
    } else {
      log('config already exists, skipped:', SYS_CONFIG);
    }
  } catch (cfgErr) {
    reply({ ok: false, reason: cfgErr.message || String(cfgErr), log: logs });
    return;
  }

  reply({ ok: true, data: { path: LLM_DIR, config: SYS_CONFIG, log: logs } });
});
