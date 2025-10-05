/**
 * @module @nexusauth/nestjs-helpers
 * NestJS Service for NexusAuth
 */

import { Injectable, Inject } from '@nestjs/common';
import { NEXUS_AUTH } from './auth.guard.js';

/**
 * NexusAuth Service for NestJS
 * Provides access to NexusAuth instance methods
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly nexusAuthService: NexusAuthService) {}
 *
 *   async getUserById(id: string) {
 *     return this.nexusAuthService.getUser(id);
 *   }
 * }
 * ```
 */
@Injectable()
export class NexusAuthService {
  constructor(@Inject(NEXUS_AUTH) private readonly nexusAuth: any) {}

  /**
   * Get NexusAuth instance
   */
  getInstance() {
    return this.nexusAuth;
  }

  /**
   * Get adapter instance
   */
  getAdapter() {
    return this.nexusAuth.adapter;
  }

  /**
   * Get user by ID
   */
  async getUser(id: string) {
    return this.nexusAuth.adapter.getUser(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string) {
    return this.nexusAuth.adapter.getUserByEmail(email);
  }

  /**
   * Update user
   */
  async updateUser(user: any) {
    return this.nexusAuth.adapter.updateUser(user);
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string) {
    return this.nexusAuth.adapter.deleteUser(userId);
  }

  /**
   * Get session and user by session token
   */
  async getSessionAndUser(sessionToken: string) {
    return this.nexusAuth.adapter.getSessionAndUser(sessionToken);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionToken: string) {
    return this.nexusAuth.adapter.deleteSession(sessionToken);
  }

  /**
   * Delete all user sessions
   */
  async deleteUserSessions(userId: string) {
    return this.nexusAuth.adapter.deleteUserSessions(userId);
  }
}
