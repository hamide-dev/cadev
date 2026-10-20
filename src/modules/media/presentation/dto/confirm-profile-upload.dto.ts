import { IsString, MaxLength } from 'class-validator';

export class ConfirmProfileUploadDto {
  @IsString()
  @MaxLength(512)
  publicId!: string;
}
