import { Controller, Get, Header, UseGuards } from '@nestjs/common';

import crypto from 'crypto';

import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';

type WatermarkResponse = {
  hiddenText: string;
  issuedAt: string;
};

type BuildWatermarkTokenParams = {
  userId: string;
  email: string;
  issuedAt: string;
  secret: string;
};

const buildWatermarkToken = ({
  userId,
  email,
  issuedAt,
  secret,
}: BuildWatermarkTokenParams): string => {
  const base = `${userId}|${email}|${issuedAt}`;
  const hash = crypto.createHmac('sha256', secret).update(base).digest('hex');
  return `WM:${hash.slice(0, 32)}`;
};

@Controller('watermark')
@UseGuards(JwtAuthGuard)
export class WatermarkController {
  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  getWatermark(@AuthUser() user: UserEntity): WatermarkResponse {
    const issuedAt = new Date().toISOString();
    const secret = this.twentyConfigService.get('APP_SECRET');
    const token = buildWatermarkToken({
      userId: user.id,
      email: user.email,
      issuedAt,
      secret,
    });

    return {
      hiddenText: `${token} ${issuedAt}`,
      issuedAt,
    };
  }
}
