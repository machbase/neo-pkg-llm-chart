'use strict';

const path = require('path');
const process = require('process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const tar = require('archive/tar');
const zip = require('archive/zip');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const ROOT = path.resolve(path.dirname(ARGV1));
const LLM_DIR = path.join(APP_DIR, 'llm');
const REPO = 'machbase/neo-pkg-llm';

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

function writeEntries(entries, destDir) {
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

function extractTarGz(tarPath, destDir) {
  const zlib = require('zlib');
  const compressed = fs.readFileSync(tarPath, { encoding: 'buffer' });
  const decompressed = zlib.gunzipSync(compressed);
  const entries = tar.untarSync(decompressed);
  writeEntries(entries, destDir);
}

function extractZip(zipPath, destDir) {
  const buffer = fs.readFileSync(zipPath, { encoding: 'buffer' });
  const entries = zip.unzipSync(buffer);
  writeEntries(entries, destDir);
}

// ── main ──

const IS_WIN = os.platform() === 'windows';
const platform = detectPlatform();
const ext = IS_WIN ? '.zip' : '.tar.gz';
const assetName = `neo-pkg-llm-${platform}${ext}`;
// GitHub /releases/latest/download/ 는 최신 릴리스 asset으로 자동 리다이렉트 (API rate limit 없음)
const url = `https://github.com/${REPO}/releases/latest/download/${assetName}`;

log('platform:', platform);
log('downloading:', url);

const tmpFile = path.join(ROOT, '.llm-download' + ext);
download(url, tmpFile, (err) => {
  if (err) {
    reply({ ok: false, reason: err.message || String(err), log: logs });
    return;
  }

  log('extracting to:', LLM_DIR);
  try {
    if (IS_WIN) {
      extractZip(tmpFile, LLM_DIR);
    } else {
      extractTarGz(tmpFile, LLM_DIR);
    }
    fs.unlinkSync(tmpFile);
  } catch (exErr) {
    reply({ ok: false, reason: exErr.message || String(exErr), log: logs });
    return;
  }

  // 추출 직후 바이너리 존재 검증 (install/start 체인으로 진행하기 전 fail-fast)
  const binName = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';
  const binPath = path.join(LLM_DIR, binName);
  if (!fs.existsSync(binPath)) {
    log('ERROR: binary missing after extract:', binPath);
    reply({ ok: false, reason: 'binary missing after extract: ' + binPath, log: logs });
    process.exit(1);
    return;
  }
  log('verified binary:', binPath);

  log('done. llm installed at', LLM_DIR);
  reply({ ok: true, data: { path: LLM_DIR, binary: binPath, log: logs } });
});
