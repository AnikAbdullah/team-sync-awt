import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
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

    return { accessToken, user: this.toSafeUser(user) };
  }

  private welcomeEmailHtml(fullName: string): string {
    return `
      <h2>Welcome to TeamSync, ${fullName}!</h2>
      <p>Your account has been created successfully.</p>
      <p>You can now sign in and start collaborating with your team.</p>
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
