import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { ReportsService } from './reports.service';
import {
  CommissionBreakdown,
  CommissionBreakdownSchema,
} from '../commissions/schemas/commission-breakdown.schema';

describe('ReportsService', () => {
  let mongo: MongoMemoryServer;
  let service: ReportsService;
  let model: any;

  const agentA = new Types.ObjectId();
  const agentB = new Types.ObjectId();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [ReportsService],
    }).compile();
    service = module.get(ReportsService);
    model = module.get(`${CommissionBreakdown.name}Model`);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  async function seedBreakdown(
    listing: Types.ObjectId,
    selling: Types.ObjectId,
    totalMinor: number,
  ) {
    const scenario = listing.equals(selling) ? 'same_agent' : 'different_agents';
    const agency = Math.floor(totalMinor / 2);
    const agentPortion = totalMinor - agency;
    const shares =
      scenario === 'same_agent'
        ? [
            {
              agentId: listing,
              role: 'dual',
              amount: { amount: agentPortion, currency: 'TRY' },
              percentage: 50,
              rationale: 'seeded',
            },
          ]
        : [
            {
              agentId: listing,
              role: 'listing',
              amount: { amount: Math.ceil(agentPortion / 2), currency: 'TRY' },
              percentage: 25,
              rationale: 'seeded',
            },
            {
              agentId: selling,
              role: 'selling',
              amount: { amount: Math.floor(agentPortion / 2), currency: 'TRY' },
              percentage: 25,
              rationale: 'seeded',
            },
          ];
    await model.create({
      transactionId: new Types.ObjectId(),
      totalFee: { amount: totalMinor, currency: 'TRY' },
      agencyShare: { amount: agency, currency: 'TRY' },
      agentShares: shares,
      scenario,
    });
  }

  it('aggregates agency and per-agent earnings across breakdowns', async () => {
    await seedBreakdown(agentA, agentB, 1_000_000);
    await seedBreakdown(agentA, agentA, 2_000_000);

    const report = await service.getEarnings({});
    expect(report.agencyTotal.amount).toBe(1_500_000);
    const byId = new Map(report.agents.map((a) => [a.agentId, a]));
    expect(byId.get(String(agentA))!.total.amount).toBe(1_250_000);
    expect(byId.get(String(agentA))!.transactionCount).toBe(2);
    expect(byId.get(String(agentB))!.total.amount).toBe(250_000);
  });

  it('filters by agentId (only that agent appears)', async () => {
    const report = await service.getEarnings({ agentId: String(agentB) });
    expect(report.agents).toHaveLength(1);
    expect(report.agents[0].agentId).toBe(String(agentB));
  });
});
