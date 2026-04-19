import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { QueryFilter } from 'mongoose';
import {
  CommissionBreakdown,
  CommissionBreakdownDocument,
} from '../commissions/schemas/commission-breakdown.schema';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { EarningsReportDto } from './dto/earnings-response.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(CommissionBreakdown.name)
    private readonly model: Model<CommissionBreakdownDocument>,
  ) {}

  async getEarnings(query: EarningsQueryDto): Promise<EarningsReportDto> {
    const filter: QueryFilter<CommissionBreakdownDocument> = {};
    if (query.from || query.to) {
      filter.computedAt = {};
      if (query.from) filter.computedAt.$gte = new Date(query.from);
      if (query.to) filter.computedAt.$lt = new Date(query.to);
    }
    if (query.agentId) {
      filter['agentShares.agentId'] = new Types.ObjectId(query.agentId);
    }

    const docs = await this.model.find(filter).lean().exec();

    let agencyAmount = 0;
    const byAgent = new Map<string, { amount: number; count: number }>();
    for (const doc of docs) {
      agencyAmount += doc.agencyShare.amount;
      for (const share of doc.agentShares) {
        const id = String(share.agentId);
        if (query.agentId && id !== query.agentId) continue;
        const prev = byAgent.get(id) ?? { amount: 0, count: 0 };
        byAgent.set(id, { amount: prev.amount + share.amount.amount, count: prev.count + 1 });
      }
    }

    return {
      agencyTotal: { amount: agencyAmount, currency: 'GBP' },
      agents: [...byAgent.entries()].map(([agentId, v]) => ({
        agentId,
        total: { amount: v.amount, currency: 'GBP' },
        transactionCount: v.count,
      })),
    };
  }
}
