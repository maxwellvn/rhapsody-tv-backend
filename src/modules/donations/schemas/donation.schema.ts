import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DonationDocument = HydratedDocument<Donation>;

export enum DonationMethod {
  STRIPE = 'stripe',
  ESPEES = 'espees',
}

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Donation {
  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ default: 'usd' })
  currency: string;

  @Prop({ required: true, enum: DonationMethod })
  method: DonationMethod;

  @Prop({ required: true, enum: DonationStatus, default: DonationStatus.PENDING })
  status: DonationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop()
  stripePaymentIntentId?: string;

  @Prop({ trim: true })
  donorName?: string;

  @Prop({ trim: true })
  donorEmail?: string;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// Indexes
DonationSchema.index({ userId: 1 });
DonationSchema.index({ status: 1 });
DonationSchema.index({ method: 1 });
DonationSchema.index({ createdAt: -1 });
DonationSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

DonationSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});
