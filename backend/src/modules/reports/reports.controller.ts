import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { EarningsReportDto } from './dto/earnings-response.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('earnings')
  @ApiOperation({ summary: 'Aggregate agency and agent earnings from completed transactions' })
  @ApiResponse({ status: 200, type: EarningsReportDto })
  getEarnings(@Query() query: EarningsQueryDto): Promise<EarningsReportDto> {
    return this.service.getEarnings(query);
  }
}
