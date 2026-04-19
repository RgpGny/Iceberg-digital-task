import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Agent, AgentDocument } from './schemas/agent.schema';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@Injectable()
export class AgentsService {
  constructor(@InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>) {}

  async create(dto: CreateAgentDto): Promise<AgentResponseDto> {
    const created = await this.agentModel.create({ name: dto.name, email: dto.email });
    return this.toResponse(created);
  }

  async findAll(): Promise<AgentResponseDto[]> {
    const agents = await this.agentModel.find().sort({ createdAt: 1 }).lean().exec();
    return agents.map((a) => ({
      id: String(a._id),
      name: a.name,
      email: a.email,
      createdAt: (a as unknown as { createdAt: Date }).createdAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<AgentResponseDto> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return this.toResponse(agent);
  }

  private toResponse(doc: AgentDocument): AgentResponseDto {
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
