import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ConfigType } from '@nestjs/config';
import Stripe from 'stripe';
import stripeConfig from '../../config/stripe.config';
import {
  Donation,
  DonationDocument,
  DonationMethod,
  DonationStatus,
} from './schemas/donation.schema';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateEspeesDonationDto } from './dto/create-espees-donation.dto';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);
  private stripe: Stripe | null = null;

  constructor(
    @InjectModel(Donation.name)
    private readonly donationModel: Model<DonationDocument>,
    @Inject(stripeConfig.KEY)
    private readonly config: ConfigType<typeof stripeConfig>,
  ) {
    if (this.config.secretKey) {
      this.stripe = new Stripe(this.config.secretKey);
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not configured. Stripe payment features will be unavailable.',
      );
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_SECRET_KEY.',
      );
    }
    return this.stripe;
  }

  async createPaymentIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
  ) {
    const currency = dto.currency || 'usd';
    const amountInCents = Math.round(dto.amount * 100);

    const paymentIntent = await this.getStripe().paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: { userId },
    });

    const donation = await this.donationModel.create({
      amount: dto.amount,
      currency,
      method: DonationMethod.STRIPE,
      status: DonationStatus.PENDING,
      userId: new Types.ObjectId(userId),
      stripePaymentIntentId: paymentIntent.id,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      donationId: donation._id.toString(),
      publishableKey: this.config.publishableKey,
    };
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.donationModel.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: DonationStatus.COMPLETED },
        );
        this.logger.log(
          `Payment succeeded for intent ${paymentIntent.id}`,
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.donationModel.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: DonationStatus.FAILED },
        );
        this.logger.warn(
          `Payment failed for intent ${paymentIntent.id}`,
        );
        break;
      }
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  async confirmDonation(donationId: string) {
    const donation = await this.donationModel.findById(donationId);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (donation.status !== DonationStatus.PENDING) {
      return { donationId: donation._id.toString(), status: donation.status };
    }

    if (donation.method === DonationMethod.STRIPE && donation.stripePaymentIntentId) {
      const paymentIntent = await this.getStripe().paymentIntents.retrieve(
        donation.stripePaymentIntentId,
      );

      if (paymentIntent.status === 'succeeded') {
        donation.status = DonationStatus.COMPLETED;
      } else if (
        paymentIntent.status === 'canceled' ||
        paymentIntent.status === 'requires_payment_method'
      ) {
        donation.status = DonationStatus.FAILED;
      }

      await donation.save();
      this.logger.log(
        `Donation ${donationId} confirmed with status: ${donation.status}`,
      );
    }

    return { donationId: donation._id.toString(), status: donation.status };
  }

  async deleteDonation(donationId: string) {
    const donation = await this.donationModel.findByIdAndDelete(donationId);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }
    this.logger.log(`Donation ${donationId} deleted by admin`);
    return { deleted: true };
  }

  async createEspeesDonation(userId: string, dto: CreateEspeesDonationDto) {
    const donation = await this.donationModel.create({
      amount: dto.amount,
      currency: 'espees',
      method: DonationMethod.ESPEES,
      status: DonationStatus.COMPLETED,
      userId: new Types.ObjectId(userId),
    });

    return {
      donationId: donation._id.toString(),
      status: donation.status,
    };
  }

  async findAll(
    page = 1,
    limit = 20,
    method?: string,
    status?: string,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
    if (method) filter.method = method;
    if (status) filter.status = status;

    const [donations, total] = await Promise.all([
      this.donationModel
        .find(filter)
        .populate('userId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.donationModel.countDocuments(filter),
    ]);

    return {
      donations,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    const filter = { userId: new Types.ObjectId(userId) };

    const [donations, total] = await Promise.all([
      this.donationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.donationModel.countDocuments(filter),
    ]);

    return {
      donations,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async getStats() {
    const [results] = await this.donationModel.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalCount: { $sum: 1 },
              },
            },
          ],
          byMethod: [
            {
              $group: {
                _id: '$method',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const totals = results.totals[0] || { totalAmount: 0, totalCount: 0 };
    const byMethod: Record<string, { totalAmount: number; count: number }> = {};
    for (const entry of results.byMethod) {
      byMethod[entry._id] = {
        totalAmount: entry.totalAmount,
        count: entry.count,
      };
    }
    const byStatus: Record<string, number> = {};
    for (const entry of results.byStatus) {
      byStatus[entry._id] = entry.count;
    }

    return {
      totalAmount: totals.totalAmount,
      totalCount: totals.totalCount,
      byMethod,
      byStatus,
    };
  }
}
