import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../common/enums/domain.enums';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email is already registered');

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      profile: { fullName: dto.fullName },
    });

    const saved = await this.userRepository.save(user);

    void this.mailService.sendMail(
      saved.email,
      'Welcome to TeamSync',
      this.welcomeEmailHtml(dto.fullName),
    );

    return this.toSafeUser(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: { profile: true },
      select: {
        id: true,
        email: true,
        status: true,
        passwordHash: true,
        createdAt: true,
        profile: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    });

    const invalid = new UnauthorizedException('Invalid email or password');
    if (!user) throw invalid;
    if (!(await argon2.verify(user.passwordHash, dto.password))) throw invalid;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      type: 'access',
    });
    const refreshToken = await this.issueRefreshToken(user.id);

    return { accessToken, refreshToken, user: this.toSafeUser(user) };
  }

  async refreshTokens(refreshToken: string) {
    const invalid = new UnauthorizedException(
      'Invalid or expired refresh token',
    );
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(
        refreshToken,
        { secret: this.refreshSecret },
      );
    } catch {
      throw invalid;
    }
    if (payload.type !== 'refresh') throw invalid;

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: { profile: true },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        refreshTokenHash: true,
        profile: { id: true, fullName: true, avatarUrl: true },
      },
    });

    if (!user || !user.refreshTokenHash) throw invalid;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active');
    }

    const providedHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    if (providedHash !== user.refreshTokenHash) throw invalid;

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      type: 'access',
    });
    const newRefreshToken = await this.issueRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.toSafeUser(user),
    };
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshTokenHash: null });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      const token = this.createResetToken();
      await this.userRepository.update(user.id, {
        passwordResetTokenHash: token.hash,
        passwordResetExpiresAt: token.expiresAt,
      });

      void this.mailService.sendMail(
        user.email,
        'Reset your TeamSync password',
        this.passwordResetEmailHtml(this.resetUrl(token.raw)),
      );
    }

    return {
      message:
        'If an account exists for that email, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.userRepository.findOne({
      where: { passwordResetTokenHash: hash },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    await this.userRepository.update(user.id, {
      passwordHash: await argon2.hash(newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      refreshTokenHash: null,
    });

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string) {
    const hash = createHash('sha256').update(token).digest('hex');
    const user = await this.userRepository.findOne({
      where: { emailVerificationTokenHash: hash },
    });

    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && !user.emailVerifiedAt) {
      const token = this.createVerificationToken();
      user.emailVerificationTokenHash = token.hash;
      user.emailVerificationExpiresAt = token.expiresAt;
      await this.userRepository.save(user);

      void this.mailService.sendMail(
        user.email,
        'Verify your TeamSync email',
        this.verificationEmailHtml(this.verificationUrl(token.raw)),
      );
    }

    return {
      message:
        'If an unverified account exists for that email, a verification link has been sent',
    };
  }

  private createVerificationToken() {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return { raw, hash, expiresAt };
  }

  private verificationUrl(rawToken: string): string {
    const base =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/api/v1';
    return `${base}/auth/verify-email?token=${rawToken}`;
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.refreshSecret,
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      },
    );
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepository.update(userId, { refreshTokenHash: hash });
    return refreshToken;
  }

  private get refreshSecret(): string {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ||
      `${this.config.getOrThrow<string>('JWT_SECRET')}-refresh`
    );
  }

  private createResetToken() {
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return { raw, hash, expiresAt };
  }

  private resetUrl(rawToken: string): string {
    const base =
      this.config.get<string>('APP_URL') || 'http://localhost:3000/api/v1';
    return `${base}/auth/reset-password?token=${rawToken}`;
  }

  private passwordResetEmailHtml(resetUrl: string): string {
    return `
      <h2>Reset your password</h2>
      <p>We received a request to reset your TeamSync password.</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `;
  }

  private welcomeEmailHtml(fullName: string): string {
    return `
      <h2>Welcome to TeamSync, ${fullName}!</h2>
      <p>Your account has been created successfully and is ready to use.</p>
      <p>Sign in to create a workspace, invite your team, and start managing projects and tasks together.</p>
      <p>Happy collaborating,<br/>The TeamSync Team</p>
    `;
  }

  private verificationEmailHtml(verifyUrl: string): string {
    return `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your TeamSync email address:</p>
      <p><a href="${verifyUrl}">Verify my email</a></p>
      <p>This link expires in 24 hours.</p>
    `;
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      fullName: user.profile?.fullName,
      avatarUrl: user.profile?.avatarUrl ?? null,
      createdAt: user.createdAt,
    };
  }
}
