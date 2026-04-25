import { Module } from '@nestjs/common';
import { RvmController } from './rvm.controller';
import { RvmService } from './rvm.service';
import { WorkerService } from '../app.service';

@Module({
  controllers: [RvmController],
  providers: [RvmService, WorkerService],
})
export class RvmModule {}
