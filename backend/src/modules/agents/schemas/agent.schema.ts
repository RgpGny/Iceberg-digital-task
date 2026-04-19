import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ collection: 'agents', timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email!: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
