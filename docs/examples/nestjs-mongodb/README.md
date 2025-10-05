# Ejemplo: NestJS + Mongoose + MongoDB

Ejemplo completo de API con NestJS y autenticación usando NexusAuth.

---

## Stack

- **Framework**: NestJS 11
- **Database**: MongoDB
- **ODM**: Mongoose
- **Auth**: NexusAuth
- **Language**: TypeScript

---

## Características

- ✅ Arquitectura modular con NestJS
- ✅ Guards y Decorators personalizados
- ✅ Dependency Injection
- ✅ Registro y login con credentials
- ✅ OAuth con Google
- ✅ Protected endpoints
- ✅ DTOs con class-validator
- ✅ Swagger documentation

---

## Estructura del Proyecto

```
nestjs-mongodb/
├── src/
│   ├── auth/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── dto/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   └── auth.service.ts
│   ├── users/
│   │   ├── schemas/
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── config/
│   │   └── nexus-auth.config.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Instalación

### 1. Instalar dependencias

```bash
cd examples/nestjs-mongodb
npm install
```

### 2. Configurar MongoDB

```bash
# Iniciar MongoDB
mongod --dbpath=/path/to/data

# O usar Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Variables de entorno

Copiar `.env.example` a `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/nexusauth_nestjs

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz123

# App
APP_URL=http://localhost:3000
PORT=3000
```

### 4. Iniciar servidor

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

Servidor corriendo en `http://localhost:3000`

Swagger docs en `http://localhost:3000/api`

---

## Endpoints

### Autenticación

#### POST `/auth/signup`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### POST `/auth/signin`

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### GET `/auth/google`

Iniciar OAuth flow con Google.

#### GET `/auth/callback/google?code=...`

Callback de Google OAuth.

#### POST `/auth/refresh`

```json
{
  "refreshToken": "eyJhbGc..."
}
```

---

### Protected Endpoints

Requieren `Authorization: Bearer <token>` header.

#### GET `/users/profile`

Obtener perfil del usuario actual.

#### PUT `/users/profile`

Actualizar perfil.

```json
{
  "name": "Jane Doe"
}
```

---

## Código Destacado

### Guard Personalizado

```typescript
import { NexusAuthGuard } from '@nexus-auth/nestjs-helpers';

@Controller('users')
@UseGuards(NexusAuthGuard)
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return { user };
  }
}
```

### Decorators

```typescript
import { CurrentUser, CurrentUserId } from '@nexus-auth/nestjs-helpers';

@Get('profile')
@UseGuards(NexusAuthGuard)
async getProfile(
  @CurrentUser() user: any,
  @CurrentUserId() userId: string,
) {
  return { user, userId };
}
```

### Module Registration

```typescript
import { NexusAuthModule } from '@nexus-auth/nestjs-helpers';

@Module({
  imports: [
    NexusAuthModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        adapter: MongooseAdapter(/* ... */),
        providers: [GoogleProvider(/* ... */)],
        jwt: {
          secret: configService.get('JWT_SECRET'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

---

## Swagger

Documentación automática disponible en `/api`:

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('NexusAuth NestJS Example')
  .setDescription('API with NexusAuth authentication')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

---

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## Recursos

- [NestJS Docs](https://docs.nestjs.com/)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [NexusAuth Docs](../../DOCUMENTATION.md)
