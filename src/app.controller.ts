import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import occtImport from 'occt-import-js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/occt')
  @UseInterceptors(FileInterceptor('file'))
  async occt(@UploadedFile() file: Express.Multer.File): Promise<{data?: Record<string, any>, message?: string}> {
    if (!file) {
      throw new Error('No file uploaded');
    }
    try {
      const occt = await occtImport();
      let result = occt.ReadStepFile(file.buffer, null);
      return result;
    } catch (error) {
      console.error('Error reading STEP file:', error);
      throw new Error('Failed to read STEP file', error);
    }
  }
}
