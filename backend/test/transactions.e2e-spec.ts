import * as request from 'supertest';
import { bootstrap } from './bootstrap';

describe('Transactions (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;
  let listingId: string;
  let sellingId: string;

  beforeAll(async () => {
    ctx = await bootstrap();
    const a1 = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'A One', email: 'a1@ex.com' });
    const a2 = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'A Two', email: 'a2@ex.com' });
    listingId = a1.body.id;
    sellingId = a2.body.id;
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.mongo.stop();
  });

  it('creates a transaction and walks it through all stages', async () => {
    const create = await request(ctx.app.getHttpServer())
      .post('/transactions')
      .send({
        property: {
          address: 'Kadıköy',
          type: 'sale',
          listPrice: { amount: 10_000_000, currency: 'GBP' },
        },
        serviceFee: { amount: 1_000_000, currency: 'GBP' },
        listingAgentId: listingId,
        sellingAgentId: sellingId,
      })
      .expect(201);
    const id = create.body.id;

    for (const stage of ['earnest_money', 'title_deed', 'completed']) {
      await request(ctx.app.getHttpServer())
        .post(`/transactions/${id}/transition`)
        .send({ toStage: stage })
        .expect(200);
    }

    const breakdown = await request(ctx.app.getHttpServer())
      .get(`/transactions/${id}/breakdown`)
      .expect(200);
    expect(breakdown.body.scenario).toBe('different_agents');
    expect(breakdown.body.agencyShare.amount).toBe(500_000);
  });

  it('returns 400 when trying to skip forward', async () => {
    const create = await request(ctx.app.getHttpServer())
      .post('/transactions')
      .send({
        property: {
          address: 'Bakırköy',
          type: 'sale',
          listPrice: { amount: 5_000_000, currency: 'GBP' },
        },
        serviceFee: { amount: 500_000, currency: 'GBP' },
        listingAgentId: listingId,
        sellingAgentId: sellingId,
      });
    await request(ctx.app.getHttpServer())
      .post(`/transactions/${create.body.id}/transition`)
      .send({ toStage: 'completed' })
      .expect(400)
      .expect((r) => {
        expect(r.body.code).toBe('invalid_transition');
      });
  });
});
