import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../db/schema';
import { Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private tokenTtl = 24 * 60 * 60 * 1000; // 24hr

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('An account with email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(
      Date.now() + this.tokenTtl, // 24hr from now
    );

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      verificationToken,
      verificationTokenExpiresAt,
    });

    void this.emailService.sendVerificationEmail(user.email, verificationToken);

    return {
      message:
        'Registration Successful. Please check your email to verify your account',
    };
  }

  async verifyEmail(token: string, res: Response) {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user || !user.verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (
      user.verificationTokenExpiresAt &&
      user.verificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one',
      );
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);
    await this.saveRefreshToken(user.id, accessToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Email verified successfully',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid Email or Password');
    }

    const passwordMatched = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid Email or Password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email to continue');
    }

    const { accessToken, refreshToken } = await this.generateTokens(user);

    await this.saveRefreshToken(user.id, refreshToken);
    this.setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    let payload: { sub: string; email: string; role: User['role'] };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenMatch = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { accessToken, refreshToken: generatedRefreshToken } =
      await this.generateTokens(user);

    await this.saveRefreshToken(user.id, generatedRefreshToken);
    this.setRefreshTokenCookie(res, generatedRefreshToken);

    return {
      accessToken,
    };
  }

  async logout(userId: string, res: Response) {
    await this.usersService.update(userId, { refreshTokenHash: null });

    res.clearCookie('refresh_token');

    return { message: 'Logout successfully' };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, { refreshTokenHash });
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * this.tokenTtl, // This is 7d in ms
    });
  }
}
