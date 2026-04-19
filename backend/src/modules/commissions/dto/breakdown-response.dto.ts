import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../transactions/dto/create-transaction.dto';

export class AgentShareResponseDto {
  @ApiProperty()
  agentId!: string;

  @ApiProperty({ enum: ['listing', 'selling', 'dual'] })
  role!: 'listing' | 'selling' | 'dual';

  @ApiProperty({ type: MoneyDto })
  amount!: MoneyDto;

  @ApiProperty({ example: 25 })
  percentage!: number;

  @ApiProperty()
  rationale!: string;
}

export class BreakdownResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  transactionId!: string;

  @ApiProperty({ type: MoneyDto })
  totalFee!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  agencyShare!: MoneyDto;

  @ApiProperty({ type: AgentShareResponseDto, isArray: true })
  agentShares!: AgentShareResponseDto[];

  @ApiProperty({ enum: ['same_agent', 'different_agents'] })
  scenario!: 'same_agent' | 'different_agents';

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  computedAt!: string;
}
