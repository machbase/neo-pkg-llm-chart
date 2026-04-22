'use strict';

// pkg run uninstall 호출 시:
//   서비스 중지 → 좀비 프로세스 강제 종료 → 서비스 등록 해제.
// 패키지 디렉토리 자체 제거는 패키지 매니저 책임.

var process = require('process');
var service = require('service');
var os = require('os');

var SERVICE_NAME = 'neo-pkg-llm';
var IS_WIN = os.platform() === 'windows';
var BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(stopErr) {
  if (stopErr) {
    console.println('WARN stop:', stopErr.message);
  } else {
    console.println('service stopped.');
  }

  // Windows에서는 launcher 자식 프로세스가 orphan으로 남을 수 있음 → 강제 종료
  // pkill -x: 프로세스 name 정확히 일치 (부분일치로 자기 자신 죽이는 문제 회피)
  try {
    if (IS_WIN) {
      process.exec('@taskkill', '/F', '/IM', BIN_NAME);
    } else {
      process.exec('@pkill', '-x', BIN_NAME);
    }
  } catch (e) {
    // 무시 — 죽일 프로세스 없거나 명령 실패
  }

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
