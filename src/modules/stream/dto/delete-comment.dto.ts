import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteCommentDto {
  @IsMongoId()
  @IsNotEmpty()
  commentId: string;
}
