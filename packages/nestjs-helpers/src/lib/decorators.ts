/**
 * @module @nexusauth/nestjs-helpers
 * NestJS Decorators for NexusAuth
 */

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './auth.guard.js';

/**
 * Mark a route as public (bypass authentication)
 *
 * @example
 * ```typescript
 * @Controller('auth')
 * export class AuthController {
 *   @Public()
 *   @Get('login')
 *   login() {
 *     return { message: 'Login page' };
 *   }
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Get current authenticated user from request
 *
 * @example
 * ```typescript
 * @Controller('users')
 * export class UsersController {
 *   @Get('me')
 *   getCurrentUser(@CurrentUser() user: User) {
 *     return user;
 *   }
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

/**
 * Get current session from request
 *
 * @example
 * ```typescript
 * @Controller('sessions')
 * export class SessionsController {
 *   @Get('current')
 *   getCurrentSession(@CurrentSession() session: Session) {
 *     return session;
 *   }
 * }
 * ```
 */
export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  }
);

/**
 * Get current user ID from request
 *
 * @example
 * ```typescript
 * @Controller('posts')
 * export class PostsController {
 *   @Post()
 *   createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
 *     return this.postsService.create(userId, dto);
 *   }
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  }
);
