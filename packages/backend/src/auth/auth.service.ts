import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

export interface OAuthProfile {
  provider: 'google' | 'github';
  subject: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** Upsert the user from an OAuth profile and mint our own tokens. */
  async validateOAuth(profile: OAuthProfile) {
    const user = await this.users.upsertFromOAuth(profile);
    return this.issueTokens(user.id, user.username);
  }

  async validatePhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const username = `phone_${cleanPhone.slice(-4)}`;
    const email = `${username}@phone-auth.msg`;

    const profile: OAuthProfile = {
      provider: 'github',
      subject: `phone:${cleanPhone}`,
      email,
      username,
      displayName: `Уцышка (${phone})`,
      avatarUrl: null,
    };

    return this.validateOAuth(profile);
  }

  issueTokens(userId: string, username: string) {
    const accessToken = this.jwt.sign({ sub: userId, username });
    const refreshToken = this.jwt.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: process.env.REFRESH_EXPIRES_IN ?? '30d' },
    );
    return { accessToken, refreshToken };
  }

  verify(token: string) {
    return this.jwt.verify(token);
  }
}
