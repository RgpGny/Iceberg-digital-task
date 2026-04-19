import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransitionDto } from './dto/transition.dto';
import { assertValidTransition, isTerminal } from './state-machine';
import { CommissionsService } from '../commissions/commissions.service';
import { Money } from '../../common/money';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
    private readonly commissions: CommissionsService,
  ) {}

  async create(dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const now = new Date();
    const created = await this.txModel.create({
      property: dto.property,
      serviceFee: dto.serviceFee,
      listingAgentId: new Types.ObjectId(dto.listingAgentId),
      sellingAgentId: new Types.ObjectId(dto.sellingAgentId),
      stage: 'agreement',
      stageHistory: [{ from: null, to: 'agreement', at: now }],
      completedAt: null,
    });
    return this.toResponse(created);
  }

  async findAll(stage?: string): Promise<TransactionResponseDto[]> {
    const filter = stage ? { stage } : {};
    const docs = await this.txModel.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toResponse(d));
  }

  async findById(id: string): Promise<TransactionResponseDto> {
    const doc = await this.getDocumentOrFail(id);
    return this.toResponse(doc);
  }

  async transition(id: string, dto: TransitionDto): Promise<TransactionResponseDto> {
    const doc = await this.getDocumentOrFail(id);

    assertValidTransition(doc.stage, dto.toStage);

    const now = new Date();
    doc.stageHistory.push({ from: doc.stage, to: dto.toStage, at: now, note: dto.note });
    doc.stage = dto.toStage;

    if (isTerminal(dto.toStage)) {
      doc.completedAt = now;
      await doc.save();
      await this.commissions.writeForTransaction({
        transactionId: doc._id as Types.ObjectId,
        totalFee: Money.of(doc.serviceFee.amount, doc.serviceFee.currency),
        listingAgentId: doc.listingAgentId,
        sellingAgentId: doc.sellingAgentId,
      });
    } else {
      await doc.save();
    }

    return this.toResponse(doc);
  }

  private async getDocumentOrFail(id: string): Promise<TransactionDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    const doc = await this.txModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    return doc;
  }

  private toResponse(doc: TransactionDocument): TransactionResponseDto {
    const plain = doc.toObject({ versionKey: false });
    return {
      id: String(plain._id),
      property: plain.property,
      serviceFee: plain.serviceFee,
      listingAgentId: String(plain.listingAgentId),
      sellingAgentId: String(plain.sellingAgentId),
      stage: plain.stage,
      stageHistory: plain.stageHistory.map(
        (h: { from: string | null; to: string; at: Date; note?: string }) => ({
          from: h.from as TransactionResponseDto['stageHistory'][number]['from'],
          to: h.to as TransactionResponseDto['stageHistory'][number]['to'],
          at: h.at.toISOString(),
          note: h.note,
        }),
      ),
      completedAt: plain.completedAt ? plain.completedAt.toISOString() : null,
      createdAt: (plain as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
