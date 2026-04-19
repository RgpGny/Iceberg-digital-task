import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AgentsModule } from '../src/modules/agents/agents.module';
import { TransactionsModule } from '../src/modules/transactions/transactions.module';
import { CommissionsModule } from '../src/modules/commissions/commissions.module';
import { ReportsModule } from '../src/modules/reports/reports.module';
import { HealthModule } from '../src/health/health.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export async function bootstrap(): Promise<{ app: INestApplication; mongo: MongoMemoryServer }> {
  const mongo = await MongoMemoryServer.create();
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      MongooseModule.forRootAsync({
        inject: [ConfigService],
        useFactory: () => ({ uri: mongo.getUri() }),
      }),
      HealthModule,
      AgentsModule,
      TransactionsModule,
      CommissionsModule,
      ReportsModule,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  return { app, mongo };
}
