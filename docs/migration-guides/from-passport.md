# Migrar de Passport.js a NexusAuth

Guía para migrar tu proyecto de Passport.js a NexusAuth y eliminar todo el boilerplate.

---

## ¿Por qué migrar a NexusAuth?

### Passport.js vs NexusAuth

| Aspecto | Passport.js | NexusAuth |
|---------|-------------|-----------|
| **Database Layer** | ❌ Manual (DIY) | ✅ Adaptadores incluidos |
| **Configuración** | ❌ Mucho boilerplate | ✅ Configuración simple |
| **TypeScript** | ⚠️ Tipos básicos | ✅ TypeScript-first |
| **JWT Management** | ❌ Manual | ✅ Built-in |
| **Password Hashing** | ❌ Manual | ✅ Built-in |
| **Session Management** | ⚠️ express-session | ✅ JWT o DB sessions |
| **OAuth Providers** | ✅ 500+ strategies | ✅ Principales (Google, GitHub, etc.) |

**Principal razón**: Eliminar todo el código repetitivo de database queries, JWT, bcrypt, etc.

---

## Código Antes vs Después

### Passport.js (antes) - ~200 líneas

```typescript
// passport-config.ts
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from './models/User';

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email } });

        if (!user) {
          return done(null, false, { message: 'Email no encontrado' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: 'Contraseña incorrecta' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          where: { googleId: profile.id },
        });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
```

```typescript
// routes/auth.ts
import express from 'express';
import passport from '../passport-config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info.message });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ user, token });
  })(req, res, next);
});

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.redirect(`/dashboard?token=${token}`);
  }
);

export default router;
```

```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### NexusAuth (después) - ~50 líneas

```typescript
// lib/auth.ts
import { NexusAuth } from '@nexusauth/core';
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { AppDataSource } from './data-source';
import { User } from './entities/User';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(AppDataSource, {
    entities: { user: User },
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/google',
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 días
  },

  secret: process.env.JWT_SECRET!,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});
```

```typescript
// routes/auth.ts
import express from 'express';
import { nexusAuth } from '../lib/auth';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const user = await nexusAuth.register(req.body);
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const result = await nexusAuth.signIn(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Google OAuth
router.get('/google', (req, res) => {
  const authUrl = nexusAuth.getAuthorizationUrl('google');
  res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    const result = await nexusAuth.signIn('google', {
      code: req.query.code as string,
    });
    res.redirect(`/dashboard?token=${result.accessToken}`);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

export default router;
```

```typescript
// middleware/auth.ts
import { createAuthMiddleware } from '@nexusauth/express-helpers';
import { nexusAuth } from '../lib/auth';

export const authenticate = createAuthMiddleware(nexusAuth);
```

**Reducción**: ~200 líneas → ~50 líneas (**75% menos código**)

---

## Guía de Migración Paso a Paso

### Paso 1: Instalar NexusAuth

```bash
# Eliminar Passport
npm uninstall passport passport-local passport-google-oauth20 passport-jwt

# Instalar NexusAuth
npm install @nexusauth/core @nexusauth/express-helpers
npm install @nexusauth/typeorm-adapter typeorm
npm install @nexusauth/providers
```

### Paso 2: Actualizar Entity/Model

**Passport (antes)** - Modelo manual:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  googleId: string | null;

  @Column()
  name: string;
}
```

**NexusAuth (después)** - Añadir campos para auth completo:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  emailVerified: Date | null; // ⬅️ Nuevo

  @Column()
  name: string;

  @Column({ nullable: true })
  password: string | null; // Ahora nullable para OAuth

  @Column({ nullable: true })
  image: string | null; // ⬅️ Nuevo

  @CreateDateColumn()
  createdAt: Date; // ⬅️ Nuevo
}
```

Crear migración:
```bash
npx typeorm migration:create src/migrations/AddNexusAuthFields
```

### Paso 3: Eliminar Passport Config

Eliminar archivos:
- ❌ `passport-config.ts`
- ❌ `strategies/local.ts`
- ❌ `strategies/google.ts`
- ❌ Cualquier custom strategy

### Paso 4: Reemplazar Routes

**Antes (Passport)**:

```typescript
// Signup manual
router.post('/signup', async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ ...req.body, password: hashedPassword });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ user, token });
});

// Login con strategy
router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET);
  res.json({ user: req.user, token });
});
```

**Después (NexusAuth)**:

```typescript
// Signup automático
router.post('/signup', async (req, res) => {
  try {
    const user = await nexusAuth.register(req.body);
    res.json({ success: true, user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login automático
router.post('/login', async (req, res) => {
  try {
    const result = await nexusAuth.signIn(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});
```

### Paso 5: Simplificar Middleware

**Antes (Passport)** - Middleware manual:

```typescript
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) throw new Error('User not found');

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
```

**Después (NexusAuth)** - Una línea:

```typescript
import { createAuthMiddleware } from '@nexusauth/express-helpers';
import { nexusAuth } from '../lib/auth';

export const authenticate = createAuthMiddleware(nexusAuth);
```

Uso:
```typescript
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

### Paso 6: Migrar OAuth Strategies

**Antes (Passport)** - Configurar strategy + serialize:

```typescript
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      let user = await User.findOne({ where: { googleId: profile.id } });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
        });
      }
      return done(null, user);
    }
  )
);
```

**Después (NexusAuth)** - Configuración simple:

```typescript
import { GoogleProvider } from '@nexusauth/providers';

export const nexusAuth = NexusAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/api/auth/callback/google',
    }),
  ],
  // NexusAuth maneja automáticamente account linking
});
```

### Paso 7: Eliminar express-session (Opcional)

Si usabas `express-session` con Passport:

**Antes**:
```typescript
import session from 'express-session';

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
```

**Después** - No necesario con JWT:
```typescript
// Eliminar express-session completamente
// NexusAuth usa JWT por defecto (stateless)
```

---

## Funcionalidades Adicionales que Obtienes

### 1. Password Reset (Gratis)

**Passport**: Tenías que implementarlo manualmente.

**NexusAuth**: Built-in

```typescript
// Generar token
const token = await nexusAuth.createPasswordResetToken('user@example.com');

// Enviar email (tu lógica)
await sendEmail(email, `Reset: ${token}`);

// Reset password
await nexusAuth.resetPassword(token, 'newPassword123');
```

### 2. Email Verification (Gratis)

**Passport**: Manual.

**NexusAuth**: Built-in

```typescript
// Generar token de verificación
const token = await nexusAuth.sendVerificationEmail('user@example.com');

// Verificar email
await nexusAuth.verifyEmail(token);
```

### 3. Refresh Tokens (Gratis)

**Passport**: Manual con JWT.

**NexusAuth**: Built-in

```typescript
const result = await nexusAuth.signIn({ email, password });

// Automáticamente retorna:
// - accessToken (corta duración)
// - refreshToken (larga duración)

// Refrescar token
const newTokens = await nexusAuth.refreshSession(result.refreshToken);
```

---

## Checklist de Migración

- [ ] Instalar paquetes de NexusAuth
- [ ] Desinstalar Passport y strategies
- [ ] Actualizar entidad User (añadir `emailVerified`, `image`, `createdAt`)
- [ ] Crear configuración de NexusAuth (`lib/auth.ts`)
- [ ] Eliminar `passport-config.ts`
- [ ] Reemplazar rutas de auth
- [ ] Reemplazar middleware `authenticate`
- [ ] Migrar OAuth strategies a providers
- [ ] Eliminar `express-session` (si usas JWT)
- [ ] Testear flujos de auth

---

## Beneficios Después de Migrar

✅ **75% menos código** - Eliminar boilerplate
✅ **Password hashing automático** - bcrypt integrado
✅ **JWT management** - Generación, validación, refresh
✅ **Password reset** - Built-in
✅ **Email verification** - Built-in
✅ **TypeScript completo** - Types claros
✅ **Schema mapping** - Adaptar a DB existente

---

## Próximos Pasos

- 👉 [Best Practices](../best-practices/security.md)
- 👉 [Ejemplo Express + TypeORM](../examples/express-typeorm/)
