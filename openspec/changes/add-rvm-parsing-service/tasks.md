## 1. Worker Thread

- [x] 1.1 Create `src/workers/rvm.worker.ts`: read `workerData` (taskId + Uint8Array), write `input.rvm` to `os.tmpdir()/<taskId>/`, spawn rvmparser.exe with `--output-gltf=output.glb`, read result buffer, remove temp dir, post buffer to parentPort
- [x] 1.2 Resolve rvmparser path from `process.env.RVM_PARSER_PATH` with fallback to `S:\rvmparser\msvc15\x64\Release\rvmparser.exe`
- [x] 1.3 Handle rvmparser non-zero exit and ENOENT: post `{ error: string }` to parentPort and still clean up temp dir

## 2. Service

- [x] 2.1 Create `src/rvm/rvm.service.ts` wrapping `WorkerService.runInWorker` with the rvm worker path; expose `submitRvmJob(buffer: Buffer): string` and `getResult(taskId: string)`

## 3. Controller

- [x] 3.1 Create `src/rvm/rvm.controller.ts` with `POST /rvm` (FileInterceptor, returns `{ taskId }`) and `GET /rvm/status` (polls result; returns GLB buffer with correct headers or `{ status: 'pending' }` or 404)
- [x] 3.2 Return `Content-Type: application/octet-stream` and `Content-Disposition: attachment; filename=model.glb` when task is completed

## 4. Module Registration

- [x] 4.1 Create `src/rvm/rvm.module.ts` and import `WorkerService` (or share `AppModule`'s instance)
- [x] 4.2 Register `RvmModule` in `src/app.module.ts`

## 5. Configuration

- [x] 5.1 Document `RVM_PARSER_PATH` environment variable in `.env.example` (or equivalent config file)
- [x] 5.2 Verify `nest-cli.json` compiler assets do not need updates (rvm worker is pure Node.js, no WASM assets to copy)
