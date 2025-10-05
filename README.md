<div align="center">

# 🔐 NexusAuth

**Modern, Type-Safe Authentication for Node.js**

Framework agnostic • Database flexible • OAuth ready • TypeScript first

[![npm version](https://img.shields.io/npm/v/@nexus-auth/core.svg?style=flat-square)](https://www.npmjs.com/package/@nexus-auth/core)
[![npm downloads](https://img.shields.io/npm/dm/@nexus-auth/core.svg?style=flat-square)](https://www.npmjs.com/package/@nexus-auth/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

[Documentation](./docs) • [Examples](./guides) • [API Reference](./docs/api) • [Contributing](./CONTRIBUTING.md)

</div>

---

## ✨ Why NexusAuth?

Stop fighting with authentication libraries that force you into their way of doing things. **NexusAuth** adapts to your project, not the other way around.

```typescript
// That's it. Seriously.
import { NexusAuth } from '@nexus-auth/core';
import { PrismaAdapter } from '@nexus-auth/prisma-adapter';

const auth = new NexusAuth({
  adapter: new PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
});

// Registration
const user = await auth.register({ email, password });

// Login
const session = await auth.login({ email, password });

// OAuth (Google, GitHub, Facebook, Microsoft...)
const oauthUrl = await auth.oauth.getAuthorizationUrl('google');
```

## 🎯 Key Features

<table>
<tr>
<td>

### 🏗️ **Framework Agnostic**
Works with Next.js, NestJS, Express, or vanilla Node.js. You choose.

</td>
<td>

### 🗄️ **Any Database**
TypeORM, Prisma, Mongoose, SQL — or bring your own. Hexagonal architecture FTW.

</td>
</tr>

<tr>
<td>

### 🔐 **OAuth Ready**
Google, GitHub, Facebook, Microsoft providers out of the box. More coming.

</td>
<td>

### 📦 **Monorepo Structure**
Install only what you need. No bloat, just focused packages.

</td>
</tr>

<tr>
<td>

### 🎨 **TypeScript First**
Full type safety with strict mode. Autocomplete everything.

</td>
<td>

### 🔧 **Fully Extensible**
Events, callbacks, custom adapters. Bend it to your will.

</td>
</tr>
</table>

## 🚀 Quick Start

### Installation

```bash
# Core package (required)
pnpm add @nexus-auth/core

# Choose your database adapter
pnpm add @nexus-auth/prisma-adapter
# or
pnpm add @nexus-auth/typeorm-adapter
# or
pnpm add @nexus-auth/mongoose-adapter

# Optional: OAuth providers
pnpm add @nexus-auth/providers

# Optional: Framework helpers
pnpm add @nexus-auth/nextjs-helpers
# or
pnpm add @nexus-auth/nestjs-helpers
# or
pnpm add @nexus-auth/express-helpers
```

### Basic Usage

<details>
<summary><b>📘 With Prisma + Next.js</b></summary>

```typescript
// lib/auth.ts
import { NexusAuth } from '@nexus-auth/core';
import { PrismaAdapter } from '@nexus-auth/prisma-adapter';
import { GoogleProvider } from '@nexus-auth/providers';
import { prisma } from './prisma';

export const auth = new NexusAuth({
  adapter: new PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET!,
  oauth: {
    providers: [
      new GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: 'http://localhost:3000/auth/callback/google',
      }),
    ],
  },
});

// app/api/auth/register/route.ts
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await auth.register({ email, password });
  return Response.json(user);
}

// app/api/auth/login/route.ts
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const session = await auth.login({ email, password });
  return Response.json(session);
}
```

</details>

<details>
<summary><b>📗 With TypeORM + Express</b></summary>

```typescript
// auth.ts
import { NexusAuth } from '@nexus-auth/core';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';
import { AppDataSource } from './data-source';

export const auth = new NexusAuth({
  adapter: new TypeORMAdapter(AppDataSource),
  secret: process.env.AUTH_SECRET!,
});

// server.ts
import express from 'express';
import { auth } from './auth';

const app = express();
app.use(express.json());

app.post('/auth/register', async (req, res) => {
  const user = await auth.register(req.body);
  res.json(user);
});

app.post('/auth/login', async (req, res) => {
  const session = await auth.login(req.body);
  res.json(session);
});

// Protected route
app.get('/api/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = await auth.verifyToken(token);
  res.json(user);
});
```

</details>

<details>
<summary><b>📙 With Mongoose + NestJS</b></summary>

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { NexusAuth } from '@nexus-auth/core';
import { MongooseAdapter } from '@nexus-auth/mongoose-adapter';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  providers: [
    {
      provide: 'NEXUS_AUTH',
      useFactory: (connection: Connection) => {
        return new NexusAuth({
          adapter: new MongooseAdapter(connection),
          secret: process.env.AUTH_SECRET!,
        });
      },
      inject: ['DATABASE_CONNECTION'],
    },
  ],
  exports: ['NEXUS_AUTH'],
})
export class AuthModule {}

// auth.controller.ts
import { Controller, Post, Body, Inject } from '@nestjs/common';
import { NexusAuth } from '@nexus-auth/core';

@Controller('auth')
export class AuthController {
  constructor(@Inject('NEXUS_AUTH') private auth: NexusAuth) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
```

</details>

## 📦 Available Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@nexus-auth/core`](./packages/core) | ![npm](https://img.shields.io/npm/v/@nexus-auth/core?style=flat-square) | Core authentication library |
| **Database Adapters** |
| [`@nexus-auth/typeorm-adapter`](./packages/typeorm-adapter) | ![npm](https://img.shields.io/npm/v/@nexus-auth/typeorm-adapter?style=flat-square) | TypeORM adapter |
| [`@nexus-auth/prisma-adapter`](./packages/prisma-adapter) | ![npm](https://img.shields.io/npm/v/@nexus-auth/prisma-adapter?style=flat-square) | Prisma adapter |
| [`@nexus-auth/mongoose-adapter`](./packages/mongoose-adapter) | ![npm](https://img.shields.io/npm/v/@nexus-auth/mongoose-adapter?style=flat-square) | Mongoose adapter |
| [`@nexus-auth/sql-adapter`](./packages/sql-adapter) | ![npm](https://img.shields.io/npm/v/@nexus-auth/sql-adapter?style=flat-square) | Raw SQL adapter |
| **OAuth Providers** |
| [`@nexus-auth/providers`](./packages/providers) | ![npm](https://img.shields.io/npm/v/@nexus-auth/providers?style=flat-square) | Google, GitHub, Facebook, Microsoft |
| **Framework Helpers** |
| [`@nexus-auth/nextjs-helpers`](./packages/nextjs-helpers) | ![npm](https://img.shields.io/npm/v/@nexus-auth/nextjs-helpers?style=flat-square) | Next.js utilities |
| [`@nexus-auth/nestjs-helpers`](./packages/nestjs-helpers) | ![npm](https://img.shields.io/npm/v/@nexus-auth/nestjs-helpers?style=flat-square) | NestJS guards & decorators |
| [`@nexus-auth/express-helpers`](./packages/express-helpers) | ![npm](https://img.shields.io/npm/v/@nexus-auth/express-helpers?style=flat-square) | Express middleware |

## 🎨 Architecture

NexusAuth uses **Hexagonal Architecture** (Ports & Adapters) to keep the core logic clean and adaptable:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Next.js    │  │   NestJS     │  │   Express    │     │
│  │   Helpers    │  │   Helpers    │  │   Helpers    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│         ┌─────────────────┴─────────────────┐               │
│         │                                   │               │
│         │      @nexus-auth/core             │               │
│         │                                   │               │
│         │  • Registration/Login             │               │
│         │  • JWT Management                 │               │
│         │  • OAuth Flows                    │               │
│         │  • Password Hashing               │               │
│         │  • Session Management             │               │
│         │                                   │               │
│         └─────────┬───────────┬─────────────┘               │
│                   │           │                             │
│     ┌─────────────┘           └────────────┐                │
│     │                                      │                │
│  ┌──▼──────────┐                    ┌──────▼─────┐         │
│  │  Adapters   │                    │  Providers │         │
│  ├─────────────┤                    ├────────────┤         │
│  │ • TypeORM   │                    │ • Google   │         │
│  │ • Prisma    │                    │ • GitHub   │         │
│  │ • Mongoose  │                    │ • Facebook │         │
│  │ • SQL       │                    │ • Microsoft│         │
│  └─────────────┘                    └────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Swap databases without touching business logic
- ✅ Add new OAuth providers easily
- ✅ Test without real database connections
- ✅ Framework-independent core

[Learn more about our architecture →](./ARCHITECTURE.md)

## 🔐 Features

### Core Authentication
- ✅ Email/Password registration & login
- ✅ JWT access & refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Email verification (optional)
- ✅ Password reset flow
- ✅ Session management & invalidation

### OAuth 2.0
- ✅ Multiple provider support
- ✅ State parameter for CSRF protection
- ✅ Automatic user creation/linking
- ✅ Custom callback handling
- ✅ Scope management

### Security
- ✅ Secure password hashing
- ✅ JWT signing & verification
- ✅ CSRF protection (OAuth state)
- ✅ Rate limiting ready
- ✅ Environment-based secrets

### Developer Experience
- ✅ Full TypeScript support
- ✅ Strict mode compatible
- ✅ ESM modules
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Easy testing

## 🆚 Comparison

| Feature | NexusAuth | NextAuth | Passport | Auth0 |
|---------|-----------|----------|----------|-------|
| Framework Agnostic | ✅ | ❌ (Next.js only) | ✅ | ✅ |
| TypeScript First | ✅ | ✅ | ❌ | ✅ |
| Database Flexibility | ✅ Any | ⚠️ Limited adapters | ✅ Any | ❌ Cloud only |
| OAuth Built-in | ✅ | ✅ | ⚠️ Via strategies | ✅ |
| Self-hosted | ✅ | ✅ | ✅ | ❌ |
| Pricing | 🆓 Free & Open Source | 🆓 Free | 🆓 Free | 💰 Paid |
| Learning Curve | 🟢 Low | 🟢 Low | 🟡 Medium | 🟡 Medium |
| Customizable | ✅✅✅ Highly | ⚠️ Limited | ✅✅ Very | ❌ Limited |

## 📚 Documentation

- **[Getting Started Guide](./guides/getting-started.md)** - Your first NexusAuth project
- **[Core Concepts](./docs/concepts.md)** - Understanding the architecture
- **[API Reference](./docs/api/)** - Complete API documentation
- **[Migration Guides](./docs/migrations/)** - Migrating from other auth libraries
- **[Best Practices](./docs/best-practices.md)** - Security & performance tips
- **[Examples](./guides/)** - Real-world implementations

## 🤝 Contributing

We love contributions! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📖 Documentation improvements
- 🔧 Code contributions

Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

### Good First Issues

Looking for a place to start? Check out issues labeled [`good first issue`](https://github.com/yourusername/nexus-auth/issues?q=label%3A%22good+first+issue%22).

## 📖 Examples

Check out our [example projects](./guides/):

- [Express + TypeORM](./guides/express-typeorm-example/)
- [Next.js + Prisma](./guides/nextjs-prisma-example/)
- [NestJS + MongoDB](./guides/nestjs-mongodb-example/)

## 🛣️ Roadmap

- [x] Core authentication (register, login, JWT)
- [x] OAuth 2.0 support (Google, GitHub, Facebook, Microsoft)
- [x] Database adapters (TypeORM, Prisma, Mongoose, SQL)
- [x] Framework helpers (Next.js, NestJS, Express)
- [ ] 2FA/MFA support
- [ ] Role-based permissions (RBAC)
- [ ] Audit logging
- [ ] Enterprise providers (SAML, LDAP)
- [ ] Rate limiting middleware
- [ ] Session management UI

[View full roadmap →](https://github.com/yourusername/nexus-auth/projects)

## 🔒 Security

Security is our top priority. If you discover a vulnerability, please follow our [Security Policy](./.github/SECURITY.md).

**Never report security issues publicly.** Email us at: security@nexus-auth.dev

## 📄 License

NexusAuth is [MIT licensed](./LICENSE).

## 💬 Community & Support

- 💬 [GitHub Discussions](https://github.com/yourusername/nexus-auth/discussions) - Ask questions, share ideas
- 🐛 [Issue Tracker](https://github.com/yourusername/nexus-auth/issues) - Report bugs
- 📧 [Email Support](mailto:support@nexus-auth.dev) - Get help
- 🐦 [Twitter](https://twitter.com/nexus_auth) - Follow for updates

## 🌟 Show Your Support

If you find NexusAuth useful, please consider:

- ⭐ Starring the repository
- 🐦 Sharing on Twitter
- 📝 Writing a blog post
- 💰 [Sponsoring the project](https://github.com/sponsors/yourusername)

---

<div align="center">

**Built with ❤️ by the NexusAuth Team**

[Website](https://nexus-auth.dev) • [Documentation](./docs) • [npm](https://www.npmjs.com/package/@nexus-auth/core)

</div>
