/**
 * @module @nexus-auth/nestjs-helpers
 * NestJS Authentication Guard
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key for public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * NestJS Authentication Guard
 * Protects routes and validates sessions from cookies
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { NexusAuthGuard, NEXUS_AUTH } from '@nexus-auth/nestjs-helpers';
 *
 * @Module({
 *   providers: [
 *     {
 *       provide: NEXUS_AUTH,
 *       useValue: auth, // Your NexusAuth instance
 *     },
 *     {
 *       provide: APP_GUARD,
 *       useClass: NexusAuthGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class NexusAuthGuard implements CanActivate {
  constructor(
    @Inject('NEXUS_AUTH') private readonly nexusAuth: any,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.['nexus.session-token'];

    if (!sessionToken) {
      throw new UnauthorizedException('No session token found');
    }

    try {
      const result = await this.nexusAuth.adapter.getSessionAndUser(sessionToken);

      if (!result) {
        throw new UnauthorizedException('Invalid session');
      }

      const { session, user } = result;

      // Check if session is expired
      if (session.expires < new Date()) {
        await this.nexusAuth.adapter.deleteSession(sessionToken);
        throw new UnauthorizedException('Session expired');
      }

      // Attach user and session to request
      request.user = user;
      request.session = session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

/**
 * Token for injecting NexusAuth instance
 */
export const NEXUS_AUTH = 'NEXUS_AUTH';
