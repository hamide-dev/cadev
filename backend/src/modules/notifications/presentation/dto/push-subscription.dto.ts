import { Type } from 'class-transformer';
import {
  IsObject,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PushSubscriptionKeysDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(255)
  p256dh!: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(255)
  auth!: string;
}

export class PushSubscriptionDto {
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;
}

export class RemovePushSubscriptionDto {
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;
}
