import * as request from 'supertest';
import { bootstrap } from './bootstrap';

describe('Agents (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;

  beforeAll(async () => {
    ctx = await bootstrap();
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.mongo.stop();
  });

  it('creates and lists agents', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'Ayşe Yılmaz', email: 'ayse@iceberg.example' })
      .expect(201);
    expect(created.body.id).toBeDefined();

    const list = await request(ctx.app.getHttpServer()).get('/agents').expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects invalid email with 400 and structured error', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'Invalid', email: 'not-an-email' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});
