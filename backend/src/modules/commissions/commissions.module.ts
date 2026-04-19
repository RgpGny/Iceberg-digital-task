import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionBreakdown, CommissionBreakdownSchema } from './schemas/commission-breakdown.schema';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
    ]),
  ],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
