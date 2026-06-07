import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import type { OAuthProfile } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      clientID: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      callbackURL: process.env.GITHUB_CALLBACK_URL ?? '',
      scope: ['user:email'],
    });
  }

  validate(_at: string, _rt: string, profile: any, done: (e: any, u?: any) => void) {
    const mapped: OAuthProfile = {
      provider: 'github',
      subject: String(profile.id),
      email: profile.emails?.[0]?.value ?? `${profile.username}@users.noreply.github.com`,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, mapped);
  }
}
