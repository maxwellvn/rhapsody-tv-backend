import { IsNotEmpty, IsString } from 'class-validator';

export class ToggleLikeDto {
  @IsString()
  @IsNotEmpty()
  livestreamId: string;
}
