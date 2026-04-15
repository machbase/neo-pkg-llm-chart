# neo-pkg-llm-chat

Machbase Neo용 LLM 서비스 패키지.  
`neo-pkg-llm` 바이너리를 다운로드하고 서비스로 관리하는 CGI 패키지입니다.

## 설치

```bash
pkg copy github.com/machbase/neo-pkg-llm-chat public/llm-chat
pkg run -C public/llm-chat/cgi-bin setup
```

## CGI API

모든 API는 JSON 응답을 반환합니다.

### POST /public/llm-chat/cgi-bin/install.js

서비스 등록.

```bash
curl -X POST http://localhost:5654/public/llm-chat/cgi-bin/install.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### POST /public/llm-chat/cgi-bin/start.js

서비스 시작.

```bash
curl -X POST http://localhost:5654/public/llm-chat/cgi-bin/start.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### GET /public/llm-chat/cgi-bin/status.js

서비스 상태 확인.

```bash
curl http://localhost:5654/public/llm-chat/cgi-bin/status.js
```

```json
{
  "ok": true,
  "data": {
    "config": {
      "name": "neo-llm",
      "enable": false,
      "working_dir": "/work/public/llm-chat/cgi-bin/llm",
      "executable": "/work/public/llm-chat/cgi-bin/llm-launcher.js"
    },
    "status": "running",
    "exit_code": 0,
    "pid": 12345
  }
}
```

### POST /public/llm-chat/cgi-bin/stop.js

서비스 중지.

```bash
curl -X POST http://localhost:5654/public/llm-chat/cgi-bin/stop.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

### POST /public/llm-chat/cgi-bin/uninstall.js

서비스 제거.

```bash
curl -X POST http://localhost:5654/public/llm-chat/cgi-bin/uninstall.js
```

```json
{"ok":true,"data":{"name":"neo-llm"}}
```

## 구조

```
neo-pkg-llm-chat/
├── package.json
└── cgi-bin/
    ├── package.json
    ├── setup.js            ← 바이너리 다운로드 (neo-pkg-llm 릴리스)
    ├── llm-launcher.js     ← 네이티브 바이너리 실행 래퍼
    ├── install.js          ← 서비스 등록
    ├── start.js            ← 서비스 시작
    ├── status.js           ← 상태 확인
    ├── stop.js             ← 서비스 중지
    ├── uninstall.js        ← 서비스 제거
    └── llm/                ← 바이너리 디렉토리 (setup 후 생성)
```
