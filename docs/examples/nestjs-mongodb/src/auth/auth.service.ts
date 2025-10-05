import { Injectable } from '@nestjs/common';
import { NexusAuthService } from '@nexusauth/nestjs-helpers';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(private readonly nexusAuth: NexusAuthService) {}

  async signup(dto: SignupDto) {
    return this.nexusAuth.createUser(dto);
  }

  async signin(dto: SigninDto) {
    return this.nexusAuth.signIn('credentials', dto);
  }

  async googleSignIn(code: string) {
    return this.nexusAuth.signIn('google', { code });
  }

  getGoogleAuthUrl(state: string) {
    return this.nexusAuth.getAuthorizationUrl('google', { state });
  }
}
