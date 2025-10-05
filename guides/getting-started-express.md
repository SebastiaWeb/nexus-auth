# Getting Started with Express + NexusAuth

This guide will help you integrate NexusAuth into your Express.js application.

## Prerequisites

- Node.js 16+ installed
- Express.js project set up
- A database (PostgreSQL, MySQL, or SQLite)

## Installation

### 1. Install Core Packages

```bash
npm install @nexusauth/core @nexusauth/express-helpers
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

### 2. Install Database Adapter

Choose one based on your database:

```bash
# For TypeORM (PostgreSQL, MySQL, SQLite, MSSQL)
npm install @nexusauth/typeorm-adapter typeorm pg

# For Prisma
npm install @nexusauth/prisma-adapter @prisma/client

# For MongoDB
npm install @nexusauth/mongoose-adapter mongoose

# For Raw SQL (any SQL database)
npm install @nexusauth/sql-adapter pg
```

### 3. Install OAuth Providers (Optional)

```bash
npm install @nexusauth/providers
```

## Quick Start

### Step 1: Configure Database

**Using TypeORM:**

```typescript
import { DataSource } from 'typeorm';
import { TypeORMAdapter } from '@nexusauth/typeorm-adapter';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'your_user',
  password: 'your_password',
  database: 'your_db',
  synchronize: true, // Auto-create tables (dev only)
  entities: [
    // TypeORMAdapter will auto-register entities
  ]
});

await dataSource.initialize();

const adapter = new TypeORMAdapter({ dataSource });
```

**Using Raw SQL:**

```typescript
import { SQLAdapter } from '@nexusauth/sql-adapter';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'your_user',
  password: 'your_password',
  database: 'your_db'
});

const adapter = new SQLAdapter({
  dialect: 'postgresql',
  executeQuery: async (query, params) => {
    const result = await pool.query(query, params);
    return result.rows;
  }
});

// Create tables (run once)
await adapter.createTables();
```

### Step 2: Initialize NexusAuth

```typescript
import { NexusAuth } from '@nexusauth/core';

const auth = new NexusAuth({
  adapter,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },
  session: {
    strategy: 'jwt',
    updateAge: 86400 // 24 hours
  }
});
```

### Step 3: Add Routes

```typescript
import express from 'express';
import {
  createAuthMiddleware,
  requireAuth
} from '@nexusauth/express-helpers';

const app = express();
app.use(express.json());

// Add auth middleware
app.use(createAuthMiddleware(auth));

// Registration
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const result = await auth.register({
      email,
      password,
      name
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await auth.login({
      email,
      password
    });

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Protected route
app.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    session: req.session
  });
});

// Logout
app.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    await auth.invalidateSession(req.session!.id);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### Step 4: Add OAuth (Optional)

```typescript
import { GoogleProvider } from '@nexusauth/providers';

const googleProvider = new GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/google/callback'
});

// OAuth initiation
app.get('/auth/google', async (req, res) => {
  const authUrl = await auth.getAuthorizationUrl(googleProvider);
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    const result = await auth.handleOAuthCallback(
      googleProvider,
      code as string
    );

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
```

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# JWT
JWT_SECRET=your-super-secret-jwt-key

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Next Steps

- [Password Reset Flow](./password-reset.md)
- [Email Verification](./email-verification.md)
- [Custom Schema Mapping](./schema-mapping.md)
- [Migration from Auth.js](./migration-from-authjs.md)

## Full Example

Check out the complete Express + TypeORM example in `/examples/express-typeorm`.

## Troubleshooting

### "Cannot find module @nexusauth/core"
Make sure you've installed all peerDependencies:
```bash
npm install jsonwebtoken bcrypt
```

### Database connection errors
Verify your database credentials and ensure the database is running.

### JWT verification fails
Check that your `JWT_SECRET` is consistent across server restarts.

## Support

- [Documentation](../DOCUMENTATION.md)
- [GitHub Issues](https://github.com/yourusername/nexus-auth/issues)
- [API Reference](./api-reference.md)
