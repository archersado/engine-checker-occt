## Context

The service currently processes STEP files by passing binary data to a Node.js worker thread that runs OCCT compiled to WebAssembly. The result is returned as an in-memory JSON object and cached by taskId.

AVEVA PDMS `.rvm` files require a different pipeline: an external native executable (`rvmparser.exe`) must be invoked via CLI. The executable reads from and writes to disk files, so temp-file I/O is necessary. The rest of the async job queue and polling mechanism can be reused as-is.

## Goals / Non-Goals

**Goals:**
- Accept `.rvm` file uploads via `POST /rvm`
- Spawn `rvmparser.exe` as a child process, writing temp input/output files
- Return the generated `.glb` binary as a file download on `GET /rvm/status?taskId=`
- Resolve the executable path from `RVM_PARSER_PATH` env var with a hardcoded fallback
- Clean up temp files after the response is sent
- Reuse `WorkerService` for task queueing and result caching

**Non-Goals:**
- Supporting `.att` attribute file uploads in this iteration
- Streaming partial progress (polling model only)
- Multiple concurrent rvmparser calls beyond the existing queue

## Decisions

### 1. Child process inside a worker thread (vs. direct `spawn` from service)

**Decision:** Run `child_process.spawn` inside a new worker file (`rvm.worker.ts`), consistent with the existing OCCT pattern.

**Rationale:** The `WorkerService` already provides a task queue, LRU result cache, and taskId generation. Plugging in a new worker file reuses all of that without forking the architecture. A direct `spawn` from the service could work but would require duplicating queue/cache logic.

**Alternative considered:** A dedicated `RvmService` with its own `Map`-based task store — rejected because it duplicates infrastructure already proven in `WorkerService`.

### 2. Output format: `.glb` (binary) by default

**Decision:** Call rvmparser with `--output-gltf=<stem>.glb`. Return the file as `application/octet-stream` with `Content-Disposition: attachment; filename=model.glb`.

**Rationale:** GLB is self-contained (buffers embedded), smaller than JSON GLTF + separate `.bin`, and easier to serve as a single file response.

**Alternative considered:** `.gltf` (JSON) — requires a separate `.bin` buffer file; serving two files over a single HTTP response adds complexity.

### 3. Temp directory per task

**Decision:** Create `os.tmpdir()/<taskId>/` for each job, write `input.rvm` there, run rvmparser to produce `output.glb`, read the result buffer, then remove the directory recursively after responding.

**Rationale:** Isolates concurrent tasks (even though the queue is serial today), avoids filename collisions, makes cleanup deterministic.

### 4. Executable path via `RVM_PARSER_PATH` env var

**Decision:** Read `process.env.RVM_PARSER_PATH` at worker startup; fall back to `S:\rvmparser\msvc15\x64\Release\rvmparser.exe` if unset.

**Rationale:** The hardcoded path works for the current dev environment; env var support allows deployment in CI or other machines without code changes.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| rvmparser.exe not found at configured path | Worker catches ENOENT from `spawn` and posts an error back; client gets `{ status: 'error', message: ... }` |
| Temp files left behind on crash | Temp dirs are named by taskId; a startup sweep or OS tmp cleanup handles orphans |
| Large `.glb` files in LRU cache | Store the `Buffer` in the LRU (same as current approach with OCCT result); limit is 100 entries; consider streaming in a future iteration |
| Windows-only executable | rvmparser.exe is a Windows binary; the service is Windows-only; documented in env var config |

## Migration Plan

1. Deploy new code alongside existing `/occt` endpoint — no breaking changes.
2. Set `RVM_PARSER_PATH` in the deployment environment if the default path is unavailable.
3. No database migrations or schema changes required.

## Open Questions

- Should the output format (`.gltf` vs `.glb`) be selectable by the caller via a query param? Deferred — GLB default is sufficient for now.
- Should `.att` attribute files be uploadable alongside `.rvm`? Deferred to a follow-up.
