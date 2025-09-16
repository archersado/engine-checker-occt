import { Controller, Post, UploadedFile, UseInterceptors, Inject } from '@nestjs/common';
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
  async occt(@UploadedFile() file: Express.Multer.File): Promise<{data?: Record<string, any>, message?: string}> {
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
    
    try {
      // 文件必须先经过编码转换
      const processedBuffer = processBinaryData(file.buffer);
      
      // 打印处理后的文件内容
      console.log('Processed buffer length:', processedBuffer.byteLength);
      console.log('Processed buffer (first 100 bytes):', new Uint8Array(processedBuffer.slice(0, 100)));
      
      // 如果需要查看文本内容，可以尝试解码
      try {
        const textContent = Buffer.from(processedBuffer).toString('utf8');
        console.log('Processed text content (first 200 chars):', textContent);
      } catch (decodeError) {
        console.log('Cannot decode as text:', (decodeError as Error).message);
      }
      
      const uint8 = new Uint8Array(processedBuffer);
      const result = await this.workerService.runInWorker<{data?: Record<string, any>, message?: string}>(
        './workers/occt.worker.js',
        { data: uint8 },
      );
      return result;
    } catch (error) {
      console.error('Error reading STEP file:', error);
      throw new Error('Failed to read STEP file', error as any);
    }
  }
}