import { IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EarningsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by agent id' })
  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound on completedAt (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Exclusive upper bound on completedAt (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
