import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SendCommentDto {
  @IsMongoId()
  @IsNotEmpty()
  livestreamId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsMongoId()
  @IsOptional()
  parentCommentId?: string;
}
