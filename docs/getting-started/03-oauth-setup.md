# OAuth Setup - NexusAuth

Guía para configurar Google, GitHub, Facebook y Microsoft OAuth.

---

## 1. Instalar el Provider Package

```bash
npm install @nexus-auth/providers
```

---

## 2. Configurar Google OAuth

### Paso 1: Crear credenciales en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo
3. Ve a **APIs & Services** → **Credentials**
4. Crea **OAuth 2.0 Client ID**
5. Tipo: **Web application**
6. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tuapp.com/api/auth/callback/google` (producción)

7. Copia `Client ID` y `Client Secret`

### Paso 2: Configurar en NexusAuth

```typescript
// src/auth/nexus.config.ts
import { NexusAuth } from '@nexus-auth/core';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';
import { GoogleProvider } from '@nexus-auth/providers';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(/* ... */),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/google',
    }),
  ],

  // ... resto de config
});
```

### Paso 3: Variables de Entorno

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123...
```

### Paso 4: Crear Rutas OAuth

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { nexusAuth } from '../auth/nexus.config';

const router = Router();

// Ruta de inicio de OAuth
router.get('/auth/google', (req, res) => {
  const authUrl = nexusAuth.getAuthorizationUrl('google', {
    state: 'random-state-string', // Para CSRF protection
  });

  res.redirect(authUrl);
});

// Callback de Google
router.get('/api/auth/callback/google', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Validar state aquí (CSRF protection)

    const result = await nexusAuth.signIn('google', {
      code: code as string,
    });

    // Guardar tokens en cookie o retornar al cliente
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

---

## 3. Configurar GitHub OAuth

### Paso 1: Crear OAuth App en GitHub

1. Ve a [GitHub Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. **Application name**: Tu app
4. **Homepage URL**: `http://localhost:3000`
5. **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
6. Copia `Client ID` y `Client Secret`

### Paso 2: Configurar Provider

```typescript
import { GitHubProvider } from '@nexus-auth/providers';

export const nexusAuth = NexusAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/github',
      scope: 'user:email', // Opcional: solicitar permisos específicos
    }),
  ],
  // ...
});
```

### Variables de Entorno

```env
GITHUB_CLIENT_ID=Iv1.abc123...
GITHUB_CLIENT_SECRET=ghp_xyz789...
```

---

## 4. Configurar Facebook OAuth

### Paso 1: Crear App en Facebook Developers

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Crea una nueva app
3. Agrega **Facebook Login**
4. **Valid OAuth Redirect URIs**: `http://localhost:3000/api/auth/callback/facebook`
5. Copia `App ID` y `App Secret`

### Paso 2: Configurar Provider

```typescript
import { FacebookProvider } from '@nexus-auth/providers';

export const nexusAuth = NexusAuth({
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/facebook',
    }),
  ],
  // ...
});
```

---

## 5. Configurar Microsoft OAuth

### Paso 1: Registrar App en Azure

1. Ve a [Azure Portal](https://portal.azure.com/)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. **Redirect URI**: `http://localhost:3000/api/auth/callback/microsoft`
4. Copia `Application (client) ID`
5. Crea un **Client Secret** en **Certificates & secrets**

### Paso 2: Configurar Provider

```typescript
import { MicrosoftProvider } from '@nexus-auth/providers';

export const nexusAuth = NexusAuth({
  providers: [
    MicrosoftProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/microsoft',
      tenant: 'common', // 'common' | 'organizations' | 'consumers' | tenant ID
    }),
  ],
  // ...
});
```

---

## 6. Múltiples Providers

Puedes tener todos los providers activos simultáneamente:

```typescript
import {
  GoogleProvider,
  GitHubProvider,
  FacebookProvider,
  MicrosoftProvider
} from '@nexus-auth/providers';

export const nexusAuth = NexusAuth({
  providers: [
    GoogleProvider({ /* ... */ }),
    GitHubProvider({ /* ... */ }),
    FacebookProvider({ /* ... */ }),
    MicrosoftProvider({ /* ... */ }),
  ],
  // ...
});
```

---

## 7. Account Linking

NexusAuth vincula automáticamente cuentas OAuth con usuarios existentes si el **email coincide**:

```typescript
// Usuario se registra con email
await nexusAuth.createUser({ email: 'user@example.com', password: '...' });

// Luego inicia sesión con Google (mismo email)
// NexusAuth vincula automáticamente la cuenta de Google al usuario existente
await nexusAuth.signIn('google', { code: '...' });
```

Para personalizar el comportamiento:

```typescript
export const nexusAuth = NexusAuth({
  events: {
    async linkAccount({ user, account, profile }) {
      console.log(`Cuenta ${account.provider} vinculada al usuario ${user.id}`);
      // Enviar email de notificación, etc.
    },
  },
  // ...
});
```

---

## 8. CSRF Protection con State

**IMPORTANTE**: Siempre usa el parámetro `state` para proteger contra CSRF:

```typescript
import crypto from 'crypto';

// Generar state
router.get('/auth/google', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');

  // Guardar state en sesión o cookie
  req.session.oauthState = state;

  const authUrl = nexusAuth.getAuthorizationUrl('google', { state });
  res.redirect(authUrl);
});

// Validar state en callback
router.get('/api/auth/callback/google', async (req, res) => {
  const { state } = req.query;

  if (state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }

  // Continuar con OAuth flow...
});
```

---

## 9. Probar OAuth Flow

### Google

1. Visita: `http://localhost:3000/auth/google`
2. Autoriza la app en Google
3. Serás redirigido a `/api/auth/callback/google`
4. Recibirás tokens de autenticación

### GitHub, Facebook, Microsoft

Mismo flujo cambiando las rutas:
- `/auth/github` → `/api/auth/callback/github`
- `/auth/facebook` → `/api/auth/callback/facebook`
- `/auth/microsoft` → `/api/auth/callback/microsoft`

---

## 10. Personalizar Profile Data

Puedes personalizar qué datos guardar del perfil OAuth:

```typescript
export const nexusAuth = NexusAuth({
  callbacks: {
    async signIn({ user, account, profile }) {
      // Guardar datos adicionales del perfil
      if (account.provider === 'google') {
        user.locale = profile.locale;
        user.picture = profile.picture;
      }

      return true; // Permitir sign-in
    },
  },
  // ...
});
```

---

## Próximos Pasos

- 👉 [Schema Mapping para DB Legacy](./04-schema-mapping.md)
- 👉 [Best Practices de Seguridad](../best-practices/security.md)
