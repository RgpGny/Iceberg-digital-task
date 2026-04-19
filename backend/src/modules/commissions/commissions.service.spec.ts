import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommissionsService } from './commissions.service';
import { CommissionBreakdown, CommissionBreakdownSchema } from './schemas/commission-breakdown.schema';
import { Money } from '../../common/money';

describe('CommissionsService', () => {
  let mongo: MongoMemoryServer;
  let service: CommissionsService;

  const txId = new Types.ObjectId();
  const listing = new Types.ObjectId();
  const selling = new Types.ObjectId();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [CommissionsService],
    }).compile();
    service = module.get(CommissionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('writes a breakdown for a different-agents scenario', async () => {
    const dto = await service.writeForTransaction({
      transactionId: txId,
      totalFee: Money.of(1_000_000, 'TRY'),
      listingAgentId: listing,
      sellingAgentId: selling,
    });
    expect(dto.scenario).toBe('different_agents');
    expect(dto.agencyShare.amount).toBe(500_000);
    expect(dto.agentShares).toHaveLength(2);
    expect(dto.agentShares.map((s) => s.amount.amount)).toEqual([250_000, 250_000]);
  });

  it('refuses to recompute for the same transaction (immutability)', async () => {
    await expect(
      service.writeForTransaction({
        transactionId: txId,
        totalFee: Money.of(2_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a breakdown by transactionId', async () => {
    const dto = await service.findByTransactionId(String(txId));
    expect(dto.transactionId).toBe(String(txId));
  });

  it('returns NotFoundException for an unknown transactionId', async () => {
    await expect(service.findByTransactionId(String(new Types.ObjectId()))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns NotFoundException for a malformed transactionId', async () => {
    await expect(service.findByTransactionId('not-an-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
