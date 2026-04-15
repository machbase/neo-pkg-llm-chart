'use strict';

const path = require('path');
const process = require('process');
const http = require('http');
const fs = require('fs');
const os = require('os');
const tar = require('archive/tar');

const ROOT = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(ROOT, 'llm');
const REPO = 'machbase/neo-pkg-llm';

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

function getLatestRelease(callback) {
  const url = `https://api.github.com/repos/${REPO}/releases/latest`;
  http.get(url, { headers: { 'User-Agent': 'neo-pkg-llm-chat' } }, (res) => {
    if (!res.ok) {
      callback(new Error('HTTP ' + res.statusCode + ': ' + res.text()));
      return;
    }
    const data = res.json();
    if (!data || !data.assets) {
      callback(new Error('no assets in release response'));
      return;
    }
    callback(null, data);
  });
}

function findAsset(release, platform) {
  const pattern = `neo-pkg-llm-${platform}.tar.gz`;
  for (const asset of release.assets) {
    if (asset.name === pattern) {
      return asset;
    }
  }
  return null;
}

function downloadAsset(asset, destPath, callback) {
  const MAX_REDIRECTS = 5;
  const headers = { 'User-Agent': 'neo-pkg-llm-chat' };

  function fetch(url, remaining) {
    http.get(url, { headers }, (res) => {
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
        console.println('redirect →', location);
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

  fetch(asset.browser_download_url, MAX_REDIRECTS);
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
console.println('platform:', platform);

console.println('fetching latest release...');
getLatestRelease((err, release) => {
  if (err) {
    console.println('ERROR:', err.message);
    process.exit(1);
  }

  console.println('release:', release.tag_name);

  const asset = findAsset(release, platform);
  if (!asset) {
    console.println('ERROR: no asset found for', platform);
    process.exit(1);
  }

  console.println('downloading:', asset.name);
  const tmpFile = path.join(ROOT, '.llm-download.tar.gz');
  downloadAsset(asset, tmpFile, (dlErr) => {
    if (dlErr) {
      console.println('ERROR:', dlErr.message);
      process.exit(1);
    }

    console.println('extracting to:', LLM_DIR);
    try {
      extractTarGz(tmpFile, LLM_DIR);
      fs.unlinkSync(tmpFile);
    } catch (exErr) {
      console.println('ERROR:', exErr.message);
      process.exit(1);
    }

    console.println('done. llm installed at', LLM_DIR);
  });
});
