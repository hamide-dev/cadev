import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^\d{4}$/)
  code!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
