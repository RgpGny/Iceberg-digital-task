import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200 })
  check(): { status: 'ok'; uptime: number; timestamp: string } {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }
}
