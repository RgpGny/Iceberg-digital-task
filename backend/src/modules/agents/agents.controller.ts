import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an agent' })
  @ApiResponse({ status: 201, type: AgentResponseDto })
  create(@Body() dto: CreateAgentDto): Promise<AgentResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  @ApiResponse({ status: 200, type: AgentResponseDto, isArray: true })
  findAll(): Promise<AgentResponseDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by id' })
  @ApiResponse({ status: 200, type: AgentResponseDto })
  findById(@Param('id') id: string): Promise<AgentResponseDto> {
    return this.service.findById(id);
  }
}
