/**
 * Represents the parts of an incoming HTTP request that NexusAuth needs to access.
 * This is a framework-agnostic representation.
 */
export interface NexusAuthRequest {
  headers: Record<string, string | string[] | undefined>;
  cookies: Record<string, string | undefined>;
}
