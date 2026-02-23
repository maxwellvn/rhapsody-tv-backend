import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  RawBody,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DonationsService } from './donations.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { CreateEspeesDonationDto } from './dto/create-espees-donation.dto';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('payment-intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe payment intent for donation' })
  async createPaymentIntent(
    @CurrentUser('_id') userId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    const data = await this.donationsService.createPaymentIntent(userId, dto);
    return {
      success: true,
      message: 'Payment intent created successfully',
      data,
    };
  }

  @Post('espees')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record an Espees donation' })
  async createEspeesDonation(
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateEspeesDonationDto,
  ) {
    const data = await this.donationsService.createEspeesDonation(userId, dto);
    return {
      success: true,
      message: 'Espees donation recorded successfully',
      data,
    };
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @RawBody() rawBody: Buffer,
  ) {
    const data = await this.donationsService.handleWebhook(signature, rawBody);
    return data;
  }

  @Post(':id/confirm')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a donation by checking Stripe payment status' })
  async confirmDonation(@Param('id') donationId: string) {
    const data = await this.donationsService.confirmDonation(donationId);
    return {
      success: true,
      message: 'Donation status verified',
      data,
    };
  }

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user donation history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyDonations(
    @CurrentUser('_id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.donationsService.findByUser(userId, page, limit);
    return {
      success: true,
      message: 'Donations retrieved successfully',
      data,
    };
  }
}
