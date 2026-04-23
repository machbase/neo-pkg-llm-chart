'use strict';

// pkg run stop — 패키지 관리 서비스 중지 + 바이너리 트리 정리.

var process = require('process');
var service = require('service');

var SERVICE_NAME = 'neo-pkg-llm';

// 1. 프로세스 트리 먼저 정리
killLlmTree();

// 2. service.stop으로 레지스트리 상태 stopped 전이
console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(err) {
  if (err) {
    console.println('WARN:', err.message);
  } else {
    console.println('service stopped.');
  }
});

function killLlmTree() {
  var fs = require('fs');
  var path = require('path');
  var os = require('os');
  var IS_WIN = os.platform() === 'windows';

  var procRoot = '/proc/process';
  if (!fs.existsSync(procRoot)) return;

  var found = null;
  var entries = fs.readdirSync(procRoot);
  for (var i = 0; i < entries.length; i++) {
    var metaPath = path.join(procRoot, entries[i], 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      var meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      var exe = meta.exec_path || meta.command || '';
      if (/[\/\\]neo-pkg-llm(\.exe)?$/.test(exe)) {
        found = { pid: meta.pid, pgid: meta.pgid > 0 ? meta.pgid : meta.pid };
        break;
      }
    } catch (e) {}
  }

  if (!found) return;
  console.println('killLlmTree: pid=' + found.pid + ' pgid=' + found.pgid);

  if (IS_WIN) {
    try { process.exec('@taskkill', '/T', '/PID', String(found.pid)); } catch (e) {}
    try { process.exec('@taskkill', '/F', '/T', '/PID', String(found.pid)); } catch (e) {}
  } else {
    try { process.exec('@kill', '-TERM', '-' + found.pgid); } catch (e) {}
    try { process.exec('@kill', '-KILL', '-' + found.pgid); } catch (e) {}
  }
}
