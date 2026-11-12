import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Corps de la première étape d'inscription : e-mail + nom affiché. */
export class InitRegistrationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}
