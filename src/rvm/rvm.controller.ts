import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Query,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { RvmService } from './rvm.service';

@Controller()
export class RvmController {
  constructor(private readonly rvmService: RvmService) {}

  @Post('/rvm')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRvm(@UploadedFile() file: Express.Multer.File): Promise<{ taskId: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const taskId = await this.rvmService.submitRvmJob(file.buffer);
    return { taskId };
  }

  @Get('/rvm/status')
  async getRvmStatus(
    @Query('taskId') taskId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!taskId) {
      throw new BadRequestException('taskId is required');
    }

    const task = this.rvmService.getResult(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === 'pending') {
      res.json({ status: 'pending' });
      return;
    }

    const result = task.result as { glb?: Buffer; error?: string };

    if (result?.error) {
      res.json({ status: 'error', message: result.error });
      return;
    }

    if (result?.glb) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', 'attachment; filename=model.glb');
      res.send(result.glb);
      return;
    }

    res.json({ status: 'error', message: 'Unknown result format' });
  }
}
