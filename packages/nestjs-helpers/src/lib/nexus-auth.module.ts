/**
 * @module @nexus-auth/nestjs-helpers
 * NestJS Module for NexusAuth
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { NEXUS_AUTH } from './auth.guard.js';

/**
 * NexusAuth module options
 */
export interface NexusAuthModuleOptions {
  /**
   * NexusAuth instance
   */
  auth: any;

  /**
   * Make the module global
   * @default true
   */
  isGlobal?: boolean;
}

/**
 * NexusAuth Module for NestJS
 * Provides NexusAuth instance to the application
 *
 * @example
 * ```typescript
 * // app.module.ts
 * import { NexusAuthModule } from '@nexusauth/nestjs-helpers';
 * import { auth } from './auth';
 *
 * @Module({
 *   imports: [
 *     NexusAuthModule.forRoot({
 *       auth,
 *       isGlobal: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class NexusAuthModule {
  /**
   * Register NexusAuth module with options
   */
  static forRoot(options: NexusAuthModuleOptions): DynamicModule {
    return {
      module: NexusAuthModule,
      global: options.isGlobal !== false,
      providers: [
        {
          provide: NEXUS_AUTH,
          useValue: options.auth,
        },
      ],
      exports: [NEXUS_AUTH],
    };
  }

  /**
   * Register NexusAuth module asynchronously
   *
   * @example
   * ```typescript
   * NexusAuthModule.forRootAsync({
   *   useFactory: (configService: ConfigService) => ({
   *     auth: createAuthInstance(configService),
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<NexusAuthModuleOptions> | NexusAuthModuleOptions;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    return {
      module: NexusAuthModule,
      global: options.isGlobal !== false,
      providers: [
        {
          provide: NEXUS_AUTH,
          useFactory: async (...args: any[]) => {
            const moduleOptions = await options.useFactory(...args);
            return moduleOptions.auth;
          },
          inject: options.inject || [],
        },
      ],
      exports: [NEXUS_AUTH],
    };
  }
}
