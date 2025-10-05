# @nexusauth/nestjs-helpers

NestJS helpers for NexusAuth - Guards, Decorators, Module, and Service.

## Features

- ✅ **Authentication Guard**: Protect routes automatically
- ✅ **Decorators**: `@Public()`, `@CurrentUser()`, `@CurrentSession()`, `@CurrentUserId()`
- ✅ **NestJS Module**: Easy integration with dependency injection
- ✅ **Service**: Access NexusAuth methods in your services
- ✅ **TypeScript Ready**: Full type definitions included
- ✅ **Lightweight**: Minimal dependencies

## Installation

```bash
npm install @nexusauth/core @nexusauth/nestjs-helpers @nestjs/common @nestjs/core reflect-metadata
```

## Requirements

- `@nexusauth/core`: workspace:*
- `@nestjs/common`: ^9.0.0 || ^10.0.0 || ^11.0.0
- `@nestjs/core`: ^9.0.0 || ^10.0.0 || ^11.0.0
- `reflect-metadata`: ^0.1.13 || ^0.2.0

## Quick Start

### 1. Create NexusAuth Instance

```typescript
// auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = new NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET!,
});
```

### 2. Register Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NexusAuthModule, NexusAuthGuard } from '@nexusauth/nestjs-helpers';
import { auth } from './auth';

@Module({
  imports: [
    NexusAuthModule.forRoot({
      auth,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: NexusAuthGuard,
    },
  ],
})
export class AppModule {}
```

### 3. Use in Controllers

```typescript
// users.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Public, CurrentUser } from '@nexusauth/nestjs-helpers';

@Controller('users')
export class UsersController {
  @Get('me')
  getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public' };
  }
}
```

## Usage

### Authentication Guard

The `NexusAuthGuard` automatically protects all routes. Use `@Public()` to bypass authentication.

```typescript
// app.module.ts
import { APP_GUARD } from '@nestjs/core';
import { NexusAuthGuard } from '@nexusauth/nestjs-helpers';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: NexusAuthGuard,
    },
  ],
})
export class AppModule {}
```

### Decorators

#### `@Public()`

Mark a route as public (no authentication required).

```typescript
@Controller('auth')
export class AuthController {
  @Public()
  @Get('login')
  login() {
    return { message: 'Login page' };
  }
}
```

#### `@CurrentUser()`

Get the current authenticated user.

```typescript
@Controller('profile')
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
```

#### `@CurrentSession()`

Get the current session.

```typescript
@Controller('sessions')
export class SessionsController {
  @Get('current')
  getCurrentSession(@CurrentSession() session: Session) {
    return {
      expires: session.expires,
      userId: session.userId,
    };
  }
}
```

#### `@CurrentUserId()`

Get just the current user ID.

```typescript
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }
}
```

### NexusAuth Service

Access NexusAuth methods in your services.

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { NexusAuthService } from '@nexusauth/nestjs-helpers';

@Injectable()
export class UsersService {
  constructor(private readonly nexusAuthService: NexusAuthService) {}

  async getUserById(id: string) {
    return this.nexusAuthService.getUser(id);
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return this.nexusAuthService.updateUser({
      id,
      ...data,
    });
  }

  async deleteUser(id: string) {
    await this.nexusAuthService.deleteUserSessions(id);
    return this.nexusAuthService.deleteUser(id);
  }
}
```

### Module Registration

#### Synchronous Registration

```typescript
import { NexusAuthModule } from '@nexusauth/nestjs-helpers';
import { auth } from './auth';

@Module({
  imports: [
    NexusAuthModule.forRoot({
      auth,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

#### Asynchronous Registration

```typescript
import { NexusAuthModule } from '@nexusauth/nestjs-helpers';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NexusAuthModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        auth: createAuthInstance(configService),
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## Complete Example

### Setup

```typescript
// auth.ts
import { NexusAuth } from '@nexusauth/core';
import { PrismaAdapter } from '@nexusauth/prisma-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = new NexusAuth({
  adapter: PrismaAdapter({ client: prisma }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET!,
});
```

### Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NexusAuthModule, NexusAuthGuard, NexusAuthService } from '@nexusauth/nestjs-helpers';
import { auth } from './auth';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    NexusAuthModule.forRoot({
      auth,
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: NexusAuthGuard,
    },
    NexusAuthService,
  ],
})
export class AppModule {}
```

### Protected Controller

```typescript
// users.controller.ts
import { Controller, Get, Patch, Body, Delete } from '@nestjs/common';
import { CurrentUser, CurrentUserId } from '@nexusauth/nestjs-helpers';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateProfile(@CurrentUserId() userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateUser(userId, dto);
  }

  @Delete('me')
  deleteAccount(@CurrentUserId() userId: string) {
    return this.usersService.deleteUser(userId);
  }
}
```

### Public Controller

```typescript
// auth.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { Public } from '@nexusauth/nestjs-helpers';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('login')
  loginPage() {
    return { message: 'Login page' };
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  logout(@CurrentUserId() userId: string) {
    return this.authService.logout(userId);
  }
}
```

### Service with NexusAuth

```typescript
// users.service.ts
import { Injectable } from '@nestjs/common';
import { NexusAuthService } from '@nexusauth/nestjs-helpers';

@Injectable()
export class UsersService {
  constructor(private readonly nexusAuthService: NexusAuthService) {}

  async getUserById(id: string) {
    return this.nexusAuthService.getUser(id);
  }

  async getUserByEmail(email: string) {
    return this.nexusAuthService.getUserByEmail(email);
  }

  async updateUser(id: string, data: UpdateUserDto) {
    return this.nexusAuthService.updateUser({
      id,
      name: data.name,
    });
  }

  async deleteUser(id: string) {
    // Delete all sessions first
    await this.nexusAuthService.deleteUserSessions(id);
    // Then delete user
    return this.nexusAuthService.deleteUser(id);
  }
}
```

## API Reference

### Guard

#### `NexusAuthGuard`

Guard that validates authentication for all routes except those marked with `@Public()`.

### Decorators

- **`@Public()`** - Mark route as public (no authentication)
- **`@CurrentUser()`** - Get current authenticated user
- **`@CurrentSession()`** - Get current session
- **`@CurrentUserId()`** - Get current user ID

### Module

#### `NexusAuthModule.forRoot(options)`

Register NexusAuth module synchronously.

**Options:**
- `auth`: NexusAuth instance (required)
- `isGlobal`: Make module global (default: `true`)

#### `NexusAuthModule.forRootAsync(options)`

Register NexusAuth module asynchronously.

**Options:**
- `useFactory`: Factory function that returns module options
- `inject`: Dependencies to inject into factory
- `isGlobal`: Make module global (default: `true`)

### Service

#### `NexusAuthService`

Service providing access to NexusAuth methods.

**Methods:**
- `getInstance()` - Get NexusAuth instance
- `getAdapter()` - Get adapter instance
- `getUser(id)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `updateUser(user)` - Update user
- `deleteUser(userId)` - Delete user
- `getSessionAndUser(sessionToken)` - Get session and user
- `deleteSession(sessionToken)` - Delete session
- `deleteUserSessions(userId)` - Delete all user sessions

## TypeScript Support

All functions and decorators are fully typed. Import types from `@nexusauth/core`:

```typescript
import type { User, Session } from '@nexusauth/core';
```

## peerDependencies

```json
{
  "peerDependencies": {
    "@nexusauth/core": "workspace:*",
    "@nestjs/common": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "@nestjs/core": "^9.0.0 || ^10.0.0 || ^11.0.0",
    "reflect-metadata": "^0.1.13 || ^0.2.0"
  }
}
```

## License

MIT
