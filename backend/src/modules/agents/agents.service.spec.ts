import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Agent, AgentSchema } from './schemas/agent.schema';

describe('AgentsService', () => {
  let mongo: MongoMemoryServer;
  let service: AgentsService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
      ],
      providers: [AgentsService],
    }).compile();
    service = module.get(AgentsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('creates an agent and returns a response DTO with id', async () => {
    const dto = await service.create({ name: 'Ayşe', email: 'ayse@example.com' });
    expect(dto).toMatchObject({ name: 'Ayşe', email: 'ayse@example.com' });
    expect(dto.id).toBeDefined();
    expect(dto.createdAt).toBeDefined();
  });

  it('lists agents in creation order', async () => {
    const list = await service.findAll();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].email).toBe('ayse@example.com');
  });

  it('returns NotFoundException for a non-existent id', async () => {
    await expect(service.findById('000000000000000000000000')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns NotFoundException for a malformed id', async () => {
    await expect(service.findById('not-a-valid-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
