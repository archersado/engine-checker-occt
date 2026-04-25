import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { WorkerService } from './app.service';
import { RvmModule } from './rvm/rvm.module';

@Module({
  imports: [RvmModule],
  controllers: [AppController],
  providers: [
    WorkerService,
  ],
})
export class AppModule {}
