import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEspeesDonationDto {
  @ApiProperty({ description: 'Donation amount', example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;
}
