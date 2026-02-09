import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ErrorCode } from '../../common/errors';

@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Missing bearer token',
      });
    }

    const jwksUrl = this.config.get<string>('OAUTH_JWKS_URL');
    const audience = this.config.get<string>('OAUTH_AUDIENCE');
    const issuer = this.config.get<string>('OAUTH_ISSUER');

    if (!jwksUrl) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Missing JWKS configuration',
      });
    }

    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    let payload;
    try {
      ({ payload } = await jwtVerify(token, jwks, {
        audience: audience || undefined,
        issuer: issuer || undefined,
      }));
    } catch {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid bearer token',
      });
    }

    request.clientId = payload.client_id || payload.sub || 'unknown-client';
    return true;
  }
}
