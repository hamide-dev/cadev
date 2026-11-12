import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyLoginCodeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^\d{4}$/)
  code!: string;
}
