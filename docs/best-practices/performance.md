# Best Practices - Performance

Optimizaciones para mejorar el rendimiento de NexusAuth.

---

## Database Query Optimization

### Usar Índices

```sql
-- PostgreSQL
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_verification_tokens ON verification_tokens(token);
```

**TypeORM**:

```typescript
@Entity('users')
export class User {
  @Column({ unique: true })
  @Index() // ✅ Añadir índice
  email: string;
}
```

**Prisma**:

```prisma
model User {
  email String @unique

  @@index([email]) // ✅ Índice explícito
}
```

---

## Connection Pooling

### TypeORM

```typescript
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'nexusauth',

  // ✅ Pool configuration
  extra: {
    max: 20, // Máximo de conexiones
    min: 5,  // Mínimo de conexiones
    idleTimeoutMillis: 30000,
  },
});
```

### Prisma

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // ✅ Connection pool
  // Prisma maneja el pool automáticamente
  // Puedes configurarlo en DATABASE_URL:
  // postgresql://user:pass@localhost:5432/db?connection_limit=20
});
```

### Raw SQL (pg)

```typescript
import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  database: 'nexusauth',
  user: 'postgres',
  password: 'password',

  // ✅ Pool configuration
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

---

## JWT Optimization

### Mantener Payloads Pequeños

#### ❌ MAL - Payload grande

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
      token.image = user.image;
      token.createdAt = user.createdAt;
      token.preferences = user.preferences; // ❌ Datos innecesarios
      token.metadata = user.metadata; // ❌ Más datos
    }
    return token;
  },
}
```

**Resultado**: JWT de ~500+ bytes

#### ✅ BIEN - Payload mínimo

```typescript
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id; // ✅ Solo ID
    }
    return token;
  },

  async session({ session, token }) {
    // Fetch datos adicionales solo cuando se necesitan
    if (token.id) {
      const user = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, email: true, name: true }, // ✅ Select específico
      });
      session.user = user;
    }
    return session;
  },
}
```

**Resultado**: JWT de ~150 bytes

---

## Caching

### Cache de Sessions con Redis

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
});

export const nexusAuth = NexusAuth({
  // ... config

  callbacks: {
    async session({ session, token }) {
      const cached = await redis.get(`session:${token.id}`);

      if (cached) {
        return JSON.parse(cached); // ✅ Cache hit
      }

      // Fetch from DB
      const user = await prisma.user.findUnique({
        where: { id: token.id as string },
      });

      session.user = user;

      // Cache por 15 minutos
      await redis.setex(`session:${token.id}`, 900, JSON.stringify(session));

      return session;
    },
  },
});
```

### Cache de User Lookups

```typescript
import NodeCache from 'node-cache';

const userCache = new NodeCache({
  stdTTL: 600, // 10 minutos
  checkperiod: 120,
});

async function getUserById(id: string) {
  // Check cache
  const cached = userCache.get(id);
  if (cached) return cached;

  // Fetch from DB
  const user = await prisma.user.findUnique({ where: { id } });

  // Store in cache
  if (user) {
    userCache.set(id, user);
  }

  return user;
}
```

---

## Lazy Loading

### Cargar Datos Solo Cuando Se Necesiten

#### ❌ MAL - Eager loading

```typescript
// Server Component
export default async function DashboardPage() {
  const session = await getSession(nexusAuth);

  // ❌ Fetch TODA la data del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
      sessions: true,
      posts: true,
      comments: true,
      // ... todo
    },
  });

  return <Dashboard user={user} />;
}
```

#### ✅ BIEN - Lazy loading

```typescript
// Server Component
export default async function DashboardPage() {
  const session = await getSession(nexusAuth);

  // ✅ Solo los campos necesarios
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
    },
  });

  return <Dashboard user={user} />;
}

// Cargar posts en un componente separado
async function UserPosts({ userId }: { userId: string }) {
  const posts = await prisma.post.findMany({
    where: { userId },
    take: 10, // ✅ Limit
  });

  return <PostList posts={posts} />;
}
```

---

## Batch Queries

### Usar DataLoader o Similar

```bash
npm install dataloader
```

```typescript
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (ids: readonly string[]) => {
  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
  });

  // Mapear en el orden correcto
  const userMap = new Map(users.map((user) => [user.id, user]));
  return ids.map((id) => userMap.get(id) || null);
});

// Uso
const user1 = await userLoader.load('user-id-1');
const user2 = await userLoader.load('user-id-2');
// Solo 1 query a la DB en lugar de 2
```

---

## Reduce Database Roundtrips

### ❌ MAL - Múltiples queries

```typescript
router.post('/auth/signin', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
  });

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
  });

  // 3 queries separadas ❌
});
```

### ✅ BIEN - Una query con include

```typescript
router.post('/auth/signin', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.body.email },
    include: {
      accounts: true,
      sessions: true,
    },
  });

  // 1 query ✅
});
```

---

## bcrypt Performance

### Ajustar Salt Rounds

```typescript
export const nexusAuth = NexusAuth({
  password: {
    saltRounds: 10, // ✅ Balance entre seguridad y velocidad
    // 10 = ~100ms
    // 12 = ~400ms
    // 14 = ~1.6s
  },
});
```

**Recomendación**: 10-12 salt rounds

---

## Optimizar Middleware

### Evitar Validar Token en TODAS las Rutas

#### ❌ MAL - Middleware global

```typescript
// Valida token en TODAS las rutas (incluso públicas)
app.use(authenticate);
```

#### ✅ BIEN - Solo en rutas protegidas

```typescript
// Rutas públicas
app.get('/', (req, res) => res.send('Home'));
app.get('/about', (req, res) => res.send('About'));

// Rutas protegidas
app.get('/dashboard', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/profile', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

**O usar middleware condicional**:

```typescript
import { createAuthMiddleware } from '@nexus-auth/express-helpers';

const authMiddleware = createAuthMiddleware(nexusAuth, {
  publicPaths: ['/', '/about', '/login', '/signup'],
});

app.use(authMiddleware);
```

---

## Compression

```bash
npm install compression
```

```typescript
import compression from 'compression';

app.use(compression()); // ✅ Comprimir responses
```

---

## HTTP/2

Si usas Node.js 16+:

```typescript
import http2 from 'http2';
import express from 'express';

const app = express();

const server = http2.createSecureServer(
  {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem'),
  },
  app
);

server.listen(3000);
```

---

## Monitoring

### Medir Performance de Queries

```typescript
// Prisma
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

### APM Tools

- [New Relic](https://newrelic.com/)
- [Datadog](https://www.datadoghq.com/)
- [Sentry Performance](https://sentry.io/)

---

## Checklist de Performance

### Database
- [ ] Índices en columnas frecuentemente consultadas
- [ ] Connection pooling configurado
- [ ] Select solo campos necesarios
- [ ] Batch queries cuando sea posible

### JWT
- [ ] Payloads mínimos (solo ID)
- [ ] Expiración corta de access tokens
- [ ] Cache de sessions (Redis)

### Caching
- [ ] Redis para sessions
- [ ] Cache de user lookups
- [ ] CDN para assets estáticos

### Code
- [ ] Lazy loading de datos
- [ ] Middleware solo en rutas protegidas
- [ ] bcrypt salt rounds optimizados (10-12)

### Infrastructure
- [ ] Compression habilitado
- [ ] HTTP/2 si es posible
- [ ] APM para monitoreo

---

## Benchmarks

### Comparativa de Adapters

| Adapter | Query Time (avg) | Memory Usage |
|---------|------------------|--------------|
| TypeORM | ~5ms | 50MB |
| Prisma | ~3ms | 40MB |
| Raw SQL | ~2ms | 30MB |
| Mongoose | ~8ms | 60MB |

**Conclusión**: Raw SQL > Prisma > TypeORM > Mongoose para performance pura.

**Pero**: Considera también DX (developer experience) y features.

---

## Próximos Pasos

- 👉 [Security Best Practices](./security.md)
- 👉 [Ejemplos de Producción](../examples/)
