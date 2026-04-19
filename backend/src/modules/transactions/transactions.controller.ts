import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { STAGES } from './state-machine';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction (starts in agreement stage)' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  create(@Body() dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions, optionally filtered by stage' })
  @ApiQuery({ name: 'stage', required: false, enum: STAGES })
  @ApiResponse({ status: 200, type: TransactionResponseDto, isArray: true })
  findAll(@Query('stage') stage?: string): Promise<TransactionResponseDto[]> {
    return this.service.findAll(stage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction with its stage history' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  findById(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.service.findById(id);
  }
}
