# Quick Start - NexusAuth

Configuración rápida para tener NexusAuth funcionando en **5 minutos**.

---

## Setup con TypeORM (PostgreSQL)

### 1. Crear tu Entidad de Usuario

```typescript
// src/entities/User.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  emailVerified: Date | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ nullable: true })
  image: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

### 2. Configurar TypeORM

```typescript
// src/db/data-source.ts
import { DataSource } from 'typeorm';
import { User } from '../entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User],
  synchronize: true, // Solo para desarrollo
  logging: false,
});
```

### 3. Configurar NexusAuth

```typescript
// src/auth/nexus.config.ts
import { NexusAuth } from '@nexusauth/core';
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';
import { AppDataSource } from '../db/data-source';
import { User } from '../entities/User';

export const nexusAuth = NexusAuth({
  adapter: TypeORMAdapter(AppDataSource, {
    entities: {
      user: User,
    },
  }),

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
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
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
      }
      return session;
    },
  },
});
```

### 4. Inicializar en tu Aplicación

```typescript
// src/index.ts
import express from 'express';
import { AppDataSource } from './db/data-source';
import { nexusAuth } from './auth/nexus.config';

const app = express();
app.use(express.json());

async function bootstrap() {
  // Inicializar DB
  await AppDataSource.initialize();
  console.log('✅ Database connected');

  // Rutas de autenticación
  app.post('/auth/signup', async (req, res) => {
    try {
      const { email, password, name } = req.body;

      const user = await nexusAuth.createUser({
        email,
        password,
        name,
      });

      res.json({ success: true, user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;

      const result = await nexusAuth.signIn('credentials', {
        email,
        password,
      });

      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.get('/auth/me', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const session = await nexusAuth.getSession(token);
      res.json(session);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
  });
}

bootstrap();
```

### 5. Variables de Entorno

Crea `.env`:

```env
# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=nexus_auth_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 6. Ejecutar

```bash
npm run dev
```

---

## Probar la API

### Registrar usuario

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }'
```

### Iniciar sesión

```bash
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

Respuesta:
```json
{
  "user": { "id": "...", "email": "user@example.com" },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### Obtener sesión actual

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## ✅ ¡Listo!

Ahora tienes:
- ✅ Registro de usuarios
- ✅ Login con credenciales
- ✅ Sesiones con JWT
- ✅ Endpoints protegidos

---

## Próximos Pasos

- 👉 [Añadir OAuth (Google, GitHub)](./03-oauth-setup.md)
- 👉 [Schema Mapping para DB Legacy](./04-schema-mapping.md)
- 👉 [Integración con Next.js](./05-nextjs-integration.md)
