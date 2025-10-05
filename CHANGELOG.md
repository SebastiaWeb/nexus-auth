# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.1.0] - 2025-10-04

### ✨ Features

- **Core Package** - Initial release of @nexus-auth/core
- **Authentication Flows** - Email/password authentication with JWT
- **Password Management** - Reset and verification flows
- **Session Management** - JWT-based sessions with refresh tokens
- **OAuth Support** - Google, GitHub, Facebook, Microsoft providers

### 📦 Packages

- `@nexus-auth/core` - Core authentication library
- `@nexus-auth/typeorm-adapter` - TypeORM database adapter
- `@nexus-auth/prisma-adapter` - Prisma database adapter
- `@nexus-auth/mongoose-adapter` - MongoDB/Mongoose adapter
- `@nexus-auth/sql-adapter` - Raw SQL adapter
- `@nexus-auth/providers` - OAuth provider implementations
- `@nexus-auth/nextjs-helpers` - Next.js integration helpers
- `@nexus-auth/nestjs-helpers` - NestJS integration helpers
- `@nexus-auth/express-helpers` - Express.js integration helpers

### 🎯 Unique Features

- **Schema Mapping** - Map to existing database schemas
- **Framework Agnostic** - Works with Express, Next.js, NestJS, and more
- **peerDependencies** - Lightweight packages
- **TypeScript First** - Complete type safety
- **Hexagonal Architecture** - Easy to extend and maintain

### 📚 Documentation

- Complete API reference
- Getting started guides for Express, Next.js, and NestJS
- Migration guides from Auth.js and Passport.js
- Best practices and security guidelines
- Schema mapping documentation
