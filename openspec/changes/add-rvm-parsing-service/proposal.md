## Why

The platform currently only supports STEP files via OCCT. Industrial plant design data commonly uses AVEVA PDMS `.rvm` format, which requires a separate parsing pipeline. Adding RVM support expands the set of usable model formats without changing the existing OCCT workflow.

## What Changes

- New `POST /rvm` endpoint accepting `.rvm` file uploads (with optional `.att` attribute file)
- New worker that spawns `rvmparser.exe` as a child process via CLI
- `rvmparser.exe` converts the `.rvm` file to `.gltf` or `.glb` on disk, result is read and returned to the client
- The path to `rvmparser.exe` is configurable via the `RVM_PARSER_PATH` environment variable (defaults to `S:\rvmparser\msvc15\x64\Release\rvmparser.exe`)
- Status polling reuses the existing `GET /rvm/status?taskId=` pattern from the OCCT service
- Temporary files (uploaded rvm, generated gltf) are written to a temp directory and cleaned up after the response is sent

## Capabilities

### New Capabilities

- `rvm-parsing`: Accept `.rvm` file uploads, invoke `rvmparser.exe` CLI to produce a `.gltf`/`.glb` file, and return the binary file to the caller. Executable path is resolved from the `RVM_PARSER_PATH` environment variable.

### Modified Capabilities

## Impact

- New NestJS controller: `RvmController` (`POST /rvm`, `GET /rvm/status`)
- New NestJS service/module: `RvmService` wrapping the existing `WorkerService` queue
- New worker file: `src/workers/rvm.worker.ts` (spawns child process)
- New env var: `RVM_PARSER_PATH` (path to rvmparser executable)
- Dependencies: Node.js built-in `child_process` and `fs/promises` — no new npm packages required
- Temp file I/O using `os.tmpdir()`
