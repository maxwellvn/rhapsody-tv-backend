import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMongoId,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChannelOrderItemDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  id: string;

  @ApiProperty({ example: 1, description: 'Display order (0-1000)' })
  @IsInt()
  @Min(0)
  @Max(1000)
  displayOrder: number;
}

export class ReorderChannelsDto {
  @ApiProperty({ type: [ChannelOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChannelOrderItemDto)
  orders: ChannelOrderItemDto[];
}
