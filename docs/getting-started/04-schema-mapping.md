# Schema Mapping - Característica Única de NexusAuth

**El diferenciador clave**: NexusAuth se adapta a tu base de datos existente, sin necesidad de migración.

---

## ¿Qué es Schema Mapping?

Schema mapping te permite usar NexusAuth con bases de datos **legacy** que tienen:
- Nombres de columnas personalizados (`user_id` en vez de `id`)
- Nombres de tablas personalizados (`app_users` en vez de `users`)
- Esquemas de años de antigüedad que no puedes cambiar

**Competencia**:
- ❌ **Auth.js**: NO soporta schema mapping - debes migrar tu DB
- ❌ **Better Auth**: NO soporta schema mapping
- ✅ **NexusAuth**: ÚNICO con schema mapping completo

---

## Ejemplo: Database Legacy

Imagina que tienes esta tabla de usuarios desde hace 5 años:

```sql
CREATE TABLE app_users (
  user_id UUID PRIMARY KEY,
  email_address VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  hashed_password VARCHAR(255),
  email_confirmed_at TIMESTAMP,
  profile_image_url TEXT,
  registered_at TIMESTAMP DEFAULT NOW()
);
```

**Problema**: Auth.js y Better Auth esperan columnas llamadas `id`, `email`, `name`, `password`, etc.

**Solución NexusAuth**: Mapea tus columnas existentes.

---

## Schema Mapping con TypeORM

```typescript
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  // ... config
});

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(dataSource, {
    entities: {
      user: YourExistingUserEntity,
    },
    mapping: {
      user: {
        // NexusAuth espera → Tu columna real
        id: 'user_id',
        email: 'email_address',
        name: 'full_name',
        password: 'hashed_password',
        emailVerified: 'email_confirmed_at',
        image: 'profile_image_url',
        createdAt: 'registered_at',
      },
    },
  }),
});
```

¡Listo! NexusAuth ahora funciona con tu esquema legacy **sin modificar nada** en la DB.

---

## Schema Mapping con Prisma

Tu schema Prisma existente:

```prisma
model AppUser {
  userId            String    @id @default(uuid()) @map("user_id")
  emailAddress      String    @unique @map("email_address")
  fullName          String?   @map("full_name")
  hashedPassword    String?   @map("hashed_password")
  emailConfirmedAt  DateTime? @map("email_confirmed_at")
  profileImageUrl   String?   @map("profile_image_url")
  registeredAt      DateTime  @default(now()) @map("registered_at")

  @@map("app_users")
}
```

Configuración NexusAuth:

```typescript
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const nexusAuth = NexusAuth({
  adapter: PrismaAdapter({ client: prisma }, {
    models: {
      user: 'AppUser', // Nombre del modelo en Prisma
    },
    mapping: {
      user: {
        id: 'userId',
        email: 'emailAddress',
        name: 'fullName',
        password: 'hashedPassword',
        emailVerified: 'emailConfirmedAt',
        image: 'profileImageUrl',
        createdAt: 'registeredAt',
      },
    },
  }),
});
```

---

## Schema Mapping con Mongoose

Tu esquema MongoDB existente:

```typescript
import mongoose from 'mongoose';

const appUserSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  emailAddr: { type: String, required: true, unique: true },
  displayName: String,
  pwdHash: String,
  emailVerifiedDate: Date,
  avatarUrl: String,
  signupDate: { type: Date, default: Date.now },
});

export const AppUserModel = mongoose.model('AppUser', appUserSchema, 'app_users');
```

Configuración NexusAuth:

```typescript
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';

export const nexusAuth = NexusAuth({
  adapter: MongooseAdapter({
    models: {
      User: AppUserModel,
    },
    mapping: {
      user: {
        id: '_id',
        email: 'emailAddr',
        name: 'displayName',
        password: 'pwdHash',
        emailVerified: 'emailVerifiedDate',
        image: 'avatarUrl',
        createdAt: 'signupDate',
      },
    },
  }),
});
```

---

## Schema Mapping con Raw SQL

Para máxima flexibilidad (cualquier DB sin ORM):

```typescript
import { SQLAdapter } from '@nexusauth/sql-adapter';
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  database: 'legacy_db',
  user: 'postgres',
  password: 'password',
});

export const nexusAuth = NexusAuth({
  adapter: SQLAdapter({
    dialect: 'postgres',

    executeQuery: async (query, params) => {
      const result = await pool.query(query, params);
      return result.rows;
    },

    tables: {
      users: 'app_users',
      accounts: 'oauth_accounts',
      sessions: 'user_sessions',
      verificationTokens: 'email_tokens',
    },

    columns: {
      users: {
        id: 'user_id',
        email: 'email_address',
        name: 'full_name',
        password: 'hashed_password',
        emailVerified: 'email_confirmed_at',
        image: 'profile_image_url',
        createdAt: 'registered_at',
      },
      // También puedes mapear accounts, sessions, etc.
    },
  }),
});
```

---

## Mapeo de Tablas/Collections

Puedes cambiar los nombres de **todas** las tablas:

### TypeORM

```typescript
TypeORMAdapter(dataSource, {
  entities: {
    user: CustomUserEntity,
    account: CustomAccountEntity,
    session: CustomSessionEntity,
    verificationToken: CustomTokenEntity,
  },
  // Las entidades ya tienen sus nombres de tabla definidos
})
```

### Mongoose

```typescript
MongooseAdapter({
  models: {
    User: AppUserModel,      // Colección: 'app_users'
    Account: OAuthModel,     // Colección: 'oauth_accounts'
    Session: SessionModel,   // Colección: 'user_sessions'
  },
  mapping: {
    // ... field mappings
  },
})
```

---

## Campos Opcionales

No todos los campos son obligatorios. Mapea solo lo que necesites:

```typescript
mapping: {
  user: {
    id: 'user_id',
    email: 'email_address',
    // 'name' es opcional - no lo mapeamos
    // 'image' es opcional - no lo mapeamos
    // NexusAuth manejará los campos faltantes como null
  },
}
```

---

## Validación de Mapping

NexusAuth valida automáticamente que:
- ✅ Los campos mapeados existan en tu esquema
- ✅ Los tipos de datos sean compatibles
- ⚠️ Te advierte si faltan campos recomendados

Si hay un error, verás un mensaje claro:

```
Error: Field mapping 'email_address' not found in User entity.
Available fields: user_id, email_addr, full_name, ...
```

---

## Comparación con Competencia

### Auth.js

```typescript
// ❌ Auth.js: DEBES usar su schema exacto
import NextAuth from 'next-auth';

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  // Prisma schema DEBE tener:
  // - model User con campos: id, email, name, emailVerified
  // - NO permite renombrar campos
});
```

### Better Auth

```typescript
// ❌ Better Auth: También fuerza su schema
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  database: prisma,
  // Mismo problema: schema forzado
});
```

### NexusAuth

```typescript
// ✅ NexusAuth: SE ADAPTA a tu schema
export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(dataSource, {
    mapping: {
      user: {
        id: 'cualquier_nombre_que_uses',
        email: 'tu_columna_de_email',
        // ...
      },
    },
  }),
});
```

---

## Caso de Uso Real: Startup que Adquirió Otra Empresa

**Escenario**: Tu startup adquirió otra empresa y ahora tienes que integrar sus usuarios.

```typescript
// Base de datos de TU empresa
const yourDB = new DataSource({
  type: 'postgres',
  entities: [YourUser],
});

// Base de datos de la EMPRESA ADQUIRIDA
const acquiredDB = new DataSource({
  type: 'mysql',
  entities: [AcquiredUser],
});

// NexusAuth puede trabajar con AMBAS
const yourAuth = NexusAuth({
  adapter: TypeORMAdapter(yourDB, {
    mapping: {
      user: { id: 'userId', email: 'userEmail', /* ... */ },
    },
  }),
});

const acquiredAuth = NexusAuth({
  adapter: TypeORMAdapter(acquiredDB, {
    mapping: {
      user: { id: 'user_id', email: 'email_addr', /* ... */ },
    },
  }),
});
```

**Auth.js o Better Auth**: Tendrías que migrar **toda** la base de datos de la empresa adquirida.

---

## Mejores Prácticas

### 1. Documenta tu Mapping

```typescript
// src/auth/schema-mapping.ts
export const USER_FIELD_MAPPING = {
  id: 'user_id',
  email: 'email_address',
  name: 'full_name',
  password: 'hashed_password',
  emailVerified: 'email_confirmed_at',
  image: 'profile_image_url',
  createdAt: 'registered_at',
} as const;

// src/auth/nexus.config.ts
import { USER_FIELD_MAPPING } from './schema-mapping';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(dataSource, {
    mapping: {
      user: USER_FIELD_MAPPING,
    },
  }),
});
```

### 2. Usa TypeScript para Type Safety

```typescript
import { User } from './entities/User';

type UserFieldMapping = {
  [K in keyof User]?: keyof User;
};

const mapping: UserFieldMapping = {
  id: 'user_id',
  email: 'email_address',
  // TypeScript validará que 'user_id' y 'email_address' existan en User
};
```

### 3. Testea el Mapping

```typescript
import { describe, it, expect } from 'vitest';

describe('Schema Mapping', () => {
  it('should correctly map legacy user fields', async () => {
    const user = await nexusAuth.register({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });

    // Verifica que se guardó en las columnas correctas
    const dbUser = await dataSource.query(
      'SELECT user_id, email_address, full_name FROM app_users WHERE user_id = $1',
      [user.id]
    );

    expect(dbUser[0].user_id).toBe(user.id);
    expect(dbUser[0].email_address).toBe('test@example.com');
    expect(dbUser[0].full_name).toBe('Test User');
  });
});
```

---

## Próximos Pasos

- 👉 [Integración con Next.js](./05-nextjs-integration.md)
- 👉 [Migrar desde Auth.js](../migration-guides/from-authjs.md)
- 👉 [Ejemplos Completos](../examples/)
