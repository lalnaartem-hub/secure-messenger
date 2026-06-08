import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import type { OAuthProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: (process.env.GOOGLE_CLIENT_ID ?? '').trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? '').trim(),
      callbackURL: (process.env.GOOGLE_CALLBACK_URL ?? '').trim(),
      scope: ['email', 'profile'],
    });
  }

  validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    const mapped: OAuthProfile = {
      provider: 'google',
      subject: profile.id,
      email: profile.emails?.[0]?.value,
      username: (profile.emails?.[0]?.value ?? `g_${profile.id}`).split('@')[0],
      displayName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
    done(null, mapped);
  }
}
