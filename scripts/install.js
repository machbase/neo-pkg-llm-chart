'use strict';

// pkg run install 호출 시:
//   바이너리 다운로드/추출 → 서비스 등록 (enable=true) → 시작.

var path = require('path');
var process = require('process');
var http = require('http');
var fs = require('fs');
var os = require('os');
var tar = require('archive/tar');
var zip = require('archive/zip');
var service = require('service');

var ROOT = path.resolve(path.dirname(process.argv[1]));   // /work/.../scripts
var PKG_DIR = path.dirname(ROOT);                          // /work/.../neo-pkg-llm-chat
var CGI_BIN = path.join(PKG_DIR, 'cgi-bin');
var LLM_DIR = path.join(CGI_BIN, 'llm');
var LAUNCHER = path.join(CGI_BIN, 'llm-launcher.js');
var SERVICE_NAME = 'neo-pkg-llm';
var REPO = 'machbase/neo-pkg-llm';
var IS_WIN = os.platform() === 'windows';
var BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';
var ARCHIVE_EXT = IS_WIN ? '.zip' : '.tar.gz';

function detectPlatform() {
  var platform = os.platform();
  var arch = os.arch();
  var osPart = platform === 'darwin' ? 'darwin'
             : platform === 'windows' ? 'windows'
             : 'linux';
  var archPart = (arch === 'arm64' || arch === 'aarch64') ? 'arm64' : 'amd64';
  return osPart + '-' + archPart;
}

function preemptiveKill() {
  try {
    if (IS_WIN) {
      process.exec('@taskkill', '/F', '/IM', BIN_NAME);
    } else {
      process.exec('@pkill', '-f', BIN_NAME);
    }
  } catch (e) {
    // 죽일 프로세스 없거나 명령 없음 — 무시
  }
}

function download(url, dest, cb) {
  var MAX = 10;
  var headers = { 'User-Agent': 'neo-pkg-llm-chat' };
  function fetch(u, remaining) {
    console.println('  fetching:', u);
    http.get(u, { headers: headers }, function(res) {
      console.println('  response status:', res.statusCode);
      if (res.statusCode >= 300 && res.statusCode < 400) {
        var loc = res.headers && res.headers.location;
        if (!loc) { cb(new Error('redirect ' + res.statusCode + ' no location')); return; }
        if (remaining <= 0) { cb(new Error('too many redirects')); return; }
        fetch(loc, remaining - 1);
        return;
      }
      if (!res.ok) { cb(new Error('HTTP ' + res.statusCode)); return; }
      var buf = res.readBodyBuffer();
      if (!buf || buf.byteLength === 0) { cb(new Error('empty download')); return; }
      console.println('  writing to:', dest, '(' + buf.byteLength + ' bytes)');
      fs.writeFileSync(dest, buf);
      cb(null);
    });
  }
  fetch(url, MAX);
}

function writeEntries(entries, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var parts = e.name.split('/');
    if (parts.length > 1) parts.shift();
    var rel = parts.join('/');
    if (!rel) continue;
    var full = path.join(destDir, rel);
    if (e.isDir) {
      fs.mkdirSync(full, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, e.data);
      if (e.mode) fs.chmod(full, e.mode & 0o777);
    }
  }
}

function extract(archivePath, destDir) {
  if (IS_WIN) {
    var buf = fs.readFileSync(archivePath, { encoding: 'buffer' });
    writeEntries(zip.unzipSync(buf), destDir);
  } else {
    var zlib = require('zlib');
    var compressed = fs.readFileSync(archivePath, { encoding: 'buffer' });
    writeEntries(tar.untarSync(zlib.gunzipSync(compressed)), destDir);
  }
}

function installService(cb) {
  console.println('installing service:', SERVICE_NAME);
  service.install({
    name: SERVICE_NAME,
    enable: true,
    working_dir: LLM_DIR,
    executable: LAUNCHER,
  }, cb);
}

function startService(cb) {
  console.println('starting service:', SERVICE_NAME);
  service.start(SERVICE_NAME, cb);
}

// ── Main ──

var platform = detectPlatform();
var assetName = 'neo-pkg-llm-' + platform + ARCHIVE_EXT;
var url = 'https://github.com/' + REPO + '/releases/latest/download/' + assetName;

console.println('platform:', platform);
console.println('downloading:', url);

preemptiveKill();

var tmp = path.join(PKG_DIR, '.llm-download' + ARCHIVE_EXT);
download(url, tmp, function(err) {
  if (err) {
    console.println('ERROR download:', err.message);
    process.exit(1);
    return;
  }

  console.println('extracting to:', LLM_DIR);
  try {
    extract(tmp, LLM_DIR);
    fs.unlinkSync(tmp);
  } catch (e) {
    console.println('ERROR extract:', e.message || String(e));
    process.exit(1);
    return;
  }

  var binPath = path.join(LLM_DIR, BIN_NAME);
  if (!fs.existsSync(binPath)) {
    console.println('ERROR: binary missing:', binPath);
    process.exit(1);
    return;
  }
  console.println('verified binary:', binPath);

  installService(function(installErr) {
    if (installErr) {
      console.println('ERROR install:', installErr.message);
      process.exit(1);
      return;
    }
    console.println('service installed.');

    startService(function(startErr) {
      if (startErr) {
        console.println('ERROR start:', startErr.message);
        process.exit(1);
        return;
      }
      console.println('service started.');
      console.println('✓ all done');
    });
  });
});
