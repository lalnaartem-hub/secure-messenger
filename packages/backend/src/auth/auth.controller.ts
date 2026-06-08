import { Body, Controller, Get, Post, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('phone')
  async phoneAuth(@Body() body: { phone: string; code: string }) {
    if (body.code !== '1234') {
      throw new BadRequestException('Неверный код подтверждения. Попробуйте 1234');
    }
    return this.auth.validatePhone(body.phone);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    /* passport redirects */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.finish(req, res);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  github() {
    /* passport redirects */
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.finish(req, res);
  }

  private async finish(req: Request, res: Response) {
    const tokens = await this.auth.validateOAuth(req.user as any);
    // Where to send the user back after OAuth. In production this is the public
    // site (PUBLIC_URL); the web client reads tokens from the URL #fragment.
    const base =
      process.env.PUBLIC_URL ??
      process.env.CORS_ORIGIN?.split(',')[0] ??
      'http://localhost:5173';
    res.redirect(
      `${base}/#accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
