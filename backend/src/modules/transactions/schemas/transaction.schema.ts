import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { STAGES, Stage } from '../state-machine';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ _id: false })
export class MoneyEmbedded {
  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'TRY' })
  currency!: 'TRY';
}
export const MoneyEmbeddedSchema = SchemaFactory.createForClass(MoneyEmbedded);

@Schema({ _id: false })
export class PropertyEmbedded {
  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true, enum: ['sale', 'rental'] })
  type!: 'sale' | 'rental';

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  listPrice!: MoneyEmbedded;
}
export const PropertyEmbeddedSchema = SchemaFactory.createForClass(PropertyEmbedded);

@Schema({ _id: false })
export class StageHistoryEntry {
  @Prop({ required: false, enum: STAGES, default: null, type: String })
  from!: Stage | null;

  @Prop({ required: true, enum: STAGES })
  to!: Stage;

  @Prop({ required: true })
  at!: Date;

  @Prop({ required: false })
  note?: string;
}
export const StageHistoryEntrySchema = SchemaFactory.createForClass(StageHistoryEntry);

@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
  @Prop({ required: true, type: PropertyEmbeddedSchema })
  property!: PropertyEmbedded;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  serviceFee!: MoneyEmbedded;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  listingAgentId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  sellingAgentId!: Types.ObjectId;

  @Prop({ required: true, enum: STAGES, default: 'agreement' })
  stage!: Stage;

  @Prop({ required: true, type: [StageHistoryEntrySchema], default: [] })
  stageHistory!: StageHistoryEntry[];

  @Prop({ required: false, type: Date, default: null })
  completedAt!: Date | null;
}
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
