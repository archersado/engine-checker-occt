import { Controller, Post, UploadedFile, UseInterceptors, Get, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as encoding from 'encoding';
import { WorkerService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly workerService: WorkerService,
  ) {}

  @Post('/occt')
  @UseInterceptors(FileInterceptor('file'))
  async occt(@UploadedFile() file: Express.Multer.File): Promise<{ taskId: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const processBinaryData = (buffer: Buffer) => {
      try {
        // 1. 用GBK解码二进制数据为文本
        const decodedText = encoding.convert(buffer, 'utf8', 'gbk').toString();
        
        // 2. 将解码后的文本重新编码为UTF-8
        const encodedBuffer = Buffer.from(decodedText, 'utf8');
        
        // 3. 返回ArrayBuffer
        return encodedBuffer.buffer;
      } catch (error) {
        console.error('GBK解码或编码过程出错:', error);
        throw error; // 抛出错误让上层处理
      }
    };

    // 文件必须先经过编码转换
    const processedBuffer = processBinaryData(file.buffer);
    const uint8 = new Uint8Array(processedBuffer);
    const taskId = await this.workerService.runInWorker(
      './workers/occt.worker.js',
      { data: uint8 },
    );
    return { taskId };
  }

  @Get('/occt/status')
  getTaskStatus(@Query('taskId') taskId: string): { status: 'pending' | 'completed'; result?: any } {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    const taskResult = this.workerService.getTaskResult(taskId);
    if (!taskResult) {
      throw new Error('Task not found');
    }

    return taskResult;
  }
}