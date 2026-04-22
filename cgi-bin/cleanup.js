'use strict';

// pkg run uninstall 용. 서비스 제거 + 패키지 디렉토리 삭제.
// Linux / macOS / Windows 공통.

const process = require('process');
const pathLib = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'windows';
const posix = pathLib;
const hostPath = IS_WIN ? pathLib.win32 : pathLib;

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const PACKAGE_ROOT = APP_DIR.slice(0, APP_DIR.lastIndexOf('/cgi-bin'));

// 1. 서비스 제거
console.println('══ uninstall service ══');
const exitCode = process.exec(posix.join(APP_DIR, 'api', 'uninstall.js'));
if (exitCode !== 0) {
  console.println('warning: service uninstall returned ' + exitCode + ' (continuing)');
}

// 2. 패키지 디렉토리 통째로 삭제 (host 경로로 변환)
console.println('');
console.println('══ remove package directory ══');
const hostWorkDir = hostPath.dirname(process.execPath);
const relFromWork = PACKAGE_ROOT.replace(/^\/work\//, '');
const hostPackageDir = hostPath.join(hostWorkDir, relFromWork);
console.println('removing:', hostPackageDir);

let rmExitCode;
if (IS_WIN) {
  rmExitCode = process.exec('@cmd.exe', '/C', 'rmdir', '/S', '/Q', hostPackageDir);
} else {
  rmExitCode = process.exec('@/bin/rm', '-rf', hostPackageDir);
}

if (rmExitCode !== 0) {
  console.println('failed to remove directory (exit ' + rmExitCode + ')');
  process.exit(rmExitCode);
}

console.println('');
console.println('✓ cleanup completed');
