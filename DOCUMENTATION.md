# Documentación de `nexus-auth`

¡Bienvenido a `nexus-auth`! Una librería de autenticación universal y extensible para tus aplicaciones.

Esta guía te ayudará a empezar a usar `nexus-auth` en tu proyecto.

---

## 1. Conceptos Fundamentales

`nexus-auth` está diseñado con una arquitectura de "puertos y adaptadores" (Hexagonal Architecture). Esto significa que el núcleo (`@nexus-auth/core`) contiene toda la lógica de autenticación, pero es agnóstico a la base de datos o al proveedor de OAuth que uses.

- **Core**: Contiene la lógica principal (`NexusAuth`).
- **Adaptadores**: Conectan `nexus-auth` a tu base de datos (ej. `TypeORM`, `Prisma`).
- **Proveedores**: Implementan estrategias de autenticación (ej. `Google`, `Credentials`).

---

## 2. Instalación

### Instalar el Core

```bash
# Usando pnpm
pnpm add @nexus-auth/core

# Usando npm
npm install @nexus-auth/core
```

### Instalar peerDependencies

`@nexus-auth/core` utiliza `jsonwebtoken` para la gestión de tokens y `bcrypt` para el hasheo de contraseñas. Debes instalarlos como peerDependencies:

```bash
pnpm add jsonwebtoken bcrypt
# También instala los tipos si usas TypeScript
pnpm add -D @types/jsonwebtoken @types/bcrypt
```

### Instalar un Adaptador

```bash
# Para TypeORM
pnpm add @nexus-auth/typeorm-adapter typeorm

# Para Prisma (próximamente)
# pnpm add @nexus-auth/prisma-adapter prisma
```

---

## 3. Configuración Básica

### Inicialización

```typescript
import { NexusAuth } from "@nexus-auth/core";
import { TypeORMAdapter } from "@nexus-auth/typeorm-adapter";
import { DataSource } from "typeorm";

// Configura tu DataSource de TypeORM
const dataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "myapp",
  entities: [/* tus entidades */],
  synchronize: false, // Usa migraciones en producción
});

await dataSource.initialize();

// Inicializa NexusAuth
const auth = new NexusAuth({
  secret: process.env.NEXUS_AUTH_SECRET!, // Secreto fuerte para JWT
  adapter: TypeORMAdapter(dataSource),
  providers: [], // Por ahora vacío, se añadirán OAuth providers en Fase 5
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
    refreshToken: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60, // 30 días
    },
  },
  jwt: {
    algorithm: 'HS256',
    issuer: 'my-app',
    audience: 'my-app-users',
  },
});
```

---

## 4. Funcionalidades Implementadas (Fase 4)

### 4.1 Registration (Registro de Usuarios)

```typescript
// Registrar un nuevo usuario
const result = await auth.register({
  email: "user@example.com",
  password: "securePassword123",
  name: "John Doe",
});

console.log(result.user); // Usuario creado
console.log(result.token); // JWT token
console.log(result.verificationToken); // Token para verificar email

// Envía el verificationToken por email al usuario
// (implementación de email es responsabilidad del desarrollador)
```

**Características**:
- ✅ Hash automático de contraseña con bcrypt
- ✅ Valida que el email no exista
- ✅ Genera token de verificación de email automáticamente
- ✅ Retorna JWT para auto-login
- ✅ Soporta events y callbacks

---

### 4.2 Login (Inicio de Sesión)

```typescript
// Login con email y password
const result = await auth.signIn({
  email: "user@example.com",
  password: "securePassword123",
});

console.log(result.user); // Usuario autenticado
console.log(result.token); // JWT token
```

**Características**:
- ✅ Valida email y password
- ✅ Compara password hasheado con bcrypt
- ✅ Genera JWT
- ✅ Soporta events y callbacks

---

### 4.3 Password Reset (Restablecimiento de Contraseña)

```typescript
// Paso 1: Solicitar reset de contraseña
const resetRequest = await auth.requestPasswordReset("user@example.com");

console.log(resetRequest.resetToken); // Token de reset
// Envía este token por email al usuario

// Paso 2: Verificar token (opcional, para validar antes de mostrar formulario)
const user = await auth.verifyResetToken(resetRequest.resetToken);

// Paso 3: Restablecer contraseña
const result = await auth.resetPassword(
  resetRequest.resetToken,
  "newSecurePassword456"
);

console.log(result.user); // Usuario actualizado
console.log(result.token); // JWT para auto-login
```

**Características**:
- ✅ Tokens seguros generados con crypto (Node.js built-in)
- ✅ Expiración de 1 hora
- ✅ Valida token antes de actualizar
- ✅ Auto-login después de reset exitoso

---

### 4.4 Email Verification (Verificación de Email)

```typescript
// El token se genera automáticamente en el registro
// Para reenviar email de verificación:
const result = await auth.sendVerificationEmail("user@example.com");

console.log(result.verificationToken); // Nuevo token
// Envía este token por email

// Verificar email del usuario
const verifiedUser = await auth.verifyEmail(result.verificationToken);

console.log(verifiedUser.emailVerified); // Date de verificación
```

**Características**:
- ✅ Token generado automáticamente en registro
- ✅ Expiración de 24 horas
- ✅ Puede reenviar verification email
- ✅ Marca `emailVerified` con timestamp

---

### 4.5 JWT Creation & Validation

```typescript
// Generar JWT manualmente (normalmente se hace automáticamente)
const token = auth.generateJwt({
  sub: user.id,
  email: user.email,
  name: user.name,
  // Custom claims
  role: "admin",
  permissions: ["read", "write"],
});

// Verificar JWT
const decoded = await auth.verifyJwt(token);

if (decoded) {
  console.log(decoded.sub); // User ID
  console.log(decoded.email);
  console.log(decoded.role); // Custom claim
}

// Obtener sesión completa desde token
const session = await auth.getSession(token);

if (session) {
  console.log(session.user); // Usuario completo desde DB
  console.log(session.expires); // Fecha de expiración
}
```

**Características**:
- ✅ Soporta 6 algoritmos: HS256, HS384, HS512, RS256, RS384, RS512
- ✅ Claims estándar: iat, exp, iss, aud
- ✅ Custom claims soportados
- ✅ Validación robusta con opciones configurables
- ✅ `getSession()` completo con lookup en DB

---

### 4.6 Refresh Tokens

```typescript
// Configuración con refresh tokens habilitados
const auth = new NexusAuth({
  // ... otras opciones
  session: {
    strategy: 'jwt',
    maxAge: 15 * 60, // Access token: 15 minutos
    refreshToken: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60, // Refresh token: 30 días
    },
  },
});

// Cuando el access token expire, usa el refresh token
const result = await auth.refreshAccessToken(refreshToken);

console.log(result.token); // Nuevo access token
console.log(result.refreshToken); // Nuevo refresh token (rotación automática)
```

**Características**:
- ✅ Almacenados en DB (tabla sessions)
- ✅ Token rotation automático (seguridad mejorada)
- ✅ Expiración configurable (default: 30 días)
- ✅ Regenera access tokens sin re-autenticación

---

### 4.7 Session Invalidation

```typescript
// Sign out de una sesión específica
await auth.signOut(sessionToken);

// Sign out de todos los dispositivos (invalida todas las sesiones del usuario)
const result = await auth.signOutAllDevices(userId);

console.log(result.sessionsDeleted); // Número de sesiones eliminadas
```

**Características**:
- ✅ Invalida sesión específica
- ✅ Invalida todas las sesiones de un usuario
- ✅ Elimina sessions de la base de datos
- ✅ Soporta events

---

## 5. Events y Callbacks

### Events (Side Effects)

Los events se ejecutan para efectos secundarios como enviar emails o logging:

```typescript
const auth = new NexusAuth({
  // ... otras opciones
  events: {
    async createUser({ user }) {
      // Enviar email de bienvenida
      await sendWelcomeEmail(user.email, user.name);

      // Log en sistema de analytics
      await analytics.track('user_created', { userId: user.id });
    },

    async signIn({ user, account }) {
      // Log de inicio de sesión
      await auditLog.create({
        action: 'sign_in',
        userId: user.id,
        timestamp: new Date(),
      });
    },

    async signOut() {
      // Log de cierre de sesión
      await auditLog.create({
        action: 'sign_out',
        timestamp: new Date(),
      });
    },
  },
});
```

### Callbacks (Modificar Comportamiento)

Los callbacks permiten modificar datos antes de que se procesen:

```typescript
const auth = new NexusAuth({
  // ... otras opciones
  callbacks: {
    async jwt({ token, user }) {
      // Añadir información custom al JWT
      if (user) {
        token.role = user.role;
        token.permissions = user.permissions;
        token.organizationId = user.organizationId;
      }
      return token;
    },

    async session({ session, token }) {
      // Añadir información custom a la sesión
      session.user.role = token.role;
      session.user.permissions = token.permissions;
      return session;
    },
  },
});
```

---

## 6. Configuración del Adaptador

### Modo Simple (Proyectos Nuevos)

Usa las entidades por defecto que provee NexusAuth:

```typescript
import { TypeORMAdapter } from "@nexus-auth/typeorm-adapter";
import { DataSource } from "typeorm";
import { UserEntity, SessionEntity, AccountEntity } from "@nexus-auth/typeorm-adapter/entities";

const dataSource = new DataSource({
  // ... configuración
  entities: [UserEntity, SessionEntity, AccountEntity],
});

const adapter = TypeORMAdapter(dataSource);
```

### Modo Avanzado (Proyectos Existentes)

Mapea tus entidades existentes:

```typescript
import { TypeORMAdapter } from "@nexus-auth/typeorm-adapter";
import { MyUser } from "./entities/MyUser";

const adapter = TypeORMAdapter(dataSource, {
  entities: {
    user: MyUser,
    // session y account usan defaults
  },
  mapping: {
    user: {
      id: "user_id",
      email: "email_address",
      name: "full_name",
      emailVerified: "email_confirmed_at",
    },
  },
});
```

---

## 7. Configuración Avanzada

### JWT Personalizado

```typescript
const auth = new NexusAuth({
  // ... otras opciones
  jwt: {
    algorithm: 'RS256', // Usar RSA en lugar de HMAC
    issuer: 'https://myapp.com',
    audience: 'https://api.myapp.com',
  },
});
```

### Session Strategy

```typescript
const auth = new NexusAuth({
  // ... otras opciones
  session: {
    strategy: 'jwt', // 'jwt' o 'database'
    maxAge: 60 * 60, // 1 hora
    refreshToken: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 días
    },
  },
});
```

---

## 8. Esquema de Base de Datos

### Tabla `users`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID único del usuario |
| name | varchar | Nombre del usuario |
| email | varchar | Email (único) |
| email_verified | timestamp | Fecha de verificación |
| image | varchar | URL de avatar |
| reset_token | varchar | Token de reset de contraseña |
| reset_token_expiry | timestamp | Expiración del reset token |
| verification_token | varchar | Token de verificación de email |
| verification_token_expiry | timestamp | Expiración del verification token |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de actualización |

### Tabla `accounts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID único de la cuenta |
| user_id | uuid | FK a users |
| type | varchar | Tipo (credentials, oauth) |
| provider | varchar | Proveedor (credentials, google, etc) |
| provider_account_id | varchar | ID del usuario en el proveedor |
| access_token | varchar | Access token (o hash de password) |
| refresh_token | varchar | Refresh token (OAuth) |
| expires_at | integer | Timestamp de expiración |
| token_type | varchar | Tipo de token |
| scope | varchar | Scopes del token |
| id_token | varchar | ID token (OIDC) |
| session_state | varchar | Session state (OAuth) |

### Tabla `sessions`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | ID único de la sesión |
| user_id | uuid | FK a users |
| session_token | varchar | Token de sesión (único) |
| refresh_token | varchar | Refresh token (único) |
| expires | timestamp | Expiración de la sesión |
| refresh_token_expires | timestamp | Expiración del refresh token |
| created_at | timestamp | Fecha de creación |
| updated_at | timestamp | Fecha de actualización |

---

## 9. Ejemplos de Integración

### Express.js

```typescript
import express from "express";
import { NexusAuth } from "@nexus-auth/core";

const app = express();
app.use(express.json());

const auth = new NexusAuth({ /* config */ });

// Registro
app.post("/auth/register", async (req, res) => {
  try {
    const result = await auth.register(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const result = await auth.signIn(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Middleware de autenticación
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const session = await auth.getSession(token);

  if (!session) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = session.user;
  next();
};

// Ruta protegida
app.get("/api/profile", authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

### Next.js API Routes

```typescript
// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await auth.register(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

---

## 10. Mejores Prácticas

### Seguridad

1. **Secreto fuerte**: Usa un secreto de al menos 32 caracteres aleatorios para JWT
2. **HTTPS**: Siempre usa HTTPS en producción
3. **Tokens cortos**: Access tokens con expiración corta (15-30 min)
4. **Refresh tokens largos**: 7-30 días
5. **Token rotation**: Habilitado por defecto para mayor seguridad

### Performance

1. **Índices en DB**: Asegúrate de tener índices en `email`, `session_token`, `refresh_token`
2. **Cache**: Considera cachear sesiones en Redis
3. **Connection pooling**: Usa connection pooling en tu base de datos

### Manejo de Errores

```typescript
try {
  const result = await auth.signIn(credentials);
} catch (error) {
  if (error.message.includes("Invalid email or password")) {
    // Credenciales incorrectas
  } else if (error.message.includes("expired")) {
    // Token expirado
  } else {
    // Error genérico
  }
}
```

---

## 11. OAuth Providers (Fase 5)

`nexus-auth` incluye soporte para OAuth2 con providers listos para usar.

### Instalación de Providers

```bash
pnpm add @nexus-auth/providers
```

### Configuración con OAuth

```typescript
import { NexusAuth } from "@nexus-auth/core";
import { GoogleProvider, GitHubProvider, FacebookProvider, MicrosoftProvider } from "@nexus-auth/providers";
import { TypeORMAdapter } from "@nexus-auth/typeorm-adapter";

const auth = new NexusAuth({
  secret: process.env.NEXUS_AUTH_SECRET!,
  adapter: TypeORMAdapter(dataSource),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_ID!,
      clientSecret: process.env.FACEBOOK_SECRET!,
    }),
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_ID!,
      clientSecret: process.env.MICROSOFT_SECRET!,
      tenant: 'common',
    }),
  ],
});
```

### Flujo OAuth Completo

#### 1. Redireccionar al Provider

```typescript
// En tu ruta de login (ej. /auth/signin/google)
app.get("/auth/signin/:provider", async (req, res) => {
  const { provider } = req.params;

  try {
    const { url, state } = await auth.getAuthorizationUrl(provider);

    // Guardar state en sesión para validación CSRF
    req.session.oauthState = state;

    // Redireccionar al provider OAuth
    res.redirect(url);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

#### 2. Manejar el Callback

```typescript
// En tu ruta de callback (ej. /auth/callback/google)
app.get("/auth/callback/:provider", async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;

  try {
    // Obtener state guardado en sesión
    const expectedState = req.session.oauthState;

    // Manejar callback OAuth
    const { user, token, isNewUser } = await auth.handleOAuthCallback(
      provider,
      code as string,
      expectedState,
      state as string
    );

    // Usuario autenticado exitosamente
    res.json({ user, token, isNewUser });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});
```

### Providers Disponibles

#### GoogleProvider

```typescript
GoogleProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Opcional, default: http://localhost:3000/api/auth/callback/google
})
```

**Scopes incluidos**: `openid email profile`

#### GitHubProvider

```typescript
GitHubProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Opcional, default: http://localhost:3000/api/auth/callback/github
})
```

**Scopes incluidos**: `read:user user:email`

#### FacebookProvider

```typescript
FacebookProvider({
  clientId: string;
  clientSecret: string;
  callbackUrl?: string; // Opcional, default: http://localhost:3000/api/auth/callback/facebook
})
```

**Scopes incluidos**: `email public_profile`

#### MicrosoftProvider

```typescript
MicrosoftProvider({
  clientId: string;
  clientSecret: string;
  tenant?: string; // 'common' | 'organizations' | 'consumers' | tenant ID
  callbackUrl?: string; // Opcional, default: http://localhost:3000/api/auth/callback/microsoft
})
```

**Scopes incluidos**: `openid email profile User.Read`

**Opciones de tenant:**
- `common` (default): Multi-tenant - cuentas personales y de trabajo/escuela
- `organizations`: Solo cuentas de trabajo o escuela
- `consumers`: Solo cuentas personales de Microsoft
- Tenant ID específico: Para una organización Azure AD específica

**Ejemplo de uso:**

```typescript
import { MicrosoftProvider } from '@nexus-auth/providers';

const auth = new NexusAuth({
  providers: [
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_ID!,
      clientSecret: process.env.MICROSOFT_SECRET!,
      tenant: 'common', // o 'organizations', 'consumers', o un tenant ID
    }),
  ],
});
```

### Crear Providers Personalizados

Puedes crear tus propios providers OAuth usando la clase `OAuth2Provider`:

```typescript
import { OAuth2Provider } from "@nexus-auth/core";

function DiscordProvider(config: { clientId: string; clientSecret: string }) {
  return new OAuth2Provider(
    'discord',
    {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      userInfoUrl: 'https://discord.com/api/users/@me',
      scope: 'identify email',
      profile: (profile) => ({
        id: profile.id,
        email: profile.email,
        name: profile.username,
        image: profile.avatar
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
          : null,
      }),
    }
  );
}
```

### Características OAuth

- ✅ **Zero dependencies adicionales** - Usa fetch nativo (Node.js 18+)
- ✅ **CSRF Protection** - State parameter automático
- ✅ **Account Linking** - Vincula automáticamente cuentas OAuth con usuarios existentes por email
- ✅ **Auto email verification** - Los emails de OAuth providers se marcan como verificados
- ✅ **Custom providers** - Fácil de extender con nuevos providers

### Next.js App Router Example

```typescript
// app/api/auth/signin/[provider]/route.ts
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { url, state } = await auth.getAuthorizationUrl(params.provider);

  // Guardar state en cookie
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth-state', state, { httpOnly: true, maxAge: 600 });

  return response;
}

// app/api/auth/callback/[provider]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const expectedState = req.cookies.get('oauth-state')?.value;

  const { user, token } = await auth.handleOAuthCallback(
    params.provider,
    code!,
    expectedState,
    state!
  );

  // Set token in cookie y redirect
  const response = NextResponse.redirect('/dashboard');
  response.cookies.set('auth-token', token, { httpOnly: true });

  return response;
}
```

---

## 12. Database Adapters (Fase 6)

NexusAuth soporta múltiples ORMs y estrategias de persistencia a través de su sistema de adaptadores. Todos los adapters incluyen soporte para **schema mapping**, permitiéndote trabajar con bases de datos legacy sin modificar tu esquema existente.

### Adaptadores Disponibles

#### 12.1. TypeORM Adapter

Ya documentado en secciones anteriores. Ver sección sobre TypeORM para más detalles.

```bash
pnpm add @nexus-auth/typeorm-adapter typeorm
```

#### 12.2. Prisma Adapter

El adaptador de Prisma permite usar Prisma ORM con NexusAuth, incluyendo soporte completo para schema mapping.

**Instalación:**

```bash
pnpm add @nexus-auth/prisma-adapter @prisma/client
```

**Uso Básico:**

```typescript
import { NexusAuth } from '@nexus-auth/core';
import { PrismaAdapter } from '@nexus-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const auth = new NexusAuth({
  adapter: PrismaAdapter({
    client: prisma,
  }),
  secret: process.env.AUTH_SECRET!,
  jwt: {
    expiresIn: '7d',
  },
});
```

**Schema Prisma requerido:**

```prisma
model User {
  id                       String    @id @default(cuid())
  email                    String    @unique
  name                     String?
  password                 String?
  emailVerified            DateTime?
  image                    String?
  resetToken               String?
  resetTokenExpiry         DateTime?
  verificationToken        String?
  verificationTokenExpiry  DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  accounts                 Account[]
  sessions                 Session[]
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  provider          String
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  tokenType         String?
  scope             String?
  idToken           String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id                   String    @id @default(cuid())
  sessionToken         String    @unique
  userId               String
  expires              DateTime
  refreshToken         String?   @unique
  refreshTokenExpires  DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Schema Mapping con base de datos legacy:**

Si tienes una base de datos existente con nombres de columnas diferentes:

```typescript
const auth = new NexusAuth({
  adapter: PrismaAdapter({
    client: prisma,

    // Mapear nombres de tablas (nombres de modelos Prisma)
    tableNames: {
      user: 'legacyUser',
      account: 'userAccount',
      session: 'userSession',
    },

    // Mapear nombres de columnas
    fieldMapping: {
      user: {
        id: 'user_id',
        email: 'email_address',
        name: 'full_name',
        password: 'hashed_password',
        emailVerified: 'email_confirmed_at',
        image: 'profile_picture',
        resetToken: 'password_reset_token',
        resetTokenExpiry: 'password_reset_exp',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      account: {
        id: 'account_id',
        userId: 'user_id',
        provider: 'oauth_provider',
        providerAccountId: 'provider_user_id',
        // ... otros campos
      },
      session: {
        id: 'session_id',
        sessionToken: 'token',
        userId: 'user_id',
        expires: 'expires_at',
        // ... otros campos
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Bases de datos soportadas por Prisma:**

- PostgreSQL
- MySQL
- SQLite
- SQL Server
- MongoDB
- CockroachDB

**peerDependencies:**

```json
{
  "peerDependencies": {
    "@nexus-auth/core": "workspace:*",
    "@prisma/client": "^5.0.0 || ^6.0.0"
  }
}
```

Para más ejemplos y documentación completa, consulta el [README de @nexus-auth/prisma-adapter](packages/prisma-adapter/README.md).

---

#### 12.3. Mongoose Adapter

El adaptador de Mongoose permite usar MongoDB con Mongoose ODM, incluyendo soporte para schemas personalizados y field mapping.

**Instalación:**

```bash
pnpm add @nexus-auth/mongoose-adapter mongoose
```

**Uso Básico:**

```typescript
import mongoose from 'mongoose';
import { NexusAuth } from '@nexus-auth/core';
import { MongooseAdapter } from '@nexus-auth/mongoose-adapter';

// Crear conexión
const connection = await mongoose.createConnection(process.env.MONGO_URL!);

const auth = new NexusAuth({
  adapter: MongooseAdapter({
    connection,
  }),
  secret: process.env.AUTH_SECRET!,
  jwt: {
    expiresIn: '7d',
  },
});
```

**Schemas por defecto:**

El adapter crea automáticamente los siguientes schemas si no se proporcionan custom schemas:

```typescript
// User Schema
{
  email: String (required, unique),
  name: String,
  password: String,
  emailVerified: Date,
  image: String,
  resetToken: String,
  resetTokenExpiry: Date,
  verificationToken: String,
  verificationTokenExpiry: Date,
  createdAt: Date,
  updatedAt: Date
}

// Account Schema
{
  userId: ObjectId (required, ref: 'User'),
  provider: String (required),
  providerAccountId: String (required),
  accessToken: String,
  refreshToken: String,
  expiresAt: Date,
  tokenType: String,
  scope: String,
  idToken: String,
  createdAt: Date,
  updatedAt: Date
}
// Índice único en [provider, providerAccountId]

// Session Schema
{
  sessionToken: String (required, unique),
  userId: ObjectId (required, ref: 'User'),
  expires: Date (required),
  refreshToken: String (unique),
  refreshTokenExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Collection Mapping:**

Mapear a nombres de colecciones existentes:

```typescript
const auth = new NexusAuth({
  adapter: MongooseAdapter({
    connection,
    collectionNames: {
      user: 'app_users',
      account: 'oauth_accounts',
      session: 'user_sessions',
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Field Mapping con base de datos legacy:**

```typescript
const auth = new NexusAuth({
  adapter: MongooseAdapter({
    connection,

    collectionNames: {
      user: 'users',
    },

    fieldMapping: {
      user: {
        email: 'emailAddress',
        name: 'fullName',
        password: 'hashedPassword',
        emailVerified: 'emailConfirmedAt',
        image: 'profilePicture',
        resetToken: 'passwordResetToken',
        resetTokenExpiry: 'passwordResetExpiry',
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Custom Schemas:**

Puedes proporcionar tus propios schemas de Mongoose:

```typescript
import { Schema } from 'mongoose';

const CustomUserSchema = new Schema({
  emailAddress: { type: String, required: true, unique: true },
  fullName: { type: String },
  hashedPassword: { type: String },
  emailConfirmedAt: { type: Date },
  profilePicture: { type: String },
  // Campos personalizados
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
});

const auth = new NexusAuth({
  adapter: MongooseAdapter({
    connection,
    schemas: {
      User: CustomUserSchema,
      // Account y Session usarán schemas por defecto
    },
    fieldMapping: {
      user: {
        email: 'emailAddress',
        name: 'fullName',
        password: 'hashedPassword',
        emailVerified: 'emailConfirmedAt',
        image: 'profilePicture',
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Características MongoDB:**

- **ObjectId Support**: Manejo automático de MongoDB ObjectIds
- **Population**: Población automática de referencias de usuario en accounts y sessions
- **Indexes**: Creación automática de índices únicos para rendimiento óptimo
- **Sparse Indexes**: Manejo eficiente de campos opcionales como `refreshToken`

**peerDependencies:**

```json
{
  "peerDependencies": {
    "@nexus-auth/core": "workspace:*",
    "mongoose": "^7.0.0 || ^8.0.0"
  }
}
```

**Ejemplo MERN Stack:**

```typescript
import mongoose from 'mongoose';
import { MongooseAdapter } from '@nexus-auth/mongoose-adapter';
import { NexusAuth } from '@nexus-auth/core';
import { GoogleProvider } from '@nexus-auth/providers';

const connection = await mongoose.createConnection(process.env.MONGO_URL!);

const auth = new NexusAuth({
  adapter: MongooseAdapter({ connection }),
  secret: process.env.AUTH_SECRET!,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
});
```

Para más ejemplos y documentación completa, consulta el [README de @nexus-auth/mongoose-adapter](packages/mongoose-adapter/README.md).

---

#### 12.4. SQL Adapter (Raw SQL)

El adaptador de Raw SQL proporciona máxima flexibilidad permitiendo usar SQL directo con cualquier base de datos SQL, sin necesidad de un ORM.

**Instalación:**

```bash
pnpm add @nexus-auth/sql-adapter
# Plus tu cliente SQL de preferencia
pnpm add pg # PostgreSQL
# o
pnpm add mysql2 # MySQL
# o
pnpm add better-sqlite3 # SQLite
```

**Características principales:**

- **Sin ORM**: No requiere TypeORM, Prisma o Mongoose
- **Multi-dialecto**: PostgreSQL, MySQL, SQLite, MSSQL
- **Zero dependencies**: Solo depende de @nexus-auth/core
- **Control total**: Tú decides cómo ejecutar las queries
- **Máxima flexibilidad**: Perfecto para schemas legacy complejos

**Uso con PostgreSQL:**

```typescript
import { Pool } from 'pg';
import { NexusAuth } from '@nexus-auth/core';
import { SQLAdapter } from '@nexus-auth/sql-adapter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    dialect: 'postgres',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Uso con MySQL:**

```typescript
import mysql from 'mysql2/promise';
import { NexusAuth } from '@nexus-auth/core';
import { SQLAdapter } from '@nexus-auth/sql-adapter';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const [rows] = await pool.execute(sql, params);
      return rows as any[];
    },
    dialect: 'mysql',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Uso con SQLite:**

```typescript
import Database from 'better-sqlite3';
import { NexusAuth } from '@nexus-auth/core';
import { SQLAdapter } from '@nexus-auth/sql-adapter';

const db = new Database('auth.db');

const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const stmt = db.prepare(sql);
      return stmt.all(...(params || []));
    },
    dialect: 'sqlite',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Schema Mapping avanzado:**

```typescript
const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    dialect: 'postgres',

    // Mapear nombres de tablas
    tableNames: {
      user: 'app_users',
      account: 'oauth_accounts',
      session: 'user_sessions',
    },

    // Mapear nombres de columnas
    fieldMapping: {
      user: {
        id: 'user_id',
        email: 'email_address',
        name: 'full_name',
        password: 'hashed_password',
        emailVerified: 'email_confirmed_at',
        resetToken: 'password_reset_token',
        resetTokenExpiry: 'password_reset_expires_at',
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Ejemplo: Cloudflare D1 (Edge):**

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const auth = new NexusAuth({
      adapter: SQLAdapter({
        query: async (sql, params) => {
          const stmt = env.DB.prepare(sql).bind(...(params || []));
          const { results } = await stmt.all();
          return results;
        },
        dialect: 'sqlite',
      }),
      secret: env.AUTH_SECRET,
    });

    // Use auth...
  },
};
```

**Ejemplo: Transaction support:**

```typescript
const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await client.query(sql, params);
        await client.query('COMMIT');
        return result.rows;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    dialect: 'postgres',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

**Cuándo usar SQL Adapter:**

✅ **Úsalo cuando:**
- Necesitas control total sobre tus queries SQL
- Tu schema es altamente customizado
- Usas una base de datos SQL menos común
- Quieres optimizar queries específicas
- Ya tienes utilities de base de datos
- No quieres agregar un ORM como dependencia

❌ **No lo uses cuando:**
- Estás empezando un proyecto nuevo (usa Prisma o TypeORM adapter)
- Quieres migraciones automáticas
- Prefieres abstracciones de ORM

**peerDependencies:**

```json
{
  "peerDependencies": {
    "@nexus-auth/core": "workspace:*"
  }
}
```

**Nota:** No tiene dependencias de clientes SQL - tú eliges cuál usar!

Para más ejemplos (incluyendo Neon, PlanetScale, etc.), consulta el [README de @nexus-auth/sql-adapter](packages/sql-adapter/README.md).

---

## 13. Helpers para Frameworks

NexusAuth proporciona helpers específicos para integrar fácilmente la autenticación en frameworks populares.

### 13.1 Next.js Helpers

Paquete: **`@nexus-auth/nextjs-helpers`**
Soporte para **App Router** (Next.js 13+) y **Pages Router**

#### Instalación

```bash
npm install @nexus-auth/nextjs-helpers
```

**peerDependencies**: `next ^13.0.0 || ^14.0.0 || ^15.0.0`

---

#### App Router - Server Components

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { getSession, getCurrentUser, requireAuth } from '@nexus-auth/nextjs-helpers';

// Opción 1: Obtener sesión completa
export default async function DashboardPage() {
  const session = await getSession(auth);
  if (!session) redirect('/login');

  return <div>Welcome {session.user.name}</div>;
}

// Opción 2: Obtener solo el usuario
export default async function ProfilePage() {
  const user = await getCurrentUser(auth);
  if (!user) redirect('/login');

  return <div>{user.email}</div>;
}

// Opción 3: Requerir autenticación (lanza error si no está autenticado)
export default async function AdminPage() {
  const user = await requireAuth(auth);
  return <div>Admin: {user.email}</div>;
}
```

#### App Router - Server Actions

```typescript
// app/actions.ts
'use server';

import { auth } from '@/auth';
import { getCurrentUser, signOut } from '@nexus-auth/nextjs-helpers';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser(auth);
  if (!user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  await auth.adapter.updateUser({ id: user.id, name });
  revalidatePath('/profile');
}

export async function handleSignOut() {
  await signOut(auth);
  redirect('/');
}
```

#### App Router - Route Handlers

```typescript
// app/api/user/route.ts
import { auth } from '@/auth';
import { getCurrentUser } from '@nexus-auth/nextjs-helpers';

export async function GET() {
  const user = await getCurrentUser(auth);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({ user });
}
```

---

#### Pages Router - getServerSideProps

```typescript
// pages/profile.tsx
import { auth } from '@/auth';
import { getSessionFromReq, getCurrentUserFromReq } from '@nexus-auth/nextjs-helpers';

export const getServerSideProps = async (ctx) => {
  // Opción 1: Sesión completa
  const session = await getSessionFromReq(auth, ctx.req);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  // Opción 2: Solo usuario
  const user = await getCurrentUserFromReq(auth, ctx.req);

  return { props: { user } };
};

export default function ProfilePage({ user }) {
  return <div>Profile: {user.email}</div>;
}
```

#### Pages Router - HOC para getServerSideProps

```typescript
// pages/dashboard.tsx
import { auth } from '@/auth';
import { withAuthSSR } from '@nexus-auth/nextjs-helpers';

export const getServerSideProps = withAuthSSR(auth, async (ctx, user) => {
  // User está garantizado (HOC maneja la redirección)
  return { props: { user } };
});

export default function DashboardPage({ user }) {
  return <div>Dashboard: {user.name}</div>;
}
```

#### Pages Router - API Routes

```typescript
// pages/api/protected.ts
import { auth } from '@/auth';
import { withAuth } from '@nexus-auth/nextjs-helpers';

export default withAuth(auth, async (req, res, user) => {
  // User está garantizado
  res.json({ message: `Hello ${user.name}` });
});
```

```typescript
// pages/api/auth/signout.ts
import { auth } from '@/auth';
import { handleSignOut } from '@nexus-auth/nextjs-helpers';

export default async function handler(req, res) {
  await handleSignOut(auth, req, res);
  res.redirect('/');
}
```

---

#### Middleware para Protección de Rutas

```typescript
// middleware.ts
import { auth } from '@/auth';
import { createAuthMiddleware } from '@nexus-auth/nextjs-helpers';

export const middleware = createAuthMiddleware(auth, {
  publicRoutes: ['/', '/login', '/register'],
  protectedRoutes: ['/dashboard', '/profile', '/admin'],
  loginUrl: '/login',
  defaultAuthRedirect: '/dashboard',
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**Middleware Personalizado**:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getSessionFromMiddleware } from '@nexus-auth/nextjs-helpers';

export async function middleware(request) {
  const session = await getSessionFromMiddleware(auth, request);

  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (request.nextUrl.pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}
```

---

#### API Reference - Next.js Helpers

**App Router**:
- `getSession(auth)` - Retorna `{ session, user } | null`
- `getCurrentUser(auth)` - Retorna `User | null`
- `requireAuth(auth)` - Retorna `User` o lanza error
- `signOut(auth)` - Cierra sesión

**Pages Router**:
- `getSessionFromReq(auth, req)` - Sesión desde request
- `getCurrentUserFromReq(auth, req)` - Usuario desde request
- `withAuth(auth, handler)` - HOC para API routes
- `withAuthSSR(auth, handler)` - HOC para getServerSideProps
- `handleSignOut(auth, req, res)` - Maneja cierre de sesión

**Middleware**:
- `createAuthMiddleware(auth, config)` - Crea middleware de protección
- `getSessionFromMiddleware(auth, request)` - Sesión desde middleware

Para más ejemplos, consulta el [README de @nexus-auth/nextjs-helpers](packages/nextjs-helpers/README.md).

---

### 13.2 NestJS Helpers

Paquete: **`@nexus-auth/nestjs-helpers`**
Guards, Decorators, Module y Service para **NestJS**

#### Instalación

```bash
npm install @nexus-auth/nestjs-helpers
```

**peerDependencies**:
- `@nestjs/common ^9.0.0 || ^10.0.0 || ^11.0.0`
- `@nestjs/core ^9.0.0 || ^10.0.0 || ^11.0.0`
- `reflect-metadata ^0.1.13 || ^0.2.0`

---

#### Quick Start

**1. Registrar el módulo:**

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NexusAuthModule, NexusAuthGuard } from '@nexus-auth/nestjs-helpers';
import { auth } from './auth';

@Module({
  imports: [
    NexusAuthModule.forRoot({
      auth,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: NexusAuthGuard,
    },
  ],
})
export class AppModule {}
```

**2. Usar en Controllers:**

```typescript
// users.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public, CurrentUser } from '@nexus-auth/nestjs-helpers';

@Controller('users')
export class UsersController {
  @Get('me')
  getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public' };
  }
}
```

---

#### Decoradores

**`@Public()`** - Marcar ruta como pública (sin autenticación):

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Get('login')
  login() {
    return { message: 'Login page' };
  }
}
```

**`@CurrentUser()`** - Obtener usuario autenticado:

```typescript
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
```

**`@CurrentSession()`** - Obtener sesión actual:

```typescript
@Controller('sessions')
export class SessionsController {
  @Get('current')
  getCurrentSession(@CurrentSession() session: Session) {
    return {
      expires: session.expires,
      userId: session.userId,
    };
  }
}
```

**`@CurrentUserId()`** - Obtener solo el ID del usuario:

```typescript
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }
}
```

---

#### NexusAuthService

Acceso a métodos de NexusAuth en servicios:

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { NexusAuthService } from '@nexus-auth/nestjs-helpers';

@Injectable()
export class UsersService {
  constructor(private readonly nexusAuthService: NexusAuthService) {}

  async getUserById(id: string) {
    return this.nexusAuthService.getUser(id);
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return this.nexusAuthService.updateUser({
      id,
      ...data,
    });
  }

  async deleteUser(id: string) {
    await this.nexusAuthService.deleteUserSessions(id);
    return this.nexusAuthService.deleteUser(id);
  }
}
```

---

#### Registro Asíncrono del Módulo

```typescript
import { NexusAuthModule } from '@nexus-auth/nestjs-helpers';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NexusAuthModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        auth: createAuthInstance(configService),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

---

#### API Reference - NestJS Helpers

**Guard:**
- `NexusAuthGuard` - Guard que valida autenticación en todas las rutas

**Decoradores:**
- `@Public()` - Marcar ruta como pública
- `@CurrentUser()` - Obtener usuario autenticado
- `@CurrentSession()` - Obtener sesión actual
- `@CurrentUserId()` - Obtener ID del usuario

**Módulo:**
- `NexusAuthModule.forRoot(options)` - Registro síncrono
- `NexusAuthModule.forRootAsync(options)` - Registro asíncrono

**Servicio:**
- `NexusAuthService` - Acceso a métodos de NexusAuth
  - `getUser(id)`, `getUserByEmail(email)`
  - `updateUser(user)`, `deleteUser(userId)`
  - `getSessionAndUser(token)`, `deleteSession(token)`
  - `deleteUserSessions(userId)`

Para más ejemplos, consulta el [README de @nexus-auth/nestjs-helpers](packages/nestjs-helpers/README.md).

---

### 13.3 Express Helpers

Paquete: **`@nexus-auth/express-helpers`**
Middleware optimizado y helpers para **Express**

#### Instalación

```bash
npm install @nexus-auth/express-helpers cookie-parser
```

**peerDependencies**:
- `express ^4.0.0 || ^5.0.0`

**Nota**: Requiere `cookie-parser` para leer cookies de sesión.

---

#### Quick Start

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { auth } from './auth';
import { createAuthMiddleware } from '@nexus-auth/express-helpers';

const app = express();

// Requerido: cookie-parser middleware
app.use(cookieParser());

// Proteger todas las rutas
app.use(createAuthMiddleware(auth));

app.get('/protected', (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000);
```

---

#### Middleware de Autenticación

**Autenticación Requerida**:

```typescript
import { requireAuth } from '@nexus-auth/express-helpers';

app.get('/profile', requireAuth(auth), (req, res) => {
  res.json({ user: req.user });
});
```

**Autenticación Opcional**:

```typescript
import { optionalAuth } from '@nexus-auth/express-helpers';

app.get('/home', optionalAuth(auth), (req, res) => {
  if (req.user) {
    res.json({ message: `Welcome back, ${req.user.name}` });
  } else {
    res.json({ message: 'Welcome, guest' });
  }
});
```

---

#### Helper Functions

**Extraer usuario y sesión:**

```typescript
import { requireAuth, getCurrentUser, getCurrentSession } from '@nexus-auth/express-helpers';

app.get('/me', requireAuth(auth), (req, res) => {
  const user = getCurrentUser(req);
  const session = getCurrentSession(req);

  res.json({
    user,
    sessionExpires: session.expires,
  });
});
```

**Sign Out:**

```typescript
import { requireAuth, signOut } from '@nexus-auth/express-helpers';

app.post('/logout', requireAuth(auth), async (req, res) => {
  await signOut(auth, req, res);
  res.json({ message: 'Logged out successfully' });
});
```

---

#### Manejadores Personalizados

```typescript
import { createAuthMiddleware } from '@nexus-auth/express-helpers';

app.use(
  createAuthMiddleware(auth, {
    onUnauthorized: (req, res, next) => {
      res.status(401).json({
        error: 'Please log in',
        redirectUrl: '/login',
      });
    },
    onError: (error, req, res, next) => {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    },
  })
);
```

---

#### Rutas Mixtas (Públicas y Protegidas)

```typescript
import { requireAuth, optionalAuth } from '@nexus-auth/express-helpers';

// Ruta pública
app.get('/public', (req, res) => {
  res.json({ message: 'Public content' });
});

// Ruta con auth opcional
app.get('/feed', optionalAuth(auth), (req, res) => {
  const user = req.user;
  const feed = user ? getPersonalizedFeed(user.id) : getPublicFeed();
  res.json({ feed });
});

// Ruta protegida
app.get('/dashboard', requireAuth(auth), (req, res) => {
  res.json({ user: req.user });
});
```

---

#### API Reference - Express Helpers

**Middleware:**
- `createAuthMiddleware(auth, options?)` - Middleware configurable
- `requireAuth(auth, options?)` - Requiere autenticación
- `optionalAuth(auth)` - Autenticación opcional

**Opciones:**
- `required` - Boolean (default: true)
- `onUnauthorized` - Manejador personalizado para no autorizados
- `onError` - Manejador personalizado de errores

**Helper Functions:**
- `getCurrentUser(req)` - Extraer usuario del request
- `getCurrentSession(req)` - Extraer sesión del request
- `signOut(auth, req, res)` - Cerrar sesión

**TypeScript:**
El tipo `Request` se extiende automáticamente para incluir `user` y `session`.

Para más ejemplos, consulta el [README de @nexus-auth/express-helpers](packages/express-helpers/README.md).

---

## 14. Próximas Funcionalidades

### Fase 7 (Próximamente)

- Refresh tokens automáticos
- Rate limiting integrado
- Webhooks de eventos
- Panel de administración

---

## 15. Soporte

- **GitHub**: [Issues](https://github.com/yourusername/nexus-auth/issues)
- **Documentación**: Esta guía
- **Ejemplos**: Ver carpeta `/examples` en el repositorio

---

**Última actualización**: Fase 6 completada - 1 de Octubre 2025
