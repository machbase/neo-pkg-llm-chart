'use strict';

// pkg run uninstall:
//   1) 바이너리 프로세스 트리 강제 정리 (launcher + cmd.exe + neo-pkg-llm.exe)
//   2) service.stop (서비스 상태 전이)
//   3) service.uninstall (등록 해제)

var process = require('process');
var service = require('service');

var SERVICE_NAME = 'neo-pkg-llm';

// 1. 프로세스 트리 kill (정확한 PID 기반)
killLlmTree();

// 2. service.stop
console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(stopErr) {
  if (stopErr) {
    console.println('WARN stop:', stopErr.message);
  } else {
    console.println('service stopped.');
  }

  // 3. service.uninstall
  console.println('uninstalling service:', SERVICE_NAME);
  service.uninstall(SERVICE_NAME, function(err) {
    if (err) {
      console.println('WARN uninstall:', err.message);
    } else {
      console.println('service uninstalled.');
    }
    console.println('✓ done');
  });
});

// /proc/process/ 에서 neo-pkg-llm 엔트리 찾아 PGID(unix) 또는 PID(windows)로 트리 kill.
// 정확한 PID 사용 → 이름 일치 방식보다 안전 (다른 프로세스 오인 사살 없음)
// exec_path 직접 매칭 외에, shell wrapper(bin/sh -c "... exec binary ...") 경우
// args 안에 binary 경로가 포함되므로 함께 검사.
function matchesLlm(meta) {
  var re = /[\/\\]neo-pkg-llm(\.exe)?(\s|$|"|')/;
  var exe = meta.exec_path || meta.command || '';
  if (re.test(exe)) return true;
  var args = meta.args || [];
  for (var i = 0; i < args.length; i++) {
    if (re.test(String(args[i]))) return true;
  }
  return false;
}

function killLlmTree() {
  var fs = require('fs');
  var path = require('path');
  var os = require('os');
  var IS_WIN = os.platform() === 'windows';

  var procRoot = '/proc/process';
  if (!fs.existsSync(procRoot)) {
    console.println('killLlmTree: /proc/process not available, skip');
    return;
  }

  var found = null;
  var entries = fs.readdirSync(procRoot);
  for (var i = 0; i < entries.length; i++) {
    var metaPath = path.join(procRoot, entries[i], 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    try {
      var meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (matchesLlm(meta)) {
        found = { pid: meta.pid, pgid: meta.pgid > 0 ? meta.pgid : meta.pid };
        break;
      }
    } catch (e) { /* skip malformed */ }
  }

  if (!found) {
    console.println('killLlmTree: neo-pkg-llm process not found, skip');
    return;
  }
  console.println('killLlmTree: pid=' + found.pid + ' pgid=' + found.pgid);

  if (IS_WIN) {
    // graceful 트리 kill → 강제 트리 kill
    try { process.exec('@taskkill', '/T', '/PID', String(found.pid)); } catch (e) {}
    try { process.exec('@taskkill', '/F', '/T', '/PID', String(found.pid)); } catch (e) {}
  } else {
    // 음수 PID = process group 전체 (bash/sh + binary 모두 같은 PGID)
    try { process.exec('@kill', '-TERM', '-' + found.pgid); } catch (e) {}
    try { process.exec('@kill', '-KILL', '-' + found.pgid); } catch (e) {}
  }
}
