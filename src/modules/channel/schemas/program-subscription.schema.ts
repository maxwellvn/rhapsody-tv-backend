import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProgramSubscriptionDocument = HydratedDocument<ProgramSubscription>;

@Schema({ timestamps: true })
export class ProgramSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Program', required: true, index: true })
  programId: Types.ObjectId;
}

export const ProgramSubscriptionSchema = SchemaFactory.createForClass(ProgramSubscription);

// Compound unique index to prevent duplicate subscriptions
ProgramSubscriptionSchema.index({ userId: 1, programId: 1 }, { unique: true });
