import { IsMongoId, IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsMongoId()
  @IsNotEmpty()
  livestreamId: string;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
