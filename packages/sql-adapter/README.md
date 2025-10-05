# @nexus-auth/sql-adapter

Raw SQL adapter for NexusAuth - Maximum flexibility for any SQL database.

## Features

- ✅ **Maximum Flexibility**: Use raw SQL with any SQL database
- ✅ **No ORM Required**: Bring your own database client (pg, mysql2, better-sqlite3, etc.)
- ✅ **Multi-Dialect Support**: PostgreSQL, MySQL, SQLite, MSSQL
- ✅ **Schema Mapping**: Map to existing database schemas
- ✅ **Zero Dependencies**: Only depends on @nexus-auth/core
- ✅ **Lightweight**: Minimal overhead, direct SQL execution
- ✅ **Production Ready**: Full control over your queries

## Installation

```bash
npm install @nexus-auth/core @nexus-auth/sql-adapter
# Plus your database client of choice
npm install pg # PostgreSQL
# or
npm install mysql2 # MySQL
# or
npm install better-sqlite3 # SQLite
```

## Requirements

- `@nexus-auth/core`: workspace:*
- A SQL database client of your choice (not a peerDependency - you choose!)

## Basic Usage

### PostgreSQL (pg)

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

### MySQL (mysql2)

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

### SQLite (better-sqlite3)

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

## Database Schema

The SQL adapter expects the following tables (or mapped equivalents):

### Users Table

```sql
-- PostgreSQL
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255),
  email_verified TIMESTAMP,
  image VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  verification_token VARCHAR(255),
  verification_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MySQL
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password VARCHAR(255),
  email_verified DATETIME,
  image VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expiry DATETIME,
  verification_token VARCHAR(255),
  verification_token_expiry DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Accounts Table

```sql
-- PostgreSQL
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- MySQL
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_account (provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Sessions Table

```sql
-- PostgreSQL
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  refresh_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MySQL
CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  expires DATETIME NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,
  refresh_token_expires DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Advanced Usage

### Schema Mapping (Legacy Databases)

If you have an existing database with different table/column names:

```typescript
const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      const result = await pool.query(sql, params);
      return result.rows;
    },
    dialect: 'postgres',

    // Map table names
    tableNames: {
      user: 'app_users',
      account: 'oauth_accounts',
      session: 'user_sessions',
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
        resetTokenExpiry: 'password_reset_expires_at',
        verificationToken: 'email_verification_token',
        verificationTokenExpiry: 'email_verification_expires_at',
      },
      account: {
        id: 'account_id',
        userId: 'user_id',
        provider: 'oauth_provider',
        providerAccountId: 'provider_user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresAt: 'expires_at',
        tokenType: 'token_type',
        scope: 'scope',
        idToken: 'id_token',
      },
      session: {
        id: 'session_id',
        sessionToken: 'token',
        userId: 'user_id',
        expires: 'expires_at',
        refreshToken: 'refresh_token',
        refreshTokenExpires: 'refresh_token_expires_at',
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

### Transaction Support

Wrap authentication operations in transactions:

```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      // Use a transaction for all queries
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

### Custom Query Logging

Add logging to all SQL queries:

```typescript
const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (sql, params) => {
      console.log('[SQL]', sql);
      console.log('[PARAMS]', params);

      const start = Date.now();
      const result = await pool.query(sql, params);
      const duration = Date.now() - start;

      console.log(`[DURATION] ${duration}ms`);
      return result.rows;
    },
    dialect: 'postgres',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

## API Reference

### `SQLAdapter(config)`

Creates a Raw SQL adapter instance for NexusAuth.

#### Parameters

- `config.query` (required): Query executor function
  - Type: `(sql: string, params?: any[]) => Promise<any[]>`
  - Should execute SQL and return array of results
- `config.dialect` (optional): Database dialect
  - Type: `'postgres' | 'mysql' | 'sqlite' | 'mssql'`
  - Default: `'postgres'`
  - Affects parameter placeholders ($1, ?, @p1)
- `config.tableNames` (optional): Table name mappings
  - `user`: User table name (default: 'users')
  - `account`: Account table name (default: 'accounts')
  - `session`: Session table name (default: 'sessions')
- `config.fieldMapping` (optional): Column name mappings
  - `user`: User field mappings
  - `account`: Account field mappings
  - `session`: Session field mappings

#### Returns

`BaseAdapter` - Adapter implementation compatible with NexusAuth

## Supported Databases

- **PostgreSQL**: Full support with `$1, $2` placeholders
- **MySQL/MariaDB**: Full support with `?` placeholders
- **SQLite**: Full support with `?` placeholders
- **Microsoft SQL Server**: Full support with `@p1, @p2` placeholders
- **Any SQL database**: As long as you can provide a query executor!

## Why Use Raw SQL Adapter?

### ✅ Use when:
- You need maximum control over your SQL queries
- Your database schema is highly customized
- You're using a less common SQL database
- You want to optimize specific queries
- You already have database utilities/helpers
- You don't want to add an ORM dependency

### ❌ Don't use when:
- You're starting a new project (use Prisma or TypeORM adapter)
- You want automatic migrations
- You prefer ORM abstractions

## peerDependencies

```json
{
  "peerDependencies": {
    "@nexus-auth/core": "workspace:*"
  }
}
```

**Note**: No database client dependencies! You choose which one to use.

## Examples

### Cloudflare D1 (Edge)

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

### Neon (Serverless PostgreSQL)

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const auth = new NexusAuth({
  adapter: SQLAdapter({
    query: async (query, params) => {
      return await sql(query, params);
    },
    dialect: 'postgres',
  }),
  secret: process.env.AUTH_SECRET!,
});
```

## License

MIT
