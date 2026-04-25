## ADDED Requirements

### Requirement: RVM file upload and async task creation
The system SHALL accept a multipart/form-data `POST /rvm` request containing a single `.rvm` file and SHALL return a `{ taskId: string }` JSON response. The taskId SHALL be used for subsequent status polling.

#### Scenario: Valid RVM file upload
- **WHEN** a client sends `POST /rvm` with a valid `.rvm` binary file
- **THEN** the server responds with HTTP 201 and body `{ "taskId": "<uuid>" }`

#### Scenario: No file provided
- **WHEN** a client sends `POST /rvm` with no file attached
- **THEN** the server responds with HTTP 400

### Requirement: Asynchronous GLTF conversion via rvmparser CLI
The system SHALL invoke the rvmparser executable as a child process in a worker thread, passing the uploaded `.rvm` file as input and producing a `.glb` binary as output. The executable SHALL be resolved from the `RVM_PARSER_PATH` environment variable, falling back to `S:\rvmparser\msvc15\x64\Release\rvmparser.exe` if the variable is not set.

#### Scenario: Successful conversion
- **WHEN** rvmparser exits with code 0
- **THEN** the task result SHALL be the raw `.glb` file buffer and the task status SHALL be `completed`

#### Scenario: Conversion failure (non-zero exit)
- **WHEN** rvmparser exits with a non-zero exit code or emits to stderr
- **THEN** the task status SHALL be `error` with a descriptive message containing the stderr output

#### Scenario: Executable not found
- **WHEN** the path from `RVM_PARSER_PATH` (or the default) does not point to an existing file
- **THEN** the task status SHALL be `error` with a message indicating the executable was not found

#### Scenario: Custom executable path via environment variable
- **WHEN** `RVM_PARSER_PATH` is set to a valid path before the server starts
- **THEN** the worker SHALL use that path instead of the hardcoded default

### Requirement: GLB result retrieval via polling
The system SHALL expose `GET /rvm/status?taskId=<id>` for clients to poll task status. When the task is completed, the endpoint SHALL return the `.glb` file as a binary download (`application/octet-stream`) with `Content-Disposition: attachment; filename=model.glb`. When pending, it SHALL return `{ "status": "pending" }`.

#### Scenario: Polling a pending task
- **WHEN** a client polls `GET /rvm/status?taskId=<id>` before conversion finishes
- **THEN** the server responds with HTTP 200 and body `{ "status": "pending" }`

#### Scenario: Polling a completed task
- **WHEN** a client polls `GET /rvm/status?taskId=<id>` after conversion finishes
- **THEN** the server responds with HTTP 200, `Content-Type: application/octet-stream`, `Content-Disposition: attachment; filename=model.glb`, and the GLB binary as the response body

#### Scenario: Polling an errored task
- **WHEN** a client polls `GET /rvm/status?taskId=<id>` after a conversion failure
- **THEN** the server responds with HTTP 200 and body `{ "status": "error", "message": "<reason>" }`

#### Scenario: Polling an unknown taskId
- **WHEN** a client polls `GET /rvm/status?taskId=<id>` with an id that does not exist in the cache
- **THEN** the server responds with HTTP 404

### Requirement: Temp file cleanup
The system SHALL create a per-task temporary directory under the OS temp folder, write the uploaded `.rvm` file and the generated `.glb` to that directory, and SHALL delete the entire temp directory after the `.glb` buffer has been read into memory.

#### Scenario: Successful cleanup after conversion
- **WHEN** rvmparser completes successfully and the GLB buffer has been read
- **THEN** the temporary directory for that task SHALL no longer exist on disk

#### Scenario: Cleanup on conversion failure
- **WHEN** rvmparser fails for any reason
- **THEN** the temporary directory for that task SHALL still be removed
