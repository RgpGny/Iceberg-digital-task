import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import {
  CommissionBreakdown,
  CommissionBreakdownDocument,
} from './schemas/commission-breakdown.schema';
import { BreakdownResponseDto } from './dto/breakdown-response.dto';
import { compute, CommissionResult } from './engine';
import { Money } from '../../common/money';

export interface WriteBreakdownInput {
  transactionId: Types.ObjectId;
  totalFee: Money;
  listingAgentId: Types.ObjectId;
  sellingAgentId: Types.ObjectId;
}

@Injectable()
export class CommissionsService {
  constructor(
    @InjectModel(CommissionBreakdown.name)
    private readonly model: Model<CommissionBreakdownDocument>,
  ) {}

  async writeForTransaction(input: WriteBreakdownInput): Promise<BreakdownResponseDto> {
    const existing = await this.model.findOne({ transactionId: input.transactionId }).exec();
    if (existing) {
      throw new ConflictException(
        `Commission breakdown already exists for transaction ${String(input.transactionId)}`,
      );
    }

    const result: CommissionResult = compute({
      totalFee: input.totalFee,
      listingAgentId: String(input.listingAgentId),
      sellingAgentId: String(input.sellingAgentId),
    });

    const doc = await this.model.create({
      transactionId: input.transactionId,
      totalFee: { amount: result.totalFee.amount, currency: result.totalFee.currency },
      agencyShare: { amount: result.agencyShare.amount, currency: result.agencyShare.currency },
      agentShares: result.agentShares.map((s) => ({
        agentId: new Types.ObjectId(s.agentId),
        role: s.role,
        amount: { amount: s.amount.amount, currency: s.amount.currency },
        percentage: s.percentage,
        rationale: s.rationale,
      })),
      scenario: result.scenario,
    });

    return this.toResponse(doc);
  }

  async findByTransactionId(transactionId: string): Promise<BreakdownResponseDto> {
    if (!isValidObjectId(transactionId)) {
      throw new NotFoundException(`Breakdown for transaction ${transactionId} not found`);
    }
    const doc = await this.model
      .findOne({ transactionId: new Types.ObjectId(transactionId) })
      .exec();
    if (!doc) {
      throw new NotFoundException(`Breakdown for transaction ${transactionId} not found`);
    }
    return this.toResponse(doc);
  }

  private toResponse(doc: CommissionBreakdownDocument): BreakdownResponseDto {
    const plain = doc.toObject({ versionKey: false });
    return {
      id: String(plain._id),
      transactionId: String(plain.transactionId),
      totalFee: plain.totalFee,
      agencyShare: plain.agencyShare,
      agentShares: plain.agentShares.map(
        (s: {
          agentId: Types.ObjectId;
          role: string;
          amount: { amount: number; currency: 'TRY' };
          percentage: number;
          rationale: string;
        }) => ({
          agentId: String(s.agentId),
          role: s.role as 'listing' | 'selling' | 'dual',
          amount: s.amount,
          percentage: s.percentage,
          rationale: s.rationale,
        }),
      ),
      scenario: plain.scenario,
      computedAt: (plain as unknown as { computedAt: Date }).computedAt.toISOString(),
    };
  }
}
