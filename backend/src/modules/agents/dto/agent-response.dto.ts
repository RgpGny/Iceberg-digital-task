import { ApiProperty } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  id!: string;

  @ApiProperty({ example: 'Ayşe Yılmaz' })
  name!: string;

  @ApiProperty({ example: 'ayse@iceberg.example' })
  email!: string;

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  createdAt!: string;
}
