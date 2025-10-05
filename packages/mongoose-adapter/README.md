# @nexusauth/mongoose-adapter

Mongoose adapter for NexusAuth with support for schema mapping and custom schemas.

## Features

- ✅ **Schema Mapping**: Map to existing database fields and collection names
- ✅ **Custom Schemas**: Use your own Mongoose schemas
- ✅ **MongoDB Native**: Leverages Mongoose's full power with ObjectId support
- ✅ **Flexible**: Works with existing MongoDB databases
- ✅ **Lightweight**: Uses peerDependencies to avoid duplicate installations
- ✅ **Production Ready**: Battle-tested adapter implementation

## Installation

```bash
npm install @nexusauth/core @nexusauth/mongoose-adapter mongoose
# or
pnpm add @nexusauth/core @nexusauth/mongoose-adapter mongoose
# or
yarn add @nexusauth/core @nexusauth/mongoose-adapter mongoose
```

## Requirements

- `mongoose`: ^7.0.0 || ^8.0.0
- `@nexusauth/core`: workspace:*

## Basic Usage

### 1. Create Mongoose Connection

```typescript
import mongoose from 'mongoose';
import { NexusAuth } from '@nexusauth/core';
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';

// Create connection
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

### 2. Default Schema

The adapter creates default schemas automatically:

**User Schema:**
```typescript
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
```

**Account Schema:**
```typescript
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
// Unique index on [provider, providerAccountId]
```

**Session Schema:**
```typescript
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

## Advanced Usage

### Custom Collection Names

Map to existing collection names in your database:

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

### Field Mapping (Legacy Databases)

If you have an existing database with different field names:

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
        verificationToken: 'emailVerificationToken',
        verificationTokenExpiry: 'emailVerificationExpiry',
      },
      account: {
        userId: 'user',
        provider: 'oauthProvider',
        providerAccountId: 'providerUserId',
        // ... other fields
      },
    },
  }),
  secret: process.env.AUTH_SECRET!,
});
```

### Custom Schemas

You can provide your own Mongoose schemas:

```typescript
import { Schema } from 'mongoose';

const CustomUserSchema = new Schema({
  emailAddress: { type: String, required: true, unique: true },
  fullName: { type: String },
  hashedPassword: { type: String },
  emailConfirmedAt: { type: Date },
  profilePicture: { type: String },
  // Custom fields
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
  // ... standard fields
});

const auth = new NexusAuth({
  adapter: MongooseAdapter({
    connection,
    schemas: {
      User: CustomUserSchema,
      // Account and Session will use defaults
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

## API Reference

### `MongooseAdapter(config)`

Creates a Mongoose adapter instance for NexusAuth.

#### Parameters

- `config.connection` (required): Mongoose Connection instance
- `config.schemas` (optional): Custom Mongoose schemas
  - `User`: User schema
  - `Account`: Account schema
  - `Session`: Session schema
- `config.fieldMapping` (optional): Object mapping NexusAuth fields to your database fields
  - `user`: User field mappings
  - `account`: Account field mappings
  - `session`: Session field mappings
- `config.collectionNames` (optional): Object mapping collection names
  - `user`: User collection name (default: 'users')
  - `account`: Account collection name (default: 'accounts')
  - `session`: Session collection name (default: 'sessions')

#### Returns

`BaseAdapter` - Adapter implementation compatible with NexusAuth

## Examples

### Using with Express

```typescript
import express from 'express';
import mongoose from 'mongoose';
import { NexusAuth } from '@nexusauth/core';
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';

const app = express();
const connection = await mongoose.createConnection(process.env.MONGO_URL!);

const auth = new NexusAuth({
  adapter: MongooseAdapter({ connection }),
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

### Using with Next.js

```typescript
// lib/auth.ts
import mongoose from 'mongoose';
import { NexusAuth } from '@nexusauth/core';
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';

let connection: mongoose.Connection;

if (!connection) {
  connection = await mongoose.createConnection(process.env.MONGO_URL!);
}

export const auth = new NexusAuth({
  adapter: MongooseAdapter({ connection }),
  secret: process.env.AUTH_SECRET!,
});
```

### MERN Stack Integration

```typescript
import mongoose from 'mongoose';
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';
import { NexusAuth } from '@nexusauth/core';
import { GoogleProvider } from '@nexusauth/providers';

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

## MongoDB Features

- **ObjectId Support**: Automatic handling of MongoDB ObjectIds
- **Population**: Automatic population of user references in accounts and sessions
- **Indexes**: Automatic creation of unique indexes for optimal performance
- **Sparse Indexes**: Efficient handling of optional fields like `refreshToken`

## peerDependencies

```json
{
  "peerDependencies": {
    "@nexusauth/core": "workspace:*",
    "mongoose": "^7.0.0 || ^8.0.0"
  }
}
```

## License

MIT
