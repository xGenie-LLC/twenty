import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';

import { WatermarkController } from './controllers/watermark.controller';

@Module({
  imports: [TokenModule, WorkspaceCacheStorageModule],
  controllers: [WatermarkController],
})
export class WatermarkModule {}
