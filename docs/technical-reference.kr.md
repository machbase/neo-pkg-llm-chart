---
title: 기술 참고
weight: 40
---

# 기술 참고

이 문서는 LLM Chat 패키지가 내부적으로 사용하는 도구, 자동화 기능, 템플릿, 파일/문서 접근 기능을 정리한 기술 참고 문서입니다.

## list_tables()

*Syntax*: `list_tables()`

Machbase Neo에서 사용 가능한 테이블 목록을 조회합니다. 현재 사용자가 소유한 모든 테이블을 CSV 형식으로 반환합니다.

### 예제: 테이블 목록 조회

채팅에서 질문: "테이블 리스트 조회 해줘"

도구가 내부적으로 실행하는 SQL:

```sql
SELECT st.NAME FROM m$sys_tables AS st
JOIN m$sys_users AS su ON st.USER_ID = su.USER_ID
WHERE su.NAME = 'SYS' AND st.FLAG = 0
ORDER BY st.NAME
```

```csv
NAME
EXAMPLE
GOLD
SENSOR
```

## list_table_tags()

*Syntax*: `list_table_tags( table_name )`

태그 테이블의 태그 메타데이터를 조회합니다. `_tablename_meta` 테이블을 쿼리하여 모든 태그(센서)명을 반환합니다.

- `table_name` *string* 필수, 태그 테이블명

### 예제: 태그 목록 조회

```text
list_table_tags(table_name="EXAMPLE")
```

```csv
NAME
temperature
humidity
pressure
```

## execute_sql_query()

*Syntax*: `execute_sql_query( sql_query [, format, timeformat, timezone] )`

Machbase Neo에서 SQL 쿼리를 직접 실행합니다.

- `sql_query` *string* 필수, 실행할 SQL 쿼리
- `format` *string* 출력 형식. 기본값: `csv`
- `timeformat` *string* 시간 형식. 기본값: `default`
- `timezone` *string* 타임존. 기본값: `Local`

> 참고: 안전을 위해 `UPDATE` 구문은 차단됩니다. SQL 실행 실패 시 파싱된 에러 메시지를 반환합니다.

### 예제: 태그별 통계

```text
execute_sql_query(sql_query="SELECT NAME, COUNT(*), AVG(VALUE) FROM EXAMPLE GROUP BY NAME")
```

```csv
NAME,COUNT(*),AVG(VALUE)
temperature,15230,23.456
humidity,15230,65.123
pressure,15230,1013.25
```

### 예제: 시간 범위 조회

```text
execute_sql_query(
    sql_query="SELECT MIN(TIME), MAX(TIME) FROM EXAMPLE",
    timeformat="ms"
)
```

```csv
MIN(TIME),MAX(TIME)
1695222000000,1702425600000
```

## execute_tql_script()

*Syntax*: `execute_tql_script( tql_content [, timeout_seconds] )`

Machbase Neo에서 TQL (Transforming Query Language) 스크립트를 실행합니다. 스크립트에 사용된 SINK 함수에 따라 차트 HTML 또는 CSV 데이터를 반환합니다.

- `tql_content` *string* 필수, TQL 스크립트 내용
- `timeout_seconds` *integer* 실행 타임아웃. 기본값: `60`

### 예제: CSV 출력으로 TQL 실행

```text
execute_tql_script(tql_content="SQL(`SELECT NAME, COUNT(*) FROM EXAMPLE GROUP BY NAME`)\nCSV()")
```

```csv
temperature,15230
humidity,15230
pressure,15230
```

### 예제: 차트 출력으로 TQL 실행

```js
SQL(`SELECT TIME, VALUE FROM EXAMPLE WHERE NAME = 'temperature' GROUP BY TIME, VALUE ORDER BY TIME`)
CHART(
    size("600px", "340px"),
    chartOption({
        xAxis: { type: "time" },
        yAxis: {},
        series: [{
            type: "line",
            data: column(0).map(function(t, idx){ return [t, column(1)[idx]]; })
        }]
    }),
    tz("Asia/Seoul")
)
```

도구는 렌더링된 차트를 HTML 프래그먼트로 반환합니다.

## validate_chart_tql()

*Syntax*: `validate_chart_tql( tql_script )`

TQL 차트 스크립트를 실행하여 오류를 검증합니다.

- `tql_script` *string* 필수, 검증할 TQL 스크립트

반환 값:

- `VALIDATION OK: TQL executed successfully (N bytes output)`
- `VALIDATION WARNING: TQL returned empty result`
- `VALIDATION FAILED: 에러 상세`

## save_tql_file()

*Syntax*: `save_tql_file( filename, tql_content )`

Machbase Neo에 TQL 또는 SQL 스크립트 파일을 저장합니다. TQL 파일은 저장 전에 실행하여 검증합니다.

- `filename` *string* 필수, 파일 경로 (예: `GOLD/chart.tql`)
- `tql_content` *string* 필수, TQL 스크립트 내용

저장 전 수행되는 검증:

1. 잘못된 ROLLUP 단위를 확인합니다.
2. TQL 스크립트를 실행하여 정확성을 검증합니다.
3. ROLLUP 컬럼 에러(`MACH-ERR 2264`) 발생 시 SEC/MIN/HOUR 롤업 테이블을 자동 생성하고 재시도합니다.
4. 필요시 상위 폴더를 자동 생성합니다.

### 예제: 차트 TQL 저장

```text
save_tql_file(
    filename="GOLD/avg_trend.tql",
    tql_content="SQL(`SELECT ...`)\nCHART(...)"
)
```

```text
File saved successfully: GOLD/avg_trend.tql
```

검증 실패 시:

```text
TQL validation failed (not saved): MACH-ERR 2044 ...
```

## create_dashboard_with_charts()

*Syntax*: `create_dashboard_with_charts( filename [, title, time_start, time_end, charts] )`

여러 차트 패널을 포함한 대시보드를 한 번에 생성합니다.

- `filename` *string* 필수, 대시보드 경로 (예: `GOLD/Gold_Analysis.dsh`)
- `title` *string* 대시보드 제목. 기본값: `Dashboard`
- `time_start` *string* 시간 범위 시작. 기본값: `now-1h`
- `time_end` *string* 시간 범위 종료. 기본값: `now`
- `charts` *string* 차트 정의 JSON 배열

`charts` 배열의 각 차트 객체:

```json
{
  "title": "차트 제목",
  "type": "Line",
  "table": "테이블명",
  "tag": "tag1,tag2",
  "column": "VALUE",
  "color": "#5470c6",
  "tql_path": "폴더/chart.tql"
}
```

지원하는 차트 유형: `Line`, `Bar`, `Scatter`, `Pie`, `Gauge`, `Tql chart`

### 예제: TQL 차트로 대시보드 생성

```text
create_dashboard_with_charts(
    filename="GOLD/Gold_Analysis.dsh",
    title="GOLD Deep Analysis",
    time_start="1695222000000",
    time_end="1702425600000",
    charts='[
        {"title":"Average Trend","type":"Tql chart","tql_path":"GOLD/avg_trend.tql"},
        {"title":"Volatility","type":"Tql chart","tql_path":"GOLD/volatility.tql"},
        {"title":"Price Band","type":"Tql chart","tql_path":"GOLD/price_band.tql"}
    ]'
)
```

```text
Dashboard created: GOLD/Gold_Analysis.dsh (3 charts)
```

## add_chart_to_dashboard()

*Syntax*: `add_chart_to_dashboard( filename [, chart_title, chart_type, table, tag, column, tql_path, color, w, h] )`

기존 대시보드에 차트 패널을 추가합니다.

- `filename` *string* 필수, 대시보드 파일명
- `chart_title` *string* 차트 제목. 기본값: `New chart`
- `chart_type` *string* 차트 유형. 기본값: `Line`
- `table` *string* 태그 테이블명
- `tag` *string* 태그명, 쉼표로 구분
- `column` *string* 컬럼명. 기본값: `VALUE`
- `tql_path` *string* TQL 파일 경로 (`Tql chart` 유형용)
- `color` *string* hex 색상. 기본값: `#367FEB`
- `w` *integer* 패널 너비 (그리드 단위, 최대 24, 0=자동). 기본값: `0`
- `h` *integer* 패널 높이 (그리드 단위). 기본값: `0`

> 참고: 너비와 높이는 픽셀이 아닌 그리드 단위입니다. 대형 차트(Line, Bar, Scatter)는 기본 17 단위, 소형 차트(Pie, Gauge)는 기본 7 단위입니다.

### 예제: 라인 차트 추가

```text
add_chart_to_dashboard(
    filename="GOLD/Gold_Analysis.dsh",
    chart_title="Temperature Trend",
    chart_type="Line",
    table="EXAMPLE",
    tag="temperature",
    color="#5470c6"
)
```

### 예제: TQL 차트 추가

```text
add_chart_to_dashboard(
    filename="GOLD/Gold_Analysis.dsh",
    chart_title="FFT Spectrum",
    chart_type="Tql chart",
    tql_path="GOLD/fft_spectrum.tql"
)
```

## remove_chart_from_dashboard()

*Syntax*: `remove_chart_from_dashboard( filename [, panel_id, panel_title] )`

대시보드에서 차트 패널을 제거합니다. 패널 UUID 또는 제목으로 지정합니다.

- `filename` *string* 필수, 대시보드 파일명
- `panel_id` *string* 제거할 패널 UUID
- `panel_title` *string* 제거할 패널 제목

## update_chart_in_dashboard()

*Syntax*: `update_chart_in_dashboard( filename [, panel_id, panel_title, new_title, new_chart_type, new_table, new_tag, new_column, new_color] )`

대시보드의 기존 차트 패널을 수정합니다.

- `filename` *string* 필수, 대시보드 파일명
- `panel_id` *string* 패널 UUID
- `panel_title` *string* 패널 제목 (첫 번째 매칭)
- `new_title` *string* 새 패널 제목
- `new_chart_type` *string* 새 차트 유형
- `new_table` *string* 새 테이블명
- `new_tag` *string* 새 태그명
- `new_column` *string* 새 컬럼명
- `new_color` *string* 새 색상

## list_dashboards()

*Syntax*: `list_dashboards()`

Machbase Neo 웹 UI의 모든 대시보드 목록을 조회합니다. 모든 `.dsh` 파일 경로를 반환합니다.

## get_dashboard()

*Syntax*: `get_dashboard( filename )`

대시보드의 전체 설정을 JSON으로 조회합니다.

- `filename` *string* 필수, 대시보드 파일명

## delete_dashboard()

*Syntax*: `delete_dashboard( filename )`

Machbase Neo에서 대시보드 파일을 삭제합니다.

- `filename` *string* 필수, 삭제할 대시보드 파일명

## update_dashboard_time_range()

*Syntax*: `update_dashboard_time_range( filename [, time_start, time_end, refresh] )`

대시보드의 시간 범위를 변경합니다.

- `filename` *string* 필수, 대시보드 파일명
- `time_start` *string* 시작 시간. 기본값: `now-1h`
- `time_end` *string* 종료 시간. 기본값: `now`
- `refresh` *string* 자동 새로고침 간격. 기본값: `Off`

## preview_dashboard()

*Syntax*: `preview_dashboard( filename )`

대시보드 미리보기와 Neo 웹 UI 직접 링크를 반환합니다.

- `filename` *string* 필수, 대시보드 파일명

## TQL 분석 템플릿

3가지 데이터 도메인에 대한 사전 정의 TQL 차트 템플릿이 포함되어 있습니다. 고급 분석 시 에이전틱 루프가 이 템플릿에 실제 테이블명, 태그명, 시간 범위를 적용하여 TQL 파일로 저장합니다.

### 금융 분석 (유형 1)

| ID | 차트명 | 설명 |
| :-: | :--- | :--- |
| 1-1 | 평균 추세 | ROLLUP 기반 이동평균 추세선 |
| 1-2 | 변동성 | 표준편차 / 가격 변화율 |
| 1-3 | 가격 밴드 | MIN/MAX 엔벨로프와 평균 오버레이 |
| 1-4 | 태그 비교 | 두 태그 오버레이 비교 차트 |
| 1-5 | 거래량 추세 | 데이터 밀도 / 카운트 추세 |
| 1-6 | 로그 가격 | 로그 스케일 가격 차트 |

### 센서 / 진동 분석 (유형 2)

| ID | 차트명 | 설명 |
| :-: | :--- | :--- |
| 2-1 | RMS 진동 | SUMSQ를 이용한 진동 실효값 |
| 2-2 | FFT 스펙트럼 | 고속 푸리에 변환 주파수 분석 |
| 2-3 | 피크 엔벨로프 | 피크 감지용 MAX 엔벨로프 |
| 2-4 | Peak-to-Peak | 시간에 따른 MAX - MIN 범위 |
| 2-5 | Crest Factor | 충격 감지용 피크/RMS 비율 |
| 2-6 | 데이터 밀도 | 시간대별 레코드 카운트 분포 |
| 2-7 | 3D 스펙트럼 | 3D 시간-주파수-진폭 시각화 |

### 범용 분석 (유형 3)

| ID | 차트명 | 설명 |
| :-: | :--- | :--- |
| 3-1 | 롤업 평균 | ROLLUP 기반 평균 추세 |
| 3-2 | 태그 비교 | 두 태그 비교 차트 |
| 3-3 | 카운트 추세 | 시간 구간별 데이터 건수 |
| 3-4 | MIN/MAX 엔벨로프 | 최솟값과 최댓값 경계 차트 |

### 템플릿 참조 형식

템플릿은 플레이스홀더가 포함된 구조화된 형식으로 참조합니다:

```text
TEMPLATE:1-1 TABLE:GOLD TAG:close UNIT:day
TEMPLATE:1-4 TABLE:GOLD TAG1:open TAG2:close
TEMPLATE:2-2 TABLE:SENSOR TAG:vibration_x UNIT:sec
```

템플릿 확장기는 `{TABLE}`, `{TAG}`, `{UNIT}`, `{TIME_START}`, `{TIME_END}` 플레이스홀더를 현재 분석 컨텍스트의 실제 값으로 대체합니다.

UNIT 선택 기준:

- 수시간 분량의 데이터
  - `sec`
- 수일 분량의 데이터
  - `hour`
- 수주~수년 분량의 데이터
  - `day`

## save_html_report()

*Syntax*: `save_html_report( table [, template_id, tag_count, data_count, time_range, analysis] )`

차트와 심층 분석이 포함된 HTML 분석 리포트를 생성합니다. 도구 내부에서 데이터 조회, FFT/통계 계산, 차트 생성, HTML 파일 생성을 모두 수행합니다.

- `table` *string* 필수, 테이블명 (예: `GOLD`)
- `template_id` *string* 리포트 템플릿. 기본값: `R-0`
- `tag_count` *string* 태그 수
- `data_count` *string* 총 데이터 건수
- `time_range` *string* 시간 범위 설명
- `analysis` *string* 심층 분석 텍스트

### 리포트 템플릿

| 템플릿 ID | 유형 | 설명 |
| :---: | :--- | :--- |
| `R-0` | 범용 | 기본 통계 분석 및 추세 차트 |
| `R-1` | 금융 | 가격 밴드, 변동성, 로그 스케일 분석 |
| `R-2` | 진동 | RMS, FFT 스펙트럼, 엔벨로프, 크레스트 팩터 |
| `R-3` | 운전 | 속도/RPM 상관관계, 주행 패턴 분석 |

### 예제: 금융 분석 리포트 생성

1차 호출 — 도구가 데이터를 조회하고 차트 분석 요약을 반환합니다:

```text
save_html_report(table="GOLD", template_id="R-1")
```

```text
Chart analysis summary: 금 가격은 2023-09-20부터 2025-12-13까지 ...
Please call again with this summary in the analysis parameter.
```

2차 호출 — 도구가 최종 HTML 리포트를 생성합니다:

```text
save_html_report(
    table="GOLD",
    template_id="R-1",
    analysis="금 가격은 2023-09-20부터 2025-12-13까지 ..."
)
```

```text
Report saved: GOLD/GOLD_financial_report.html
```

## list_timers()

*Syntax*: `list_timers()`

Machbase Neo에 등록된 모든 타이머(스케줄러) 목록을 조회합니다. 각 타이머의 이름, 상태(RUNNING/STOP), 스케줄, TQL 경로를 반환합니다.

### 예제: 타이머 목록 조회

```text
list_timers()
```

```json
[
  {
    "name": "SENSOR_DATA",
    "state": "RUNNING",
    "schedule": "@every 10s",
    "path": "SENSOR_DATA/SENSOR_DATA.tql"
  }
]
```

## add_timer()

*Syntax*: `add_timer( name, schedule, path [, auto_start] )`

TQL 스크립트를 일정에 따라 실행하는 새 타이머(스케줄러)를 생성합니다.

- `name` *string* 필수, 타이머 이름 (고유 식별자)
- `schedule` *string* 필수, 실행 스케줄
- `path` *string* 필수, 실행할 TQL 스크립트 경로
- `auto_start` *boolean* 서버 재시작 시 자동 시작. 기본값: `false`

스케줄 형식 예시:

| 표현식 | 설명 |
| :--- | :--- |
| `@every 10s` | 10초마다 |
| `@every 1h30m` | 1시간 30분마다 |
| `@daily` | 매일 자정 |
| `0 30 * * * *` | 매시 30분 |

> 참고: 타이머를 생성해도 자동으로 시작되지 않습니다. `start_timer`를 별도로 호출해야 합니다.

### 예제: 타이머 생성 및 시작

권장 워크플로우:

1. 대상 TAG 테이블 생성

```sql
CREATE TAG TABLE IF NOT EXISTS SENSOR_DATA (
    name VARCHAR(80) PRIMARY KEY,
    time DATETIME BASETIME,
    value DOUBLE SUMMARIZED
) WITH ROLLUP;
```

2. `save_tql_file`로 TQL 스크립트 생성
3. 타이머 등록

```text
add_timer(name="SENSOR_DATA", schedule="@every 10s", path="SENSOR_DATA/SENSOR_DATA.tql")
```

```text
Timer 'SENSOR_DATA' created successfully. (schedule: @every 10s, path: SENSOR_DATA/SENSOR_DATA.tql)
NOTE: The timer is NOT running yet. Call start_timer with name='SENSOR_DATA' to begin execution.
```

4. 타이머 시작

```text
start_timer(name="SENSOR_DATA")
```

```text
Timer 'SENSOR_DATA' started.
```

## start_timer()

*Syntax*: `start_timer( name )`

기존 타이머를 시작합니다. 이미 실행 중이면 해당 메시지를 반환합니다.

- `name` *string* 필수, 시작할 타이머 이름

## stop_timer()

*Syntax*: `stop_timer( name )`

실행 중인 타이머를 중지합니다.

- `name` *string* 필수, 중지할 타이머 이름

## delete_timer()

*Syntax*: `delete_timer( name )`

Machbase Neo에서 타이머를 삭제합니다. 타이머가 실행 중이면 삭제 전에 자동으로 중지합니다.

- `name` *string* 필수, 삭제할 타이머 이름

타이머와 관련 리소스를 완전히 정리하는 방법:

```text
stop_timer(name="SENSOR_DATA")
delete_timer(name="SENSOR_DATA")
delete_file(filename="SENSOR_DATA/SENSOR_DATA.tql")
delete_file(filename="SENSOR_DATA/")
execute_sql_query(sql_query="DROP TABLE SENSOR_DATA CASCADE")
```

## create_folder()

*Syntax*: `create_folder( folder_name [, parent] )`

Machbase Neo 파일 시스템에 폴더를 생성합니다.

- `folder_name` *string* 필수, 생성할 폴더 이름
- `parent` *string* 상위 경로. 기본값: 루트

## list_files()

*Syntax*: `list_files( [path] )`

Machbase Neo 파일 시스템의 파일과 폴더 목록을 조회합니다.

- `path` *string* 디렉토리 경로. 기본값: `/`

### 예제: 파일 목록 조회

```text
list_files(path="GOLD")
```

```text
Files in GOLD:
  [file] avg_trend.tql
  [file] volatility.tql
  [file] Gold_Analysis.dsh
```

## delete_file()

*Syntax*: `delete_file( filename )`

Machbase Neo 파일 시스템에서 파일 또는 빈 폴더를 삭제합니다.

- `filename` *string* 필수, 삭제할 파일 경로

## get_full_document_content()

*Syntax*: `get_full_document_content( file_identifier )`

특정 메뉴얼 문서의 전체 내용을 조회합니다. 파일을 찾지 못하면 카탈로그에서 관련 메뉴얼 문서를 제안합니다.

- `file_identifier` *string* 필수, 상대 경로 (예: `sql/sql-rollup.md`)

### 예제: Rollup 문서 읽기

```text
get_full_document_content(file_identifier="sql/sql-rollup.md")
```

롤업 메뉴얼 문서의 전체 마크다운 내용을 반환합니다.

## get_document_sections()

*Syntax*: `get_document_sections( file_identifier [, section_filter] )`

메뉴얼 문서 내용을 섹션별로 구성하여 반환합니다. 키워드로 필터링할 수 있습니다.

- `file_identifier` *string* 필수, 파일 경로
- `section_filter` *string* 해당 텍스트가 포함된 섹션만 필터링

### 예제: 특정 섹션 읽기

```text
get_document_sections(file_identifier="tql/tql-sink.md", section_filter="CHART")
```

제목이나 내용에 "CHART"가 포함된 섹션만 반환합니다.

## extract_code_blocks()

*Syntax*: `extract_code_blocks( file_identifier [, language] )`

메뉴얼 문서에서 모든 코드 블록을 추출합니다. 언어별로 필터링할 수 있습니다.

- `file_identifier` *string* 필수, 파일 경로
- `language` *string* 언어 필터 (예: `js`, `sql`)

### 예제: SQL 예제 추출

```text
extract_code_blocks(file_identifier="sql/sql-guide.md", language="sql")
```

```text
--- Code Block 1 [sql] ---
CREATE TAG TABLE IF NOT EXISTS example (
  name varchar(100) primary key,
  time datetime basetime,
  value double summarized
);

--- Code Block 2 [sql] ---
INSERT INTO example VALUES('my-car', now, 1.2345);
```

## get_version()

*Syntax*: `get_version()`

패키지 및 Machbase Neo 서버의 버전 정보를 조회합니다.

## debug_mcp_status()

*Syntax*: `debug_mcp_status()`

Machbase Neo 시스템 테이블을 쿼리하여 현재 상태와 연결을 확인합니다.

### 예제: 상태 확인

```text
debug_mcp_status()
```

```text
Status: OK
Machbase: http://127.0.0.1:5654
COUNT(*)
152
```

## update_connection()

*Syntax*: `update_connection( [host, port, user, password] )`

런타임에 Machbase Neo 연결 설정을 변경합니다. 제공된 필드만 변경되고 생략된 필드는 현재 값을 유지합니다.

- `host` *string* Machbase Neo 호스트 (예: `192.168.1.100`)
- `port` *string* Machbase Neo 포트 (예: `5654`)
- `user` *string* 사용자 이름
- `password` *string* 비밀번호

### 예제: 연결 변경

```text
update_connection(host="192.168.1.100", port="5654")
```

```text
Connection updated successfully.
Machbase: http://192.168.1.100:5654
User: SYS
COUNT(*)
152
```

## 문서 이동

- [이전: Chat 사용 방법](./chat-usage.kr.md)
- [목차로 돌아가기](./index.kr.md)
- [다음: HTTP API와 WebSocket](./http-api-and-websocket.kr.md)
