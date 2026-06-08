import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CryptoService } from './crypto.service';
import { UsersService } from '../users/users.service';

@Controller('crypto')
@UseGuards(AuthGuard('jwt'))
export class CryptoController {
  constructor(
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
  ) {}

  /** Publish my public identity key (private key stays on the client). */
  @Post('identity-key')
  setIdentityKey(@Req() req: any, @Body() body: { publicIdentityKey: string }) {
    return this.users.setIdentityKey(req.user.userId, body.publicIdentityKey);
  }

  /** Upload a batch of one-time prekeys. */
  @Post('prekeys')
  uploadPrekeys(
    @Req() req: any,
    @Body() body: { prekeys: { prekeyPublic: string; signature: string }[] },
  ) {
    return this.crypto.uploadPrekeys(req.user.userId, body.prekeys);
  }

  /** Fetch a peer's key bundle to start an E2E session. */
  @Get('bundle/:peerId')
  async bundle(@Param('peerId') peerId: string) {
    const profile = await this.users.getPublicProfile(peerId);
    const prekey = await this.crypto.claimPrekey(peerId);
    return {
      identityKey: profile?.publicIdentityKey ?? null,
      prekey,
    };
  }
}
