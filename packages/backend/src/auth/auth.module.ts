import { Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

// Only register an OAuth strategy when its credentials are configured.
// This lets the backend boot with just one provider (or none) instead of
// crashing because a clientID is missing.
const oauthStrategies: Provider[] = [];
if (process.env.GOOGLE_CLIENT_ID) {
  oauthStrategies.push(GoogleStrategy);
  // eslint-disable-next-line no-console
  console.log('[auth] Google OAuth enabled');
}
if (process.env.GITHUB_CLIENT_ID) {
  oauthStrategies.push(GithubStrategy);
  // eslint-disable-next-line no-console
  console.log('[auth] GitHub OAuth enabled');
}
if (oauthStrategies.length === 0) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] No OAuth provider configured. Set GOOGLE_CLIENT_ID or GITHUB_CLIENT_ID in .env to enable login.',
  );
}

@Module({
  imports: [
    PassportModule,
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-prod',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ...oauthStrategies],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
