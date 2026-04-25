import { Injectable } from '@nestjs/common';
import { WorkerService } from '../app.service';

@Injectable()
export class RvmService {
  constructor(private readonly workerService: WorkerService) {}

  submitRvmJob(buffer: Buffer): Promise<string> {
    return this.workerService.runInWorker('./workers/rvm.worker.js', { data: buffer });
  }

  getResult(taskId: string) {
    return this.workerService.getTaskResult(taskId);
  }
}
