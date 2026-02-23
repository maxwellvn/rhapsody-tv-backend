import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import stripeConfig from '../../config/stripe.config';
import { Donation, DonationSchema } from './schemas/donation.schema';
import { DonationsController } from './donations.controller';
import { AdminDonationsController } from './admin-donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [
    ConfigModule.forFeature(stripeConfig),
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
    ]),
  ],
  controllers: [DonationsController, AdminDonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
