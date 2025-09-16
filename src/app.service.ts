// src/worker/worker.service.ts
import { Injectable } from '@nestjs/common';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { join } from 'path';

@Injectable()
export class WorkerService {
  async runInWorker<T>(workerPath: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(join(__dirname, workerPath), {
        workerData: data,
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}