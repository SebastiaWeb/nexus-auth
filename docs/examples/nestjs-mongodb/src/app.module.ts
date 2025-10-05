import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NexusAuthModule } from '@nexusauth/nestjs-helpers';
import { MongooseAdapter } from '@nexusauth/mongoose-adapter';
import { GoogleProvider } from '@nexusauth/providers';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { User, UserSchema } from './users/schemas/user.schema';
import mongoose from 'mongoose';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    NexusAuthModule.registerAsync({
      imports: [ConfigModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
      useFactory: async (configService: ConfigService) => {
        const UserModel = mongoose.model(User.name, UserSchema);

        return {
          adapter: MongooseAdapter({
            models: {
              User: UserModel,
            },
          }),

          providers: configService.get('GOOGLE_CLIENT_ID')
            ? [
                GoogleProvider({
                  clientId: configService.get('GOOGLE_CLIENT_ID')!,
                  clientSecret: configService.get('GOOGLE_CLIENT_SECRET')!,
                  redirectUri: `${configService.get('APP_URL')}/auth/callback/google`,
                }),
              ]
            : [],

          session: {
            strategy: 'jwt',
            maxAge: 30 * 24 * 60 * 60,
          },

          jwt: {
            secret: configService.get('JWT_SECRET')!,
            expiresIn: '15m',
          },

          refreshToken: {
            enabled: true,
            expiresIn: '7d',
          },

          callbacks: {
            async jwt({ token, user }) {
              if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
              }
              return token;
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
