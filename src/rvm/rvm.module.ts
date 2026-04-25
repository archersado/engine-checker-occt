import { Module } from '@nestjs/common';
import { RvmController } from './rvm.controller';
import { RvmService } from './rvm.service';

@Module({
  controllers: [RvmController],
  providers: [RvmService],
})
export class RvmModule {}
