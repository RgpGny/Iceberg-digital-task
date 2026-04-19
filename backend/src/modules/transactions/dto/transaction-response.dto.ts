import { ApiProperty } from '@nestjs/swagger';
import { Stage } from '../state-machine';
import { MoneyDto, PropertyDto } from './create-transaction.dto';

export class StageHistoryDto {
  @ApiProperty({ nullable: true, example: 'agreement' })
  from!: Stage | null;

  @ApiProperty({ example: 'earnest_money' })
  to!: Stage;

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  at!: string;

  @ApiProperty({ required: false })
  note?: string;
}

export class TransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: PropertyDto })
  property!: PropertyDto;

  @ApiProperty({ type: MoneyDto })
  serviceFee!: MoneyDto;

  @ApiProperty()
  listingAgentId!: string;

  @ApiProperty()
  sellingAgentId!: string;

  @ApiProperty({ example: 'agreement' })
  stage!: Stage;

  @ApiProperty({ type: StageHistoryDto, isArray: true })
  stageHistory!: StageHistoryDto[];

  @ApiProperty({ nullable: true, example: null })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
