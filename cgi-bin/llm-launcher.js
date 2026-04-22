'use strict';

// JSH 런타임에서 실행됨. JSH 가상경로(/work/...)를 호스트 OS의 실경로로 변환한 뒤
// 네이티브 바이너리를 shell 래퍼로 실행. Linux / macOS / Windows 공통 지원.

const process = require('process');
const pathLib = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'windows';

// JSH의 path 모듈은 기본 POSIX. Windows 호스트 경로는 win32를 명시적으로 사용.
// posix  - JSH 가상경로 조작 (항상 forward slash, /work/... 형태)
// hostPath - 호스트 경로 조작 (Windows: backslash/drive letter 처리)
const posix = pathLib;
const hostPath = IS_WIN ? pathLib.win32 : pathLib;

// ── JSH 가상경로 계산 (POSIX 고정) ──
const SCRIPT_DIR = posix.resolve(posix.dirname(process.argv[1])); // /work/public/.../cgi-bin
const LLM_DIR = posix.join(SCRIPT_DIR, 'llm');                    // /work/public/.../cgi-bin/llm
const BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

// ── 호스트 실경로 변환 ──
// process.execPath = 실행 중인 machbase-neo 바이너리의 호스트 절대경로
// 그 디렉토리가 JSH의 /work/ 마운트 포인트로 가정 (server.go:1059-1064)
const hostWorkDir = hostPath.dirname(process.execPath);
const relFromWork = LLM_DIR.replace(/^\/work\//, ''); // 가상경로는 POSIX 고정
const hostLlmDir = hostPath.join(hostWorkDir, relFromWork);
const executable = hostPath.join(hostLlmDir, BIN_NAME);
const configFile = hostPath.join(hostLlmDir, 'configs', 'sys.json');

console.println('launching:', executable);
console.println('config:', configFile);
console.println('cwd:', hostLlmDir);

// 바이너리 직접 실행. config는 절대경로로 전달하므로 cwd 무관.
// JSH '@' prefix = 네이티브 바이너리 직접 실행.
// Windows: cmd.exe 경유 시 경로 파싱 문제 → exe 직접 실행
// Linux/macOS: shell 래퍼로 cwd 설정 (상대경로 참조 대비)
var exitCode;
if (IS_WIN) {
  exitCode = process.exec('@' + executable, '-config', configFile);
} else {
  const script = cd "${hostLlmDir}" && exec "${executable}" -config "${configFile}";
  exitCode = process.exec('@/bin/sh', '-c', script);
}
process.exit(exitCode);