# Instalación de NexusAuth

## Requisitos Previos

- Node.js 16.x o superior
- npm, yarn, o pnpm
- TypeScript 4.5+ (recomendado)

---

## Instalación Básica

### 1. Instalar el Core

```bash
npm install @nexus-auth/core
# o
yarn add @nexus-auth/core
# o
pnpm add @nexus-auth/core
```

### 2. Instalar Dependencias Peer

El core requiere estas dependencias:

```bash
npm install bcrypt jsonwebtoken
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

---

## Instalar un Database Adapter

Elige **uno** según tu base de datos:

### TypeORM (PostgreSQL, MySQL, etc.)

```bash
npm install @nexus-auth/typeorm-adapter typeorm
```

**Drivers necesarios** (instala el que uses):
```bash
# PostgreSQL
npm install pg

# MySQL
npm install mysql2

# SQLite
npm install better-sqlite3
```

### Prisma

```bash
npm install @nexus-auth/prisma-adapter @prisma/client
npm install --save-dev prisma
```

### Mongoose (MongoDB)

```bash
npm install @nexus-auth/mongoose-adapter mongoose
```

### Raw SQL

```bash
npm install @nexus-auth/sql-adapter

# Luego instala tu cliente SQL (ej: pg, mysql2, better-sqlite3)
npm install pg
```

---

## Instalar OAuth Providers (Opcional)

Si necesitas OAuth (Google, GitHub, etc.):

```bash
npm install @nexus-auth/providers
```

**No tiene dependencias peer** - funciona out of the box.

---

## Instalar Framework Helpers (Opcional)

Según tu framework:

### Next.js

```bash
npm install @nexus-auth/nextjs-helpers next
```

Compatible con Next.js 13, 14, y 15 (App Router y Pages Router).

### NestJS

```bash
npm install @nexus-auth/nestjs-helpers @nestjs/common @nestjs/core reflect-metadata
```

### Express

```bash
npm install @nexus-auth/express-helpers express
npm install --save-dev @types/express
```

---

## Instalación Completa (Ejemplo)

Para un proyecto **Next.js + Prisma + Google OAuth**:

```bash
# Core
npm install @nexus-auth/core bcrypt jsonwebtoken

# Adapter
npm install @nexus-auth/prisma-adapter @prisma/client
npm install --save-dev prisma

# OAuth Provider
npm install @nexus-auth/providers

# Framework Helper
npm install @nexus-auth/nextjs-helpers next

# Types
npm install --save-dev @types/bcrypt @types/jsonwebtoken
```

---

## Verificar Instalación

Crea un archivo `test-nexus.ts`:

```typescript
import { NexusAuth } from '@nexus-auth/core';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';

console.log('✅ NexusAuth instalado correctamente');
```

Ejecuta:
```bash
npx tsx test-nexus.ts
```

Si no hay errores, ¡estás listo para continuar!

---

## Próximo Paso

👉 [Configuración Rápida](./02-quick-start.md)
