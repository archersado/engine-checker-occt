import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { LRUCache } from 'lru-cache';

const DEFAULT_RVM_PARSER_PATH = 'S:\\rvmparser\\msvc15\\x64\\Release\\rvmparser.exe';

type TaskResult = { glb?: Buffer; error?: string };
type Task = { status: 'pending' | 'completed'; result?: TaskResult };

@Injectable()
export class RvmService {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private taskMap = new LRUCache<string, Task>({ max: 100 });

  private processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const task = this.queue.shift()!;
    task().finally(() => {
      this.isProcessing = false;
      this.processQueue();
    });
  }

  async submitRvmJob(buffer: Buffer): Promise<string> {
    const taskId = randomUUID();
    this.taskMap.set(taskId, { status: 'pending' });

    this.queue.push(async () => {
      const parserPath = process.env.RVM_PARSER_PATH ?? DEFAULT_RVM_PARSER_PATH;
      const workDir = join(tmpdir(), `rvm-${randomUUID()}`);
      const inputPath = join(workDir, 'input.rvm');
      const outputPath = join(workDir, 'output.glb');

      await mkdir(workDir, { recursive: true });
      try {
        await writeFile(inputPath, buffer);

        await new Promise<void>((resolve, reject) => {
          const proc = spawn(parserPath, [`--output-gltf=${outputPath}`, inputPath]);
          let stderr = '';
          proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
          proc.on('error', (err: NodeJS.ErrnoException) => {
            reject(new Error(
              err.code === 'ENOENT'
                ? `rvmparser executable not found at: ${parserPath}`
                : err.message,
            ));
          });
          proc.on('close', (code) => {
            code === 0
              ? resolve()
              : reject(new Error(`rvmparser exited with code ${code}${stderr ? ': ' + stderr : ''}`));
          });
        });

        const glb = await readFile(outputPath);
        this.taskMap.set(taskId, { status: 'completed', result: { glb } });
      } catch (error) {
        this.taskMap.set(taskId, { status: 'completed', result: { error: (error as Error).message } });
      } finally {
        await rm(workDir, { recursive: true, force: true }).catch(() => {});
      }
    });

    setImmediate(() => this.processQueue());
    return taskId;
  }

  getResult(taskId: string): Task | undefined {
    const task = this.taskMap.get(taskId);
    if (task?.status === 'completed') {
      this.taskMap.delete(taskId);
    }
    return task;
  }
}
