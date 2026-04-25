# Machbase Neo LLM Chat Package

The Machbase Neo LLM Chat Package is an LLM-based chat interface that enables natural language interaction with Machbase Neo time-series database. Users can query data, generate dashboards, create analysis reports, and explore manual documentation — all through conversation.

The package runs an agentic loop internally — sending user queries to the LLM, executing tool calls against Machbase Neo, feeding results back, and repeating until a final response is produced.

## Installation

### Install via Neo Web UI

1. Open the Machbase Neo Web UI in your browser.
2. Select the **PKG** tab from the left menu bar.
3. Find `neo-pkg-llm-chat` in the package list and click **Install**.
4. The package automatically downloads the required components, registers the service, and starts it.

### Uninstall

1. Select `neo-pkg-llm-chat` in the PKG tab.
2. Click **Uninstall** to remove the package and its service.

## LLM Providers

The system supports four LLM providers. All providers support both synchronous and streaming chat.

| Provider   | API                | Streaming | Local |
| :--------- | :----------------- | :-------: | :---: |
| Claude     | Anthropic API      | Yes       | No    |
| ChatGPT    | OpenAI API         | Yes       | No    |
| Gemini     | Google Gemini API  | Yes       | No    |
| Ollama     | Ollama REST API    | Yes       | Yes   |

Provider and connection settings are configured through the web-based Settings page, which allows you to set API keys, select models, and configure the Machbase Neo database connection (host, port, user, password) directly in the browser.

## Agentic Loop

The agentic loop is the core execution engine. When a user sends a query, the system first detects the query type, then enters an autonomous loop where the LLM selects tools, executes them, and repeats until a final answer is ready (max 60 steps).

### Query Type Detection

The system automatically classifies the user query and activates the appropriate mode:

- Queries containing "report" (or Korean equivalents) activate **Report Mode**, which generates a pre-defined HTML analysis report.
- Queries containing "in-depth", "multi-angle", "FFT", or "RMS" (or Korean equivalents) activate **Advanced Mode**, which uses pre-defined TQL chart templates.
- All other analysis or dashboard requests use **Basic Mode** with table-based charts.

### Guard System

The guard system automatically corrects common LLM mistakes during execution.

| Guard                       | Description                                                              |
| :-------------------------- | :----------------------------------------------------------------------- |
| `fixToolCalls`              | Auto-corrects wrong parameter names in tool calls                        |
| `guardDashboardEarlyCall`   | Prevents dashboard creation before TQL chart files are saved             |
| `guardChartOmission`        | Re-prompts LLM when it tries to finish without saving all chart templates|
| `guardReportOmission`       | Re-prompts LLM when it skips `save_html_report` in report mode          |
| `guardConsecutiveFailure`   | Skips a tool after consecutive failures instead of retrying endlessly    |
| `validateTagInArgs`         | Verifies tag names in TQL scripts exist in the actual table              |
| Time range correction       | Auto-adjusts `time_start`/`time_end` to match actual data boundaries    |

## list_tables()

*Syntax*: `list_tables()`

Query available table list in Machbase Neo. Returns a CSV-formatted list of all tables owned by the current user.

### Example: List Tables

Ask the chat: "Show me the table list"

The tool executes internally:

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

Get tag metadata from a tag table. Queries the `_tablename_meta` table and returns all tag (sensor) names.

- `table_name` *string* required, tag table name.

### Example: List Tags

```
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

Execute SQL query directly on Machbase Neo.

- `sql_query` *string* required, SQL query to execute.
- `format` *string* output format. Default: `csv`
- `timeformat` *string* time format. Default: `default`
- `timezone` *string* timezone. Default: `Local`

> **Note**: `UPDATE` statements are blocked for safety. The tool returns parsed error messages when SQL execution fails.

### Example: Tag Statistics

```
execute_sql_query(sql_query="SELECT NAME, COUNT(*), AVG(VALUE) FROM EXAMPLE GROUP BY NAME")
```

```csv
NAME,COUNT(*),AVG(VALUE)
temperature,15230,23.456
humidity,15230,65.123
pressure,15230,1013.25
```

### Example: Time Range Query

```
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

Execute a TQL (Transforming Query Language) script on Machbase Neo. Returns chart HTML or CSV data depending on the SINK function used in the script.

- `tql_content` *string* required, TQL script content.
- `timeout_seconds` *integer* execution timeout. Default: `60`

### Example: Execute TQL with CSV Output

```
execute_tql_script(tql_content="SQL(`SELECT NAME, COUNT(*) FROM EXAMPLE GROUP BY NAME`)\nCSV()")
```

```csv
temperature,15230
humidity,15230
pressure,15230
```

### Example: Execute TQL with Chart Output

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

The tool returns the rendered chart as an HTML fragment.

## validate_chart_tql()

*Syntax*: `validate_chart_tql( tql_script )`

Validate a TQL chart script by executing it and checking for errors.

- `tql_script` *string* required, TQL script to validate.

Returns one of:
- `VALIDATION OK: TQL executed successfully (N bytes output)`
- `VALIDATION WARNING: TQL returned empty result`
- `VALIDATION FAILED: error details`

## save_tql_file()

*Syntax*: `save_tql_file( filename, tql_content )`

Save a TQL or SQL script file to Machbase Neo. TQL files are validated by execution before saving.

- `filename` *string* required, file path (e.g., `GOLD/chart.tql`).
- `tql_content` *string* required, TQL script content.

The tool performs the following before saving:
1. Checks for invalid ROLLUP units (e.g., `ROLLUP('ms')` is not supported, minimum unit is `sec`).
2. Executes the TQL script to validate correctness.
3. If a ROLLUP column error occurs (`MACH-ERR 2264`), auto-creates SEC/MIN/HOUR rollup tables and retries.
4. Creates parent folders automatically if needed.

### Example: Save a Chart TQL

```
save_tql_file(
    filename="GOLD/avg_trend.tql",
    tql_content="SQL(`SELECT ...`)\nCHART(...)"
)
```

```
File saved successfully: GOLD/avg_trend.tql
```

If validation fails:

```
TQL validation failed (not saved): MACH-ERR 2044 ...
```

## create_dashboard_with_charts()

*Syntax*: `create_dashboard_with_charts( filename [, title, time_start, time_end, charts] )`

Create a dashboard with multiple chart panels in a single call.

- `filename` *string* required, dashboard path (e.g., `GOLD/Gold_Analysis.dsh`).
- `title` *string* dashboard title. Default: `Dashboard`
- `time_start` *string* time range start. Default: `now-1h`
- `time_end` *string* time range end. Default: `now`
- `charts` *string* JSON array of chart definitions.

Each chart object in the `charts` array:

```json
{
  "title": "Chart Title",
  "type": "Line",
  "table": "TABLE_NAME",
  "tag": "tag1,tag2",
  "column": "VALUE",
  "color": "#5470c6",
  "tql_path": "FOLDER/chart.tql"
}
```

Supported chart types: `Line`, `Bar`, `Scatter`, `Pie`, `Gauge`, `Tql chart`

### Example: Create Dashboard with TQL Charts

```
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

```
Dashboard created: GOLD/Gold_Analysis.dsh (3 charts)
```

## add_chart_to_dashboard()

*Syntax*: `add_chart_to_dashboard( filename [, chart_title, chart_type, table, tag, column, tql_path, color, w, h] )`

Add a chart panel to an existing dashboard.

- `filename` *string* required, dashboard filename.
- `chart_title` *string* chart title. Default: `New chart`
- `chart_type` *string* chart type. Default: `Line`
- `table` *string* tag table name.
- `tag` *string* tag name(s), comma-separated.
- `column` *string* column name. Default: `VALUE`
- `tql_path` *string* TQL file path (for `Tql chart` type).
- `color` *string* hex color. Default: `#367FEB`
- `w` *integer* panel width in grid units (max 24, 0=auto). Default: `0`
- `h` *integer* panel height in grid units. Default: `0`

> **Note**: Width and height are in grid units, not pixels. Large chart types (Line, Bar, Scatter) default to 17 units wide; small types (Pie, Gauge) default to 7 units.

### Example: Add a Line Chart

```
add_chart_to_dashboard(
    filename="GOLD/Gold_Analysis.dsh",
    chart_title="Temperature Trend",
    chart_type="Line",
    table="EXAMPLE",
    tag="temperature",
    color="#5470c6"
)
```

### Example: Add a TQL Chart

```
add_chart_to_dashboard(
    filename="GOLD/Gold_Analysis.dsh",
    chart_title="FFT Spectrum",
    chart_type="Tql chart",
    tql_path="GOLD/fft_spectrum.tql"
)
```

## remove_chart_from_dashboard()

*Syntax*: `remove_chart_from_dashboard( filename [, panel_id, panel_title] )`

Remove a chart panel from a dashboard by panel UUID or title.

- `filename` *string* required, dashboard filename.
- `panel_id` *string* panel UUID to remove.
- `panel_title` *string* panel title to remove.

## update_chart_in_dashboard()

*Syntax*: `update_chart_in_dashboard( filename [, panel_id, panel_title, new_title, new_chart_type, new_table, new_tag, new_column, new_color] )`

Update an existing chart panel in a dashboard.

- `filename` *string* required, dashboard filename.
- `panel_id` *string* panel UUID.
- `panel_title` *string* panel title (first match).
- `new_title` *string* new panel title.
- `new_chart_type` *string* new chart type.
- `new_table` *string* new table name.
- `new_tag` *string* new tag name(s).
- `new_column` *string* new column name.
- `new_color` *string* new color.

## list_dashboards()

*Syntax*: `list_dashboards()`

List all dashboards in Machbase Neo Web UI. Returns paths of all `.dsh` files.

## get_dashboard()

*Syntax*: `get_dashboard( filename )`

Get a dashboard's full configuration as JSON.

- `filename` *string* required, dashboard filename.

## delete_dashboard()

*Syntax*: `delete_dashboard( filename )`

Delete a dashboard file from Machbase Neo.

- `filename` *string* required, dashboard filename to delete.

## update_dashboard_time_range()

*Syntax*: `update_dashboard_time_range( filename [, time_start, time_end, refresh] )`

Update the time range of a dashboard.

- `filename` *string* required, dashboard filename.
- `time_start` *string* start time. Default: `now-1h`
- `time_end` *string* end time. Default: `now`
- `refresh` *string* auto-refresh interval. Default: `Off`

## preview_dashboard()

*Syntax*: `preview_dashboard( filename )`

Get a dashboard preview with summary and direct Neo Web UI link.

- `filename` *string* required, dashboard filename.

## TQL Analysis Templates

The system includes pre-defined TQL chart templates for three data domains. During advanced analysis, the agentic loop expands these templates with actual table names, tag names, and time ranges, then saves them as TQL files.

### Financial Analysis (Type 1)

| ID  | Chart Name       | Description                                       |
| :-: | :--------------- | :------------------------------------------------ |
| 1-1 | Average Trend    | ROLLUP-based moving average trend line             |
| 1-2 | Volatility       | Standard deviation / price change rate             |
| 1-3 | Price Band       | MIN/MAX envelope with average overlay              |
| 1-4 | Tag Comparison   | Two-tag overlay comparison chart                   |
| 1-5 | Volume Trend     | Data density / count trend over time               |
| 1-6 | Log Price        | Logarithmic scale price chart                      |

### Sensor / Vibration Analysis (Type 2)

| ID  | Chart Name       | Description                                       |
| :-: | :--------------- | :------------------------------------------------ |
| 2-1 | RMS Vibration    | Root Mean Square vibration level (using SUMSQ)     |
| 2-2 | FFT Spectrum     | Fast Fourier Transform frequency analysis          |
| 2-3 | Peak Envelope    | MAX envelope for peak detection                    |
| 2-4 | Peak-to-Peak     | MAX minus MIN range over time                      |
| 2-5 | Crest Factor     | Peak-to-RMS ratio for impact detection             |
| 2-6 | Data Density     | Record count distribution over time                |
| 2-7 | 3D Spectrum      | 3D time-frequency-amplitude visualization          |

### General Analysis (Type 3)

| ID  | Chart Name       | Description                                       |
| :-: | :--------------- | :------------------------------------------------ |
| 3-1 | Rollup Average   | ROLLUP-based average trend                         |
| 3-2 | Tag Comparison   | Two-tag comparison chart                           |
| 3-3 | Count Trend      | Data count over time intervals                     |
| 3-4 | MIN/MAX Envelope | Minimum and maximum boundary chart                 |

### Template Reference Format

Templates are referenced using a structured format with placeholders:

```
TEMPLATE:1-1 TABLE:GOLD TAG:close UNIT:day
TEMPLATE:1-4 TABLE:GOLD TAG1:open TAG2:close
TEMPLATE:2-2 TABLE:SENSOR TAG:vibration_x UNIT:sec
```

The template expander replaces `{TABLE}`, `{TAG}`, `{UNIT}`, `{TIME_START}`, `{TIME_END}` placeholders with actual values from the current analysis context.

UNIT selection depends on data duration:
- Hours of data → `sec`
- Days of data → `hour`
- Weeks to years of data → `day`

## save_html_report()

*Syntax*: `save_html_report( table [, template_id, tag_count, data_count, time_range, analysis] )`

Generate an HTML analysis report with charts and deep analysis. The tool internally performs data retrieval, FFT/statistical calculations, chart generation, and HTML file creation.

- `table` *string* required, table name (e.g., `GOLD`).
- `template_id` *string* report template. Default: `R-0`
- `tag_count` *string* number of tags.
- `data_count` *string* total data count.
- `time_range` *string* time range description.
- `analysis` *string* deep analysis text.

### Report Templates

| Template ID | Type           | Description                                   |
| :---------: | :------------- | :-------------------------------------------- |
| `R-0`       | General        | Basic statistical analysis with trend charts   |
| `R-1`       | Financial      | Price bands, volatility, log-scale analysis    |
| `R-2`       | Vibration      | RMS, FFT spectrum, envelope, crest factor      |
| `R-3`       | Driving        | Speed/RPM correlation, driving pattern analysis|

### Example: Generate a Financial Report

First call — the tool queries data and returns a chart analysis summary:

```
save_html_report(table="GOLD", template_id="R-1")
```

```
Chart analysis summary: Gold price from 2023-09-20 to 2025-12-13 ...
Please call again with this summary in the analysis parameter.
```

Second call — the tool generates the final HTML report:

```
save_html_report(
    table="GOLD",
    template_id="R-1",
    analysis="Gold price from 2023-09-20 to 2025-12-13 ..."
)
```

```
Report saved: GOLD/GOLD_financial_report.html
```

## list_timers()

*Syntax*: `list_timers()`

List all timers (schedulers) registered in Machbase Neo. Returns name, state (RUNNING/STOP), schedule, and TQL path for each timer.

### Example: List Timers

```
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

Create a new timer (scheduler) that runs a TQL script on a schedule.

- `name` *string* required, timer name (unique identifier).
- `schedule` *string* required, execution schedule.
- `path` *string* required, TQL script path to execute.
- `auto_start` *boolean* auto-start on server restart. Default: `false`

Schedule format examples:

| Expression         | Description                    |
| :----------------- | :----------------------------- |
| `@every 10s`       | Every 10 seconds               |
| `@every 1h30m`     | Every 1 hour 30 minutes        |
| `@daily`           | Once a day at midnight         |
| `0 30 * * * *`     | Every hour at 30 minutes       |

> **Note**: Creating a timer does NOT start it automatically. You must call `start_timer` separately.

### Example: Create and Start a Timer

The recommended workflow:

1. Create the target TAG TABLE:

```sql
CREATE TAG TABLE IF NOT EXISTS SENSOR_DATA (
    name VARCHAR(80) PRIMARY KEY,
    time DATETIME BASETIME,
    value DOUBLE SUMMARIZED
) WITH ROLLUP;
```

2. Create the TQL script using `save_tql_file`.

3. Register the timer:

```
add_timer(name="SENSOR_DATA", schedule="@every 10s", path="SENSOR_DATA/SENSOR_DATA.tql")
```

```
Timer 'SENSOR_DATA' created successfully. (schedule: @every 10s, path: SENSOR_DATA/SENSOR_DATA.tql)
NOTE: The timer is NOT running yet. Call start_timer with name='SENSOR_DATA' to begin execution.
```

4. Start the timer:

```
start_timer(name="SENSOR_DATA")
```

```
Timer 'SENSOR_DATA' started.
```

## start_timer()

*Syntax*: `start_timer( name )`

Start an existing timer. If the timer is already running, it returns a message indicating so.

- `name` *string* required, timer name to start.

## stop_timer()

*Syntax*: `stop_timer( name )`

Stop a running timer.

- `name` *string* required, timer name to stop.

## delete_timer()

*Syntax*: `delete_timer( name )`

Delete a timer from Machbase Neo. If the timer is still running, it is automatically stopped before deletion.

- `name` *string* required, timer name to delete.

To fully clean up a timer and its associated resources:

```
stop_timer(name="SENSOR_DATA")
delete_timer(name="SENSOR_DATA")
delete_file(filename="SENSOR_DATA/SENSOR_DATA.tql")
delete_file(filename="SENSOR_DATA/")
execute_sql_query(sql_query="DROP TABLE SENSOR_DATA CASCADE")
```

## create_folder()

*Syntax*: `create_folder( folder_name [, parent] )`

Create a folder in Machbase Neo file system.

- `folder_name` *string* required, folder name to create.
- `parent` *string* parent path. Default: root.

## list_files()

*Syntax*: `list_files( [path] )`

List files and folders in Machbase Neo file system.

- `path` *string* directory path. Default: `/`

### Example: List Files

```
list_files(path="GOLD")
```

```
Files in GOLD:
  [file] avg_trend.tql
  [file] volatility.tql
  [file] Gold_Analysis.dsh
```

## delete_file()

*Syntax*: `delete_file( filename )`

Delete a file or empty folder from Machbase Neo file system.

- `filename` *string* required, file path to delete.

## get_full_document_content()

*Syntax*: `get_full_document_content( file_identifier )`

Get complete content of a specific manual document. If the file is not found, the tool searches the catalog and suggests related manual documents.

- `file_identifier` *string* required, relative path (e.g., `sql/sql-rollup.md`).

### Example: Read Rollup Documentation

```
get_full_document_content(file_identifier="sql/sql-rollup.md")
```

Returns the full markdown content of the rollup manual document.

## get_document_sections()

*Syntax*: `get_document_sections( file_identifier [, section_filter] )`

Get manual document content organized by sections, optionally filtered by keyword.

- `file_identifier` *string* required, file path.
- `section_filter` *string* filter sections containing this text.

### Example: Read Specific Sections

```
get_document_sections(file_identifier="tql/tql-sink.md", section_filter="CHART")
```

Returns only sections that contain "CHART" in their title or content.

## extract_code_blocks()

*Syntax*: `extract_code_blocks( file_identifier [, language] )`

Extract all code blocks from a manual document, optionally filtered by language.

- `file_identifier` *string* required, file path.
- `language` *string* filter by language (e.g., `js`, `sql`).

### Example: Extract SQL Examples

```
extract_code_blocks(file_identifier="sql/sql-guide.md", language="sql")
```

```
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

Get version information of the package and Machbase Neo server.

## debug_mcp_status()

*Syntax*: `debug_mcp_status()`

Check current status and connectivity by querying Machbase Neo system tables.

### Example: Health Check

```
debug_mcp_status()
```

```
Status: OK
Machbase: http://127.0.0.1:5654
COUNT(*)
152
```

## update_connection()

*Syntax*: `update_connection( [host, port, user, password] )`

Update Machbase Neo connection settings at runtime. Only provided fields are changed; omitted fields keep current values.

- `host` *string* Machbase Neo host (e.g., `192.168.1.100`).
- `port` *string* Machbase Neo port (e.g., `5654`).
- `user` *string* user name.
- `password` *string* password.

### Example: Change Connection

```
update_connection(host="192.168.1.100", port="5654")
```

```
Connection updated successfully.
Machbase: http://192.168.1.100:5654
User: SYS
COUNT(*)
152
```

## HTTP API Endpoints

When running in `server` mode, the package exposes the following HTTP API endpoints.

### Master-level Endpoints

| Method | Path                    | Description                              |
| :----: | :---------------------- | :--------------------------------------- |
| GET    | `/health`               | Health check                             |
| GET    | `/settings`             | Settings page                            |
| GET    | `/api/instances`        | List running instances                   |
| POST   | `/api/configs`          | Save config and start instance           |
| GET    | `/api/configs`          | List all configs                         |
| GET    | `/api/configs/{name}`   | Get a specific config                    |
| PUT    | `/api/configs/{name}`   | Update config and restart instance       |
| DELETE | `/api/configs/{name}`   | Delete config and stop instance          |

### Per-instance Endpoints

| Method | Path                          | Description                         |
| :----: | :---------------------------- | :---------------------------------- |
| POST   | `/{name}/api/chat`            | Non-streaming chat                  |
| POST   | `/{name}/api/chat/stream`     | SSE streaming chat                  |
| GET    | `/{name}/api/settings`        | Get instance config                 |
| POST   | `/{name}/api/restart-llm`     | Restart instance LLM client         |
| GET    | `/{name}/ws`                  | WebSocket endpoint (Chat UI)        |
| GET    | `/{name}/health`              | Instance health check               |

### Example: Streaming Chat via curl

```bash
curl -X POST http://localhost:8884/sys/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me the table list"}'
```

### Example: Health Check

```bash
curl http://localhost:8884/health
```

```json
{"status": "ok"}
```

## WebSocket Protocol

The chat UI communicates with the package service via WebSocket. The connection URL follows the pattern `ws://{host}:{port}/{user_id}/ws`.

### Client to Server Messages

**get_models** — Request available LLM providers and models:

```json
{"type": "get_models", "user_id": "sys"}
```

**chat** — Send a chat message:

```json
{
  "type": "chat",
  "user_id": "sys",
  "session_id": "sess-1234567890",
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "query": "Analyze the GOLD table"
}
```

**stop** — Stop the current generation:

```json
{"type": "stop", "user_id": "sys", "session_id": "sess-1234567890"}
```

**clear** — Clear session history:

```json
{"type": "clear", "user_id": "sys", "session_id": "sess-1234567890"}
```

### Server to Client Messages

The server sends streaming events during the agentic loop:

**Streaming text chunk:**

```json
{
  "type": "msg",
  "message": {
    "type": "ofStreamBlockDelta",
    "body": {
      "ofStreamBlockDelta": {
        "contentType": "text",
        "text": "Let me summarize the analysis results..."
      }
    }
  }
}
```

**Tool call notification:**

```json
{"type": "tool_call", "name": "execute_sql_query", "args": {"sql_query": "SELECT ..."}}
```

**Tool result:**

```json
{"type": "tool_result", "status": "success", "content": "NAME,COUNT(*)\\ntemperature,15230"}
```
