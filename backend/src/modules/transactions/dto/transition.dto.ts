import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STAGES, Stage } from '../state-machine';

export class TransitionDto {
  @ApiProperty({ enum: STAGES, example: 'earnest_money' })
  @IsEnum(STAGES)
  toStage!: Stage;

  @ApiProperty({ required: false, example: 'Earnest money received from buyer' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
