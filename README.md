# neo-pkg-llm-chat

Machbase Neo용 LLM 서비스 패키지.  
`neo-pkg-llm` 바이너리를 다운로드하고 서비스로 관리하는 CGI 패키지입니다.

## 설치

```bash
# 1) 패키지 복사
pkg copy github.com/machbase/neo-pkg-llm-chat public/neo-pkg-llm-chat

# 2) 바이너리 다운로드 (CGI)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/setup.js

# 3) 설치 확인
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/setup-check.js
```

## CGI API

모든 API는 JSON 응답을 반환합니다.

### POST /public/neo-pkg-llm-chat/cgi-bin/setup.js

`neo-pkg-llm` 바이너리를 GitHub 최신 릴리스에서 다운로드하고 `llm/` 디렉토리에 압축 해제합니다. (GitHub API 미사용, rate limit 없음)

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/setup.js
```

```json
{
  "ok": true,
  "data": {
    "path": "/work/public/neo-pkg-llm-chat/cgi-bin/llm",
    "log": [
      "platform: linux-amd64",
      "downloading: https://github.com/machbase/neo-pkg-llm/releases/latest/download/neo-pkg-llm-linux-amd64.tar.gz",
      "extracting to: /work/public/neo-pkg-llm-chat/cgi-bin/llm",
      "done. llm installed at /work/public/neo-pkg-llm-chat/cgi-bin/llm"
    ]
  }
}
```

### GET /public/neo-pkg-llm-chat/cgi-bin/setup-check.js

`setup.js`가 정상적으로 실행되어 바이너리가 설치되었는지 확인합니다.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/setup-check.js
```

```json
{
  "ok": true,
  "data": {
    "installed": true,
    "binary": "/work/public/neo-pkg-llm-chat/cgi-bin/llm/neo-pkg-llm",
    "llm_dir": "/work/public/neo-pkg-llm-chat/cgi-bin/llm"
  }
}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/install.js

서비스 등록.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/install.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/start.js

서비스 시작.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/start.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### GET /public/neo-pkg-llm-chat/cgi-bin/status.js

서비스 상태 확인.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/status.js
```

```json
{
  "ok": true,
  "data": {
    "config": {
      "name": "neo-llm",
      "enable": false,
      "working_dir": "/work/public/neo-pkg-llm-chat/cgi-bin/llm",
      "executable": "/work/public/neo-pkg-llm-chat/cgi-bin/llm-launcher.js"
    },
    "status": "running",
    "exit_code": 0,
    "pid": 12345
  }
}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/stop.js

서비스 중지.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/stop.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/uninstall.js

서비스 제거.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/uninstall.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### GET /public/neo-pkg-llm-chat/cgi-bin/info.js

LLM 백엔드 포트 조회 (`llm/config.json`의 `server.port`). 프론트엔드가 API 호출 대상 포트를 알아낼 때 사용합니다.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/info.js
```

```json
{"ok":true,"data":{"port":"8884"}}
```

## 구조

```
neo-pkg-llm-chat/
├── package.json
└── cgi-bin/
    ├── package.json
    ├── setup.js            ← 바이너리 다운로드 (CGI, neo-pkg-llm 릴리스)
    ├── setup-check.js      ← 설치 여부 확인 (CGI)
    ├── llm-launcher.js     ← 네이티브 바이너리 실행 래퍼
    ├── install.js          ← 서비스 등록
    ├── start.js            ← 서비스 시작
    ├── status.js           ← 상태 확인
    ├── stop.js             ← 서비스 중지
    ├── uninstall.js        ← 서비스 제거
    ├── info.js             ← 백엔드 포트 조회 (config.json)
    └── llm/                ← 바이너리 디렉토리 (setup 후 생성)
```
