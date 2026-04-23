'use strict';

// pkg run uninstall:
//   1) service.stop (+ 바이너리 좀비 강제 종료)
//   2) service.uninstall
// 패키지 디렉토리 제거는 패키지 매니저 책임.

var process = require('process');
var service = require('service');
var os = require('os');

var SERVICE_NAME = 'neo-pkg-llm';
var IS_WIN = os.platform() === 'windows';
var BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

function killBinary() {
  // Windows: launcher(JSH) 죽여도 손자 neo-pkg-llm.exe가 orphan으로 남음 → 강제 종료
  // Linux/macOS: process group kill되지만 안전장치
  // pkill -x: name 정확 일치 (부분일치 방지)
  try {
    if (IS_WIN) {
      process.exec('@taskkill', '/F', '/IM', BIN_NAME);
    } else {
      process.exec('@pkill', '-x', BIN_NAME);
    }
  } catch (e) {
    // 죽일 프로세스 없거나 명령 실패 — 무시
  }
}

// ── 1. service stop (+ binary 강제 종료로 확실히 port 해방) ──
console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(stopErr) {
  if (stopErr) {
    console.println('WARN stop:', stopErr.message);
  }
  // service.stop 후에도 Windows에서 binary 좀비가 남을 수 있어 항상 kill 시도
  killBinary();
  console.println('service stopped.');

  // ── 2. service uninstall ──
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
