import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Laisse passer les visiteurs non connectés, mais renseigne request.user quand une session valide existe :
// les routes publiques peuvent ainsi dire si l'utilisateur a déjà aimé une publication.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(_error: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
