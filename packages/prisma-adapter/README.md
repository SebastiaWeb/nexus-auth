# @nexusauth/prisma-adapter

Prisma adapter for NexusAuth with support for schema mapping to existing databases.

## Features

- ✅ **Schema Mapping**: Map to existing database columns and table names
- ✅ **Type-Safe**: Full TypeScript support with Prisma's generated types
- ✅ **Flexible**: Works with any Prisma-supported database
- ✅ **Lightweight**: Uses peerDependencies to avoid duplicate installations
- ✅ **Production Ready**: Battle-tested adapter implementation

## Installation

```bash
npm install @nexusauth/core @nexusauth/prisma-adapter @prisma/client
# or
pnpm add @nexusauth/core @nexusauth/prisma-adapter @prisma/client
# or
yarn add @nexusauth/core @nexusauth/prisma-adapter @prisma/client
```

## Requirements

- `@prisma/client`: ^5.0.0 || ^6.0.0
- `@nexusauth/core`: workspace:*

## Basic Usage

### 1. Define your Prisma Schema

```prisma
// prisma/schema.prisma
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

### 2. Configure NexusAuth with Prisma Adapter

```typescript
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
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

## Advanced Usage: Schema Mapping

If you have an existing database with custom column names, you can map them:

### Existing Legacy Schema

```prisma
model LegacyUser {
  user_id              String    @id @default(cuid()) @map("user_id")
  email_address        String    @unique @map("email_address")
  full_name            String?   @map("full_name")
  hashed_password      String?   @map("hashed_password")
  email_confirmed_at   DateTime? @map("email_confirmed_at")
  profile_picture      String?   @map("profile_picture")
  password_reset_token String?   @map("password_reset_token")
  password_reset_exp   DateTime? @map("password_reset_exp")
  created_at           DateTime  @default(now()) @map("created_at")
  updated_at           DateTime  @updatedAt @map("updated_at")

  @@map("users")
}
```

### Configure with Field Mapping

```typescript
const auth = new NexusAuth({
  adapter: PrismaAdapter({
    client: prisma,

    // Map table names
    tableNames: {
      user: 'legacyUser',     // Prisma model name
      account: 'userAccount',
      session: 'userSession',
    },

    // Map field names
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
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

## API Reference

### `PrismaAdapter(config)`

Creates a Prisma adapter instance for NexusAuth.

#### Parameters

- `config.client` (required): PrismaClient instance
- `config.fieldMapping` (optional): Object mapping NexusAuth fields to your database columns
  - `user`: User field mappings
  - `account`: Account field mappings
  - `session`: Session field mappings
- `config.tableNames` (optional): Object mapping NexusAuth table names to your Prisma model names
  - `user`: User model name (default: 'user')
  - `account`: Account model name (default: 'account')
  - `session`: Session model name (default: 'session')

#### Returns

`BaseAdapter` - Adapter implementation compatible with NexusAuth

## Examples

### Using with Next.js

```typescript
// lib/auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = new NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),
  secret: process.env.AUTH_SECRET!,
});
```

### Using with Express

```typescript
import express from 'express';
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

const auth = new NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),
  secret: process.env.AUTH_SECRET!,
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const result = await auth.register({ email, password, name });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Supported Databases

Since this adapter uses Prisma, it supports all databases that Prisma supports:

- PostgreSQL
- MySQL
- SQLite
- SQL Server
- MongoDB
- CockroachDB

## License

MIT
