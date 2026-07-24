import {
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
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private tokenTtl = 24 * 60 * 60 * 1000; // 24hr

  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('An account with email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiresAt = new Date(
      Date.now() + this.tokenTtl, // 24hr from now
    );

    const user = await this.userService.create({
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

  async login(dto: LoginDto, res: Response) {
    const user = await this.userService.findByEmail(dto.email);

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

    const { refreshToken, accessToken } = await this.generateTokens(user);
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
}
