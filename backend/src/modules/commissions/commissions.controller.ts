import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { BreakdownResponseDto } from './dto/breakdown-response.dto';

@ApiTags('commissions')
@Controller()
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get('transactions/:id/breakdown')
  @ApiOperation({ summary: 'Get the commission breakdown for a completed transaction' })
  @ApiResponse({ status: 200, type: BreakdownResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not completed or not found' })
  findByTransaction(@Param('id') id: string): Promise<BreakdownResponseDto> {
    return this.service.findByTransactionId(id);
  }
}
