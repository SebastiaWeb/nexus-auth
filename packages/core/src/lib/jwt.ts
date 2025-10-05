import jwt from 'jsonwebtoken';
import type { JWT } from './config.js';

export type JWTAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';

interface EncodeParams {
  token: JWT;
  secret: string;
  maxAge: number;
  algorithm?: JWTAlgorithm;
  issuer?: string;
  audience?: string;
}

interface DecodeParams {
  token: string;
  secret: string;
  algorithms?: JWTAlgorithm[];
  issuer?: string;
  audience?: string;
}

/**
 * Encodes a JWT token with standard claims
 */
export function encode({
  token,
  secret,
  maxAge,
  algorithm = 'HS256',
  issuer,
  audience,
}: EncodeParams): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: JWT = {
    ...token,
    iat: now, // Issued at
    exp: now + maxAge, // Expiration time
  };

  if (issuer) {
    payload.iss = issuer;
  }

  if (audience) {
    payload.aud = audience;
  }

  return jwt.sign(payload, secret, {
    algorithm,
  });
}

/**
 * Decodes and validates a JWT token
 */
export function decode({
  token,
  secret,
  algorithms = ['HS256'],
  issuer,
  audience,
}: DecodeParams): Promise<JWT | null> {
  return new Promise((resolve) => {
    const options: jwt.VerifyOptions = {
      algorithms,
    };

    if (issuer) {
      options.issuer = issuer;
    }

    if (audience) {
      options.audience = audience;
    }

    jwt.verify(token, secret, options, (err, decoded) => {
      if (err) {
        // Token is invalid or expired
        return resolve(null);
      }

      return resolve(decoded as JWT);
    });
  });
}