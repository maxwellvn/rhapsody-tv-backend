import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import { ProgramSubscriptionsService } from './program-subscriptions.service';

@ApiTags('Programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramSubscriptionsController {
  constructor(
    private readonly programSubscriptionsService: ProgramSubscriptionsService,
  ) {}

  @Get(':id/subscription-status')
  @ApiOperation({ summary: 'Get current user subscription status for a program' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiOkSuccessResponse({ description: 'Program subscription status retrieved' })
  async getSubscriptionStatus(
    @CurrentUser('sub') userId: string,
    @Param('id') programId: string,
  ) {
    const [isSubscribed, subscriberCount] = await Promise.all([
      this.programSubscriptionsService.isSubscribed(userId, programId),
      this.programSubscriptionsService.getSubscriberCount(programId),
    ]);

    return {
      success: true,
      message: 'Program subscription status retrieved',
      data: {
        programId,
        isSubscribed,
        subscriberCount,
      },
    };
  }

  @Post(':id/subscribe')
  @ApiOperation({ summary: 'Subscribe current user to a program' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiOkSuccessResponse({ description: 'Subscribed to program successfully' })
  async subscribe(
    @CurrentUser('sub') userId: string,
    @Param('id') programId: string,
  ) {
    const result = await this.programSubscriptionsService.subscribe(
      userId,
      programId,
    );

    return {
      success: true,
      message: 'Subscribed to program successfully',
      data: {
        programId,
        ...result,
      },
    };
  }

  @Post(':id/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe current user from a program' })
  @ApiParam({ name: 'id', description: 'Program ID' })
  @ApiOkSuccessResponse({ description: 'Unsubscribed from program successfully' })
  async unsubscribe(
    @CurrentUser('sub') userId: string,
    @Param('id') programId: string,
  ) {
    const result = await this.programSubscriptionsService.unsubscribe(
      userId,
      programId,
    );

    return {
      success: true,
      message: 'Unsubscribed from program successfully',
      data: {
        programId,
        ...result,
      },
    };
  }
}
