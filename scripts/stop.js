'use strict';

// pkg run stop — 패키지 관리 서비스 중지 + 좀비 프로세스 정리.

var process = require('process');
var service = require('service');
var os = require('os');

var SERVICE_NAME = 'neo-pkg-llm';
var IS_WIN = os.platform() === 'windows';
var BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(err) {
  if (err) {
    console.println('WARN:', err.message);
  } else {
    console.println('service stopped.');
  }

  // 안전장치: orphan/좀비 프로세스 정리
  try {
    if (IS_WIN) {
      process.exec('@taskkill', '/F', '/IM', BIN_NAME);
    } else {
      process.exec('@pkill', '-f', BIN_NAME);
    }
  } catch (e) {
    // 무시
  }
});
