'use strict';

// pkg run uninstall 용. 서비스 중지/제거 + 패키지 디렉토리 삭제.
// servicectl 직접 호출 (service 모듈은 CGI env 필요).

const process = require('process');
const pathLib = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'windows';
const posix = pathLib;
const hostPath = IS_WIN ? pathLib.win32 : pathLib;

const SERVICE_NAME = 'neo-pkg-llm';
const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const PACKAGE_ROOT = APP_DIR.slice(0, APP_DIR.lastIndexOf('/cgi-bin'));

// 1. 서비스 중지 (실패해도 무시)
console.println('══ stop service ══');
process.exec('servicectl', 'stop', SERVICE_NAME);

// 2. 서비스 등록 제거
console.println('');
console.println('══ uninstall service ══');
const uninstCode = process.exec('servicectl', 'uninstall', SERVICE_NAME);
if (uninstCode !== 0) {
  console.println('warning: uninstall returned ' + uninstCode + ' (continuing)');
}

// 3. 패키지 디렉토리 삭제 (host 경로로 변환)
console.println('');
console.println('══ remove package directory ══');
const hostWorkDir = hostPath.dirname(process.execPath);
const relFromWork = PACKAGE_ROOT.replace(/^\/work\//, '');
const hostPackageDir = hostPath.join(hostWorkDir, relFromWork);
console.println('removing:', hostPackageDir);

let rmCode;
if (IS_WIN) {
  rmCode = process.exec('@cmd.exe', '/C', 'rmdir', '/S', '/Q', hostPackageDir);
} else {
  rmCode = process.exec('@/bin/rm', '-rf', hostPackageDir);
}

if (rmCode !== 0) {
  console.println('failed to remove directory (exit ' + rmCode + ')');
  process.exit(rmCode);
}

console.println('');
console.println('✓ cleanup completed');
