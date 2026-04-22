'use strict';

// JSH 런타임에서 실행됨. JSH 가상경로(/work/...)를 호스트 OS의 실경로로 변환한 뒤
// 네이티브 바이너리를 shell 래퍼로 실행. Linux / macOS / Windows 공통 지원.

const process = require('process');
const pathLib = require('path');
const os = require('os');

const IS_WIN = os.platform() === 'windows';

// JSH의 `path` 모듈은 기본 POSIX. Windows 호스트 경로는 win32를 명시적으로 사용.
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

// process.chdir은 JSH 가상 PWD만 바꾸고 네이티브 바이너리 cwd엔 효과 없음.
// process.exec도 Dir 옵션 미지원 → shell 래퍼로 cd 후 exec.
// (바이너리는 cwd 기준 "configs/" 를 스캔하므로 cwd가 LLM_DIR이어야 함)
const shell = IS_WIN ? '@cmd.exe' : '@/bin/sh';
const flag = IS_WIN ? '/C' : '-c';
const script = IS_WIN
  ? `cd /d "${hostLlmDir}" && "${executable}" -config "${configFile}"`
  : `cd "${hostLlmDir}" && exec "${executable}" -config "${configFile}"`;

const exitCode = process.exec(shell, flag, script);
process.exit(exitCode);
