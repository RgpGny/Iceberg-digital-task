import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MoneyEmbedded, MoneyEmbeddedSchema } from '../../transactions/schemas/transaction.schema';

export type CommissionBreakdownDocument = HydratedDocument<CommissionBreakdown>;

@Schema({ _id: false })
export class AgentShareEmbedded {
  @Prop({ required: true, type: Types.ObjectId })
  agentId!: Types.ObjectId;

  @Prop({ required: true, enum: ['listing', 'selling', 'dual'] })
  role!: 'listing' | 'selling' | 'dual';

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  amount!: MoneyEmbedded;

  @Prop({ required: true })
  percentage!: number;

  @Prop({ required: true })
  rationale!: string;
}
export const AgentShareEmbeddedSchema = SchemaFactory.createForClass(AgentShareEmbedded);

@Schema({
  collection: 'commission_breakdowns',
  timestamps: { createdAt: 'computedAt', updatedAt: false },
})
export class CommissionBreakdown {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Transaction', unique: true })
  transactionId!: Types.ObjectId;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  totalFee!: MoneyEmbedded;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  agencyShare!: MoneyEmbedded;

  @Prop({ required: true, type: [AgentShareEmbeddedSchema], default: [] })
  agentShares!: AgentShareEmbedded[];

  @Prop({ required: true, enum: ['same_agent', 'different_agents'] })
  scenario!: 'same_agent' | 'different_agents';
}

export const CommissionBreakdownSchema = SchemaFactory.createForClass(CommissionBreakdown);
