import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const DEFAULT_RVM_PARSER_PATH = 'S:\\rvmparser\\msvc15\\x64\\Release\\rvmparser.exe';

async function run() {
  const { data } = workerData as { data: Uint8Array };
  const parserPath = process.env.RVM_PARSER_PATH ?? DEFAULT_RVM_PARSER_PATH;
  const jobId = randomUUID();
  const workDir = join(tmpdir(), `rvm-${jobId}`);
  const inputPath = join(workDir, 'input.rvm');
  const outputPath = join(workDir, 'output.glb');

  await mkdir(workDir, { recursive: true });

  try {
    await writeFile(inputPath, data);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(parserPath, [`--output-gltf=${outputPath}`, inputPath]);

      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err: NodeJS.ErrnoException) => {
        reject(new Error(
          err.code === 'ENOENT'
            ? `rvmparser executable not found at: ${parserPath}`
            : err.message,
        ));
      });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`rvmparser exited with code ${code}${stderr ? ': ' + stderr : ''}`));
        }
      });
    });

    const glbBuffer = await readFile(outputPath);
    parentPort?.postMessage({ glb: glbBuffer });
  } catch (error) {
    parentPort?.postMessage({ error: (error as Error).message });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

run();
