// src/worker/worker.service.ts
import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { LRUCache } from 'lru-cache';
import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import * as process from 'process';

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

  async runInWorker<T>(productId: string, host: string, filePath: string, fileSize): Promise<string> {
    const { v4: uuidv4 } = await import('uuid');
    const taskId = uuidv4();
    this.taskMap.set(taskId, { status: 'pending' });

    const task = async () => {
      const cliPath = process.env.CLI_PATH || '/Users/archersado/workspace/mygit/occt-import-js/build/native/Release/OcctImportJSExample';
      let linearDeflection = 0.1;
      let angularDeflection = 0.05;
      if (fileSize > 1024 * 1024 * 50) { // 如果文件大于1MB
        linearDeflection = 0.2;
        angularDeflection = 0.05;
      }

      if (fileSize > 1024 * 1024 * 100) { // 如果文件大于1MB
        linearDeflection = 0.2;
        angularDeflection = 0.5;
      }

      const args = [filePath, `{"linearUnit":"millimeter","linearDeflection":${linearDeflection},"angularDeflection":${angularDeflection}}`]; // 如果需要传递参数，可以在这里添加
      const process = spawn(cliPath, args);
      
      process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on('close', async (code) => {
        try {
          const resultFilePath = path.join(__dirname, '../result.json');

          if (code === 0) {

            console.log(`任务完成: ${taskId}`);

            // 调用 host 接口上传文件

            const formData = new FormData();
            const fileName = path.basename(filePath);
            formData.append('file', fs.createReadStream(resultFilePath), fileName);
            formData.append('productId', productId);

            try {
              const response = await axios.post(`${host}/product/file/model/parse`, formData, {
                headers: formData.getHeaders(),
              });
              console.log(`文件上传成功: ${response.data}`);
              this.taskMap.delete(taskId);              
            } catch (uploadError) {
              console.error(`文件上传失败: ${uploadError.message}`);
              this.taskMap.delete(taskId);
            }
          } else {
            console.error(`任务失败: ${taskId}, 错误码: ${code}`);
            this.taskMap.delete(taskId);
          }
        } catch (error) {
          this.taskMap.set(taskId, { status: 'completed', result: { error: error.message } });
          console.error(`任务执行出错: ${taskId}, 错误: ${error.message}`);
        } finally {
          this.currentRunningTasks--;
          this.processQueue();
        }
      });

      process.on('error', (error) => {
        this.taskMap.set(taskId, { status: 'completed', result: { error: error.message } });
        console.error(`任务执行出错: ${taskId}, 错误: ${error.message}`);
        this.currentRunningTasks--;
        this.processQueue();
      });
    };

    this.queue.push(task);
    setImmediate(() => {
      this.processQueue();
    });

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