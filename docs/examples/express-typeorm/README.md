# Ejemplo: Express + TypeORM + PostgreSQL

Ejemplo completo de una API REST con autenticación usando NexusAuth.

---

## Stack

- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Auth**: NexusAuth
- **Language**: TypeScript

---

## Características

- ✅ Registro de usuarios (credentials)
- ✅ Login con email/password
- ✅ OAuth con Google
- ✅ Protected routes con middleware
- ✅ Password reset flow
- ✅ Email verification
- ✅ Refresh tokens
- ✅ Rate limiting
- ✅ Validación con Zod

---

## Estructura del Proyecto

```
express-typeorm/
├── src/
│   ├── entities/
│   │   ├── User.ts
│   │   ├── Account.ts
│   │   ├── Session.ts
│   │   └── VerificationToken.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   └── protected.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   └── rateLimit.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── nexus-auth.ts
│   ├── utils/
│   │   ├── email.ts
│   │   └── validation.ts
│   └── index.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
cd examples/express-typeorm
npm install
```

### 2. Configurar PostgreSQL

```bash
# Crear base de datos
createdb nexusauth_example

# O usando psql
psql -U postgres
CREATE DATABASE nexusauth_example;
```

### 3. Variables de entorno

Copiar `.env.example` a `.env`:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=nexusauth_example

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# OAuth (opcional)
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123

# App
APP_URL=http://localhost:3000
PORT=3000

# Email (opcional - para password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 4. Ejecutar migraciones

```bash
npm run typeorm migration:run
```

### 5. Iniciar servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

Servidor corriendo en `http://localhost:3000`

---

## Endpoints

### Autenticación

#### POST `/api/auth/signup`

Registrar nuevo usuario.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST `/api/auth/signin`

Iniciar sesión.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "user": { "id": "uuid", "email": "user@example.com" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### GET `/api/auth/google`

Iniciar OAuth flow con Google. Redirige a Google.

#### GET `/api/auth/callback/google`

Callback de Google OAuth.

#### POST `/api/auth/refresh`

Refrescar access token.

**Request**:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### POST `/api/auth/signout`

Cerrar sesión.

**Headers**: `Authorization: Bearer <token>`

#### POST `/api/auth/password-reset/request`

Solicitar reset de password.

**Request**:
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/password-reset/confirm`

Confirmar reset de password.

**Request**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!"
}
```

#### GET `/api/auth/verify-email`

Verificar email.

**Query**: `?token=verification-token`

---

### Protected Routes

Requieren `Authorization: Bearer <token>` header.

#### GET `/api/profile`

Obtener perfil del usuario actual.

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/profile`

Actualizar perfil.

**Request**:
```json
{
  "name": "Jane Doe"
}
```

#### GET `/api/sessions`

Listar sesiones activas.

**Response**:
```json
{
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "expiresAt": "2025-02-01T00:00:00.000Z"
    }
  ]
}
```

---

## Testing con cURL

### Signup

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### Signin

```bash
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

Guarda el `accessToken` de la respuesta.

### Get Profile

```bash
curl http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Google OAuth

Visita en el navegador:
```
http://localhost:3000/api/auth/google
```

---

## Código Destacado

### Configuración de NexusAuth

```typescript
// src/config/nexus-auth.ts
import { NexusAuth } from '@nexus-auth/core';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';
import { GoogleProvider } from '@nexus-auth/providers';
import { AppDataSource } from './database';
import { User, Account, Session, VerificationToken } from '../entities';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(AppDataSource, {
    entities: {
      user: User,
      account: Account,
      session: Session,
      verificationToken: VerificationToken,
    },
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.APP_URL}/api/auth/callback/google`,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '15m',
  },

  refreshToken: {
    enabled: true,
    expiresIn: '7d',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
      };
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      console.log(`[AUTH] New user created: ${user.email}`);
      // Enviar email de bienvenida
    },

    async signIn({ user, account }) {
      console.log(`[AUTH] User signed in: ${user.email} via ${account.provider}`);
    },
  },
});
```

### Middleware de Autenticación

```typescript
// src/middleware/authenticate.ts
import { createAuthMiddleware } from '@nexus-auth/express-helpers';
import { nexusAuth } from '../config/nexus-auth';

export const authenticate = createAuthMiddleware(nexusAuth);

// Opcional: middleware que permite acceso sin autenticar
export const optionalAuth = createAuthMiddleware(nexusAuth, {
  required: false,
});
```

### Rate Limiting

```typescript
// src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: 'Demasiados intentos de login, intenta de nuevo en 15 minutos',
});

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: 'Demasiados registros desde esta IP',
});
```

---

## Próximos Pasos

- Añadir tests con Jest/Vitest
- Implementar 2FA
- Añadir more OAuth providers
- Deploy a producción

---

## Recursos

- [NexusAuth Docs](../../DOCUMENTATION.md)
- [Express Docs](https://expressjs.com/)
- [TypeORM Docs](https://typeorm.io/)
