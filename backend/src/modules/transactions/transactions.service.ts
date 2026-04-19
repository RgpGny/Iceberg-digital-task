import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
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
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    const doc = await this.txModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    return this.toResponse(doc);
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
      stageHistory: plain.stageHistory.map((h: { from: string | null; to: string; at: Date; note?: string }) => ({
        from: h.from,
        to: h.to,
        at: h.at.toISOString(),
        note: h.note,
      })) as TransactionResponseDto['stageHistory'],
      completedAt: plain.completedAt ? plain.completedAt.toISOString() : null,
      createdAt: (plain as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
