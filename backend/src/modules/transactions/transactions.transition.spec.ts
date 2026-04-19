import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { CommissionsService } from '../commissions/commissions.service';
import {
  CommissionBreakdown,
  CommissionBreakdownSchema,
} from '../commissions/schemas/commission-breakdown.schema';
import { BusinessError } from '../../common/errors';

describe('TransactionsService.transition', () => {
  let mongo: MongoMemoryServer;
  let service: TransactionsService;
  let commissions: CommissionsService;

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
    commissions = module.get(CommissionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  async function createTx(sameAgent = false) {
    const listing = new Types.ObjectId().toHexString();
    const selling = sameAgent ? listing : new Types.ObjectId().toHexString();
    return service.create({
      property: {
        address: 'Kadıköy',
        type: 'sale',
        listPrice: { amount: 10_000_000, currency: 'TRY' },
      },
      serviceFee: { amount: 1_000_000, currency: 'TRY' },
      listingAgentId: listing,
      sellingAgentId: selling,
    });
  }

  it('walks through the full happy path and writes a breakdown on completion', async () => {
    const tx = await createTx(false);
    const after1 = await service.transition(tx.id, { toStage: 'earnest_money' });
    expect(after1.stage).toBe('earnest_money');
    expect(after1.stageHistory).toHaveLength(2);

    const after2 = await service.transition(tx.id, { toStage: 'title_deed', note: 'deed signed' });
    expect(after2.stage).toBe('title_deed');
    expect(after2.stageHistory.at(-1)?.note).toBe('deed signed');

    const after3 = await service.transition(tx.id, { toStage: 'completed' });
    expect(after3.stage).toBe('completed');
    expect(after3.completedAt).not.toBeNull();

    const breakdown = await commissions.findByTransactionId(tx.id);
    expect(breakdown.scenario).toBe('different_agents');
    expect(breakdown.agencyShare.amount).toBe(500_000);
  });

  it('records the same_agent scenario when listing == selling', async () => {
    const tx = await createTx(true);
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await service.transition(tx.id, { toStage: 'title_deed' });
    await service.transition(tx.id, { toStage: 'completed' });

    const breakdown = await commissions.findByTransactionId(tx.id);
    expect(breakdown.scenario).toBe('same_agent');
    expect(breakdown.agentShares).toHaveLength(1);
    expect(breakdown.agentShares[0].amount.amount).toBe(500_000);
    expect(breakdown.agentShares[0].percentage).toBe(50);
  });

  it('rejects skip-forward transitions with a BusinessError', async () => {
    const tx = await createTx();
    await expect(service.transition(tx.id, { toStage: 'completed' })).rejects.toBeInstanceOf(
      BusinessError,
    );
  });

  it('rejects backward transitions with a BusinessError', async () => {
    const tx = await createTx();
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(
      BusinessError,
    );
  });

  it('rejects a self-transition with a BusinessError', async () => {
    const tx = await createTx();
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(
      BusinessError,
    );
  });

  it('rejects further transitions from completed', async () => {
    const tx = await createTx();
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await service.transition(tx.id, { toStage: 'title_deed' });
    await service.transition(tx.id, { toStage: 'completed' });
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(
      BusinessError,
    );
  });
});
