import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoneyDto {
  @ApiProperty({ example: 1_000_000, description: 'Amount in minor units (kuruş)' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'TRY', enum: ['TRY'] })
  @IsEnum(['TRY'])
  currency!: 'TRY';
}

export class PropertyDto {
  @ApiProperty({ example: 'Kadıköy, Istanbul' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ enum: ['sale', 'rental'] })
  @IsEnum(['sale', 'rental'])
  type!: 'sale' | 'rental';

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  listPrice!: MoneyDto;
}

export class CreateTransactionDto {
  @ApiProperty({ type: PropertyDto })
  @ValidateNested()
  @Type(() => PropertyDto)
  property!: PropertyDto;

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  serviceFee!: MoneyDto;

  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  @IsMongoId()
  listingAgentId!: string;

  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  @IsMongoId()
  sellingAgentId!: string;
}
