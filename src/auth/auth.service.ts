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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
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
