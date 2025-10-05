# @nexusauth/typeorm-adapter

This library is the official TypeORM adapter for `nexus-auth`.

## Building

Run `nx build @nexusauth/typeorm-adapter` to build the library.

## Usage

To use this adapter, you need to pass it to the `NexusAuth` core constructor. You can either pass a `DataSource` instance or `DataSourceOptions`.

### Basic Configuration

```typescript
import { NexusAuth } from "@nexusauth/core";
import { TypeORMAdapter } from "@nexusauth/typeorm-adapter";

const auth = new NexusAuth({
  adapter: TypeORMAdapter({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "user",
    password: "password",
    database: "mydatabase",
    synchronize: true, // Be careful with this in production
  }),
  // ... other options
});
```

### Custom Entities

You can provide your own entities to override the default ones. Your custom entities must implement the corresponding interfaces from `@nexusauth/core`.

```typescript
import { TypeORMAdapter } from "@nexusauth/typeorm-adapter";
import { UserEntity } from "./my-entities"; // Your custom entity

const adapter = TypeORMAdapter({
  type: "postgres",
  // ... other datasource options
  entities: {
    user: UserEntity,
  }
});
```

## Migrations

`synchronize: true` is great for development, but for production, you should use migrations to manage your database schema.

This adapter is designed to integrate with TypeORM's standard migration workflow.

### 1. Create a Data Source file

Create a file named `data-source.ts` (or similar) in the root of your project. This file will be used by the TypeORM CLI.

```typescript
// data-source.ts
import { DataSource, DataSourceOptions } from "typeorm";
import { UserEntity, AccountEntity, SessionEntity } from "@nexusauth/typeorm-adapter/entities";

// If you have custom entities, import them instead
// import { MyUserEntity } from './path/to/your/entities';

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "user",
  password: "password",
  database: "mydatabase",
  synchronize: false, // Migrations require this to be false
  entities: [
    UserEntity,       // or MyUserEntity
    AccountEntity,
    SessionEntity,
  ],
  migrations: ["src/migrations/*.ts"], // Path to your migrations
};

export const AppDataSource = new DataSource(dataSourceOptions);
```

### 2. Configure your `package.json`

Add scripts to your `package.json` to run the TypeORM CLI.

```json
"scripts": {
  "typeorm": "typeorm-ts-node-commonjs -d ./data-source.ts"
}
```

*Note: `typeorm-ts-node-commonjs` is used here. You might use `ts-node` or another runner depending on your project setup.*

### 3. Generate Migrations

Now, you can generate a migration that will create the necessary tables (`users`, `accounts`, `sessions`).

```bash
npm run typeorm migration:generate src/migrations/InitialAuthSetup
```

This will create a new migration file in `src/migrations/`.

### 4. Run Migrations

Run the migration to apply the changes to your database.

```bash
npm run typeorm migration:run
```

Your database is now set up with the required tables for `@nexusauth/typeorm-adapter`.
