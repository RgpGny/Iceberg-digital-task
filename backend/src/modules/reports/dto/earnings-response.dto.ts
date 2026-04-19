import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../transactions/dto/create-transaction.dto';

export class AgentEarningsDto {
  @ApiProperty()
  agentId!: string;

  @ApiProperty({ type: MoneyDto })
  total!: MoneyDto;

  @ApiProperty({ example: 12 })
  transactionCount!: number;
}

export class EarningsReportDto {
  @ApiProperty({ type: MoneyDto })
  agencyTotal!: MoneyDto;

  @ApiProperty({ type: AgentEarningsDto, isArray: true })
  agents!: AgentEarningsDto[];
}
