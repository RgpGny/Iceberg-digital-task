import * as request from 'supertest';
import { bootstrap } from './bootstrap';

describe('Health (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;

  beforeAll(async () => {
    ctx = await bootstrap();
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.mongo.stop();
  });

  it('GET /health returns ok', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
