# Best Practices - Seguridad

Guía de mejores prácticas de seguridad para NexusAuth.

---

## JWT Secrets

### ❌ MAL

```typescript
export const nexusAuth = NexusAuth({
  jwt: {
    secret: 'my-secret', // ❌ Demasiado corto
  },
});
```

### ✅ BIEN

```typescript
export const nexusAuth = NexusAuth({
  secret: process.env.JWT_SECRET!, // ✅ Desde variable de entorno
});
```

**Generar un secret seguro**:

```bash
# Opción 1: OpenSSL
openssl rand -base64 32

# Opción 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Longitud mínima**: 32 caracteres

---

## Password Hashing

### Configuración de bcrypt

```typescript
export const nexusAuth = NexusAuth({
  password: {
    saltRounds: 12, // ✅ 10-12 es seguro (default: 10)
  },
});
```

**Nota**: Valores más altos = más seguro pero más lento.

| Salt Rounds | Tiempo ~     | Seguridad |
|-------------|--------------|-----------|
| 10          | ~100ms       | ✅ Bueno   |
| 12          | ~400ms       | ✅ Mejor   |
| 14          | ~1.6s        | ⚠️ Muy lento |

---

## Session Management

### Expiración de Tokens

```typescript
export const nexusAuth = NexusAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días ⚠️ Demasiado largo
  },

  secret: process.env.JWT_SECRET!,

  refreshToken: {
    enabled: true,
    expiresIn: '7d', // ✅ Refresh token más largo
  },
});
```

**Recomendaciones**:
- **Access token**: 15 minutos - 1 hora
- **Refresh token**: 7 - 30 días
- **Session máxima**: 30 días

---

## HTTPS en Producción

### ❌ MAL - HTTP en producción

```typescript
GoogleProvider({
  redirectUri: 'http://myapp.com/api/auth/callback/google', // ❌ HTTP
});
```

### ✅ BIEN - HTTPS siempre

```typescript
GoogleProvider({
  redirectUri: 'https://myapp.com/api/auth/callback/google', // ✅ HTTPS
});
```

**Cookies seguras**:

```typescript
// Next.js
response.cookies.set('accessToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Solo HTTPS en prod
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60,
});
```

---

## CSRF Protection

### OAuth State Parameter

```typescript
import crypto from 'crypto';

// Generar state
router.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');

  // Guardar en sesión/cookie
  req.session.oauthState = state;

  const authUrl = nexusAuth.getAuthorizationUrl('google', {
    state, // ✅ CSRF protection
  });

  res.redirect(authUrl);
});

// Validar state
router.get('/api/auth/callback/google', async (req, res) => {
  const { state, code } = req.query;

  // ✅ Validar state
  if (state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }

  delete req.session.oauthState; // ✅ Usar una sola vez

  const result = await nexusAuth.signIn('google', { code: code as string });
  res.json(result);
});
```

---

## Rate Limiting

### Proteger Endpoints de Auth

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

// Limitar intentos de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
});

router.post('/auth/signin', loginLimiter, async (req, res) => {
  // ...
});

// Limitar creación de cuentas
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 cuentas por hora
  message: 'Demasiados registros desde esta IP',
});

router.post('/auth/signup', signupLimiter, async (req, res) => {
  // ...
});
```

---

## Validación de Input

### Usar Zod o Joi

```bash
npm install zod
```

```typescript
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
});

router.post('/auth/signup', async (req, res) => {
  try {
    // ✅ Validar input
    const data = signupSchema.parse(req.body);

    const user = await nexusAuth.register(data);
    res.json({ success: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Password Strength

```typescript
const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(100)
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial');
```

---

## Email Verification

### Forzar Verificación

```typescript
export const nexusAuth = NexusAuth({
  callbacks: {
    async signIn({ user, account }) {
      // ✅ Solo permitir login si email está verificado
      if (account.type === 'credentials' && !user.emailVerified) {
        throw new Error('Email no verificado. Por favor verifica tu email.');
      }

      return true;
    },
  },

  events: {
    async createUser({ user }) {
      // Enviar email de verificación
      const token = await nexusAuth.sendVerificationEmail(user.email);

      await sendEmail({
        to: user.email,
        subject: 'Verifica tu email',
        html: `
          <p>Haz clic aquí para verificar tu email:</p>
          <a href="${process.env.APP_URL}/auth/verify?token=${token}">
            Verificar Email
          </a>
        `,
      });
    },
  },
});
```

---

## Logging y Auditoría

### Log de Eventos de Seguridad

```typescript
export const nexusAuth = NexusAuth({
  events: {
    async signIn({ user, account }) {
      console.log(`[AUTH] Sign-in: ${user.email} via ${account.provider}`);

      // Guardar en DB para auditoría
      await AuditLog.create({
        userId: user.id,
        action: 'SIGN_IN',
        provider: account.provider,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date(),
      });
    },

    async signInError({ error, email }) {
      console.error(`[AUTH ERROR] Failed sign-in for ${email}: ${error.message}`);

      // Alertar si hay muchos intentos fallidos
      const failedAttempts = await getFailedAttempts(email);
      if (failedAttempts > 10) {
        await sendSecurityAlert(email, 'Múltiples intentos de login fallidos');
      }
    },

    async createUser({ user }) {
      console.log(`[AUTH] New user created: ${user.email}`);

      await AuditLog.create({
        userId: user.id,
        action: 'USER_CREATED',
        timestamp: new Date(),
      });
    },
  },
});
```

---

## Protección contra Brute Force

### Bloqueo Temporal de Cuentas

```typescript
import Redis from 'ioredis';

const redis = new Redis();

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60; // 15 minutos

router.post('/auth/signin', async (req, res) => {
  const { email, password } = req.body;

  // Verificar si está bloqueado
  const attempts = await redis.get(`login_attempts:${email}`);

  if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
    const ttl = await redis.ttl(`login_attempts:${email}`);
    return res.status(429).json({
      error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${Math.ceil(ttl / 60)} minutos.`,
    });
  }

  try {
    const result = await nexusAuth.signIn({ email, password });

    // Resetear intentos fallidos
    await redis.del(`login_attempts:${email}`);

    res.json(result);
  } catch (error: any) {
    // Incrementar intentos fallidos
    await redis.incr(`login_attempts:${email}`);
    await redis.expire(`login_attempts:${email}`, LOCK_TIME);

    res.status(401).json({ error: error.message });
  }
});
```

---

## XSS Protection

### Sanitizar User Input

```bash
npm install dompurify isomorphic-dompurify
```

```typescript
import DOMPurify from 'isomorphic-dompurify';

router.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body;

  // ✅ Sanitizar input
  const sanitizedName = DOMPurify.sanitize(name);

  const user = await nexusAuth.register({
    email,
    password,
    name: sanitizedName,
  });

  res.json({ user });
});
```

### Content Security Policy (CSP)

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
```

---

## Environment Variables

### ❌ MAL - Hardcoded

```typescript
export const nexusAuth = NexusAuth({
  secret: 'hardcoded-secret', // ❌ NUNCA
});
```

### ✅ BIEN - Variables de Entorno

```typescript
// .env
JWT_SECRET=your-random-secret-here-min-32-chars
DATABASE_URL=postgresql://user:pass@localhost:5432/db
GOOGLE_CLIENT_ID=123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123

// config.ts
import { z } from 'zod';

const envSchema = z.object({
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
```

**NUNCA commits .env al repositorio**:

```bash
# .gitignore
.env
.env.local
.env.production
```

---

## Checklist de Seguridad

### Autenticación
- [ ] JWT secret de al menos 32 caracteres
- [ ] Secrets en variables de entorno (no hardcoded)
- [ ] Access tokens con expiración corta (15min - 1h)
- [ ] Refresh tokens habilitados
- [ ] bcrypt con saltRounds >= 10

### HTTPS y Cookies
- [ ] HTTPS en producción
- [ ] Cookies con `httpOnly: true`
- [ ] Cookies con `secure: true` en producción
- [ ] `sameSite: 'lax'` o `'strict'`

### OAuth
- [ ] State parameter para CSRF protection
- [ ] Validar state en callback
- [ ] HTTPS en redirect URIs

### Rate Limiting
- [ ] Rate limit en `/auth/signin` (5 intentos / 15min)
- [ ] Rate limit en `/auth/signup` (3 intentos / hora)
- [ ] Rate limit en `/auth/password-reset`

### Validación
- [ ] Validar input con Zod/Joi
- [ ] Password strength validation
- [ ] Sanitizar user input (XSS)

### Email Verification
- [ ] Enviar email de verificación
- [ ] Forzar verificación antes de permitir login

### Logging
- [ ] Log eventos de autenticación
- [ ] Log intentos fallidos
- [ ] Alertas para comportamiento sospechoso

### General
- [ ] Helmet.js para security headers
- [ ] CSP configurado
- [ ] `.env` en `.gitignore`
- [ ] Dependencias actualizadas (`npm audit`)

---

## Recursos Adicionales

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
