# Getting Started with NestJS + NexusAuth

This guide will help you integrate NexusAuth into your NestJS application.

## Prerequisites

- Node.js 16+ installed
- NestJS 9+ project set up
- A database (PostgreSQL, MySQL, MongoDB, or SQLite)

## Installation

### 1. Install Core Packages

```bash
npm install @nexus-auth/core @nexus-auth/nestjs-helpers
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

### 2. Install Database Adapter

```bash
# For TypeORM (recommended for NestJS)
npm install @nexus-auth/typeorm-adapter typeorm @nestjs/typeorm pg

# For Mongoose
npm install @nexus-auth/mongoose-adapter mongoose @nestjs/mongoose

# For Prisma
npm install @nexus-auth/prisma-adapter @prisma/client
```

### 3. Install OAuth Providers (Optional)

```bash
npm install @nexus-auth/providers
```

## Quick Start

### Step 1: Configure Database Module

**Using TypeORM:**

`app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'mydb',
      autoLoadEntities: true,
      synchronize: true, // Disable in production
    }),
    AuthModule,
  ],
})
export class AppModule {}
```

**Using Mongoose:**

```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb'
    ),
    AuthModule,
  ],
})
export class AppModule {}
```

### Step 2: Create Auth Module

Create `auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NexusAuthModule } from '@nexus-auth/nestjs-helpers';
import { TypeORMAdapter } from '@nexus-auth/typeorm-adapter';
import { DataSource } from 'typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    NexusAuthModule.forRootAsync({
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => {
        const adapter = new TypeORMAdapter({ dataSource });

        return {
          adapter,
          jwt: {
            secret: process.env.JWT_SECRET || 'your-secret-key',
            expiresIn: '7d',
          },
          session: {
            strategy: 'jwt',
            updateAge: 86400, // 24 hours
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

### Step 3: Create Auth Controller

Create `auth/auth.controller.ts`:

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  NexusAuthGuard,
  Public,
  CurrentUser,
  CurrentSession,
} from '@nexus-auth/nestjs-helpers';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(NexusAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: { email: string; password: string; name?: string }
  ) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any, @CurrentSession() session: any) {
    return {
      user,
      session,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentSession() session: any) {
    return this.authService.logout(session.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; newPassword: string }
  ) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }
}
```

### Step 4: Create Auth Service

Create `auth/auth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { NexusAuthService } from '@nexus-auth/nestjs-helpers';

@Injectable()
export class AuthService {
  constructor(private readonly nexusAuth: NexusAuthService) {}

  async register(data: { email: string; password: string; name?: string }) {
    try {
      const result = await this.nexusAuth.register(data);
      return {
        success: true,
        user: result.user,
        token: result.token,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async login(credentials: { email: string; password: string }) {
    try {
      const result = await this.nexusAuth.login(credentials);
      return {
        success: true,
        user: result.user,
        token: result.token,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async logout(sessionId: string) {
    await this.nexusAuth.invalidateSession(sessionId);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async forgotPassword(email: string) {
    await this.nexusAuth.requestPasswordReset(email);
    return {
      success: true,
      message: 'Password reset email sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    await this.nexusAuth.resetPassword(token, newPassword);
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }
}
```

### Step 5: Protect Routes with Guards

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { NexusAuthGuard, CurrentUser } from '@nexus-auth/nestjs-helpers';

@Controller('users')
@UseGuards(NexusAuthGuard)
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // This route is public (no authentication required)
  @Public()
  @Get('public')
  getPublicData() {
    return { message: 'This is public' };
  }
}
```

### Step 6: Add OAuth (Optional)

Update `auth/auth.module.ts`:

```typescript
import { GoogleProvider } from '@nexus-auth/providers';

@Module({
  imports: [
    // ... other imports
    NexusAuthModule.forRootAsync({
      inject: [DataSource],
      useFactory: (dataSource: DataSource) => {
        const adapter = new TypeORMAdapter({ dataSource });

        return {
          adapter,
          jwt: {
            secret: process.env.JWT_SECRET!,
            expiresIn: '7d',
          },
          providers: [
            new GoogleProvider({
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              redirectUri: `${process.env.APP_URL}/auth/google/callback`,
            }),
          ],
        };
      },
    }),
  ],
  // ...
})
export class AuthModule {}
```

Add OAuth routes in `auth/auth.controller.ts`:

```typescript
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  // ... other methods

  @Public()
  @Get('google')
  async googleAuth(@Res() res: Response) {
    const authUrl = await this.authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  @Public()
  @Get('google/callback')
  async googleCallback(@Query('code') code: string) {
    return this.authService.handleGoogleCallback(code);
  }
}
```

Update `auth/auth.service.ts`:

```typescript
import { GoogleProvider } from '@nexus-auth/providers';

@Injectable()
export class AuthService {
  private googleProvider: GoogleProvider;

  constructor(private readonly nexusAuth: NexusAuthService) {
    this.googleProvider = new GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.APP_URL}/auth/google/callback`,
    });
  }

  async getGoogleAuthUrl() {
    return this.nexusAuth.getAuthorizationUrl(this.googleProvider);
  }

  async handleGoogleCallback(code: string) {
    const result = await this.nexusAuth.handleOAuthCallback(
      this.googleProvider,
      code
    );

    return {
      success: true,
      user: result.user,
      token: result.token,
    };
  }
}
```

## Using with MongoDB

For MongoDB, use the Mongoose adapter:

```typescript
import { MongooseAdapter } from '@nexus-auth/mongoose-adapter';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Module({
  imports: [
    NexusAuthModule.forRootAsync({
      inject: [Connection],
      useFactory: async (connection: Connection) => {
        const adapter = new MongooseAdapter({
          connection,
          // Optional: Custom collection names
          mapping: {
            user: { collection: 'users' },
            account: { collection: 'accounts' },
            session: { collection: 'sessions' },
          },
        });

        return {
          adapter,
          jwt: {
            secret: process.env.JWT_SECRET!,
            expiresIn: '7d',
          },
        };
      },
    }),
  ],
})
export class AuthModule {}
```

## Environment Variables

Create `.env`:

```env
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=mydb

# Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/mydb

# JWT
JWT_SECRET=your-super-secret-jwt-key

# App
APP_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Global Guard Setup

Apply auth guard globally in `main.ts`:

```typescript
import { NestFactory, Reflector } from '@nestjs/core';
import { NexusAuthGuard } from '@nexus-auth/nestjs-helpers';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply auth guard globally
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new NexusAuthGuard(reflector));

  await app.listen(3000);
}
bootstrap();
```

## Testing

Example test for auth controller:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should register a user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const result = { success: true, user: { id: '1', email: dto.email } };

    jest.spyOn(service, 'register').mockResolvedValue(result);

    expect(await controller.register(dto)).toBe(result);
  });
});
```

## Next Steps

- [Custom Decorators](./custom-decorators.md)
- [Validation & DTOs](./validation-dtos.md)
- [Exception Filters](./exception-filters.md)
- [WebSockets Auth](./websockets-auth.md)

## Full Example

Check out the complete NestJS + MongoDB example in `/examples/nestjs-mongodb`.

## Support

- [Documentation](../DOCUMENTATION.md)
- [API Reference](./api-reference.md)
- [GitHub Issues](https://github.com/yourusername/nexus-auth/issues)
