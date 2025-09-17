// src/worker/worker.service.ts
import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LRUCache } from 'lru-cache';

@Injectable()
export class WorkerService {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private currentRunningTasks = 0;
  private maxConcurrentTasks = 1; // 设置最大并发任务数
  private taskMap = new LRUCache<string, { status: 'pending' | 'completed'; result?: any }>({ max: 100 });

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || this.currentRunningTasks >= this.maxConcurrentTasks) {
      console.log('任务执行中或达到最大并发限制');
      return;
    }

    this.isProcessing = true;
    while (this.queue.length > 0 && this.currentRunningTasks < this.maxConcurrentTasks) {
      const task = this.queue.shift();
      if (task) {
        this.currentRunningTasks++;
        await task();
      }
    }
    this.isProcessing = false;
    this.processQueue();
  }

  async runInWorker<T>(workerPath: string, data?: any): Promise<string> {
    const taskId = uuidv4();
    this.taskMap.set(taskId, { status: 'pending' });

    const task = async () => {
      const worker = new Worker(join(__dirname, workerPath), {
        workerData: data,
      });

      worker.on('message', (message) => {
        this.taskMap.set(taskId, { status: 'completed', result: message });
        console.log('Checking taskId:', taskId);
        console.log('Current taskMap keys:', Array.from(this.taskMap.keys()));
        this.currentRunningTasks--;
        console.log('任务完成，当前运行任务数:', this.currentRunningTasks);        
      });
      worker.on('error', (error) => {
        this.taskMap.set(taskId, { status: 'completed', result: { error } });
        console.log('Checking taskId:', taskId);
        console.log('Current taskMap keys:', Array.from(this.taskMap.keys()));
        this.currentRunningTasks--;
        console.log('任务完成，当前运行任务数:', this.currentRunningTasks);        
      });
      worker.on('exit', (code) => {
        if (code !== 0) {
          this.taskMap.set(taskId, { status: 'completed', result: { error: `Worker stopped with exit code ${code}` } });
          console.log('Checking taskId:', taskId);
          console.log('Current taskMap keys:', Array.from(this.taskMap.keys()));
          this.currentRunningTasks--;
          console.log('任务完成，当前运行任务数:', this.currentRunningTasks);          
        }
      });
    };

    this.queue.push(task);
    this.processQueue();

    return taskId;
  }

  getTaskResult(taskId: string): { status: 'pending' | 'completed'; result?: any } | undefined {
    console.log('Checking taskId:', taskId);
    console.log('Current taskMap keys:', Array.from(this.taskMap.keys()));

    const task = this.taskMap.get(taskId);
    if (task?.status === 'completed') {
      this.taskMap.delete(taskId);
    }
    return task;
  }
}