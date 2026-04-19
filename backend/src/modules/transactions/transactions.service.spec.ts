import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { CommissionsService } from '../commissions/commissions.service';
import {
  CommissionBreakdown,
  CommissionBreakdownSchema,
} from '../commissions/schemas/commission-breakdown.schema';

describe('TransactionsService', () => {
  let mongo: MongoMemoryServer;
  let service: TransactionsService;
  const listingId = new Types.ObjectId().toHexString();
  const sellingId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: Transaction.name, schema: TransactionSchema },
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [TransactionsService, CommissionsService],
    }).compile();
    service = module.get(TransactionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('creates a transaction at the agreement stage with a history entry', async () => {
    const tx = await service.create({
      property: {
        address: 'Kadıköy',
        type: 'sale',
        listPrice: { amount: 10_000_000, currency: 'TRY' },
      },
      serviceFee: { amount: 1_000_000, currency: 'TRY' },
      listingAgentId: listingId,
      sellingAgentId: sellingId,
    });
    expect(tx.stage).toBe('agreement');
    expect(tx.stageHistory).toHaveLength(1);
    expect(tx.stageHistory[0]).toMatchObject({ from: null, to: 'agreement' });
    expect(tx.completedAt).toBeNull();
  });

  it('lists transactions newest first', async () => {
    const list = await service.findAll();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].stage).toBe('agreement');
  });

  it('rejects malformed ids with NotFoundException', async () => {
    await expect(service.findById('xxx')).rejects.toBeInstanceOf(NotFoundException);
  });
});
