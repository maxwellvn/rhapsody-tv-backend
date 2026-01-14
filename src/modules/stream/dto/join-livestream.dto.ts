import { IsMongoId, IsNotEmpty } from 'class-validator';

export class JoinLivestreamDto {
  @IsMongoId()
  @IsNotEmpty()
  livestreamId: string;
}
