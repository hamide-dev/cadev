import { IsEmail, MaxLength } from 'class-validator';

export class RequestLoginCodeDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
