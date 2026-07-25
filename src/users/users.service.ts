import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserSearchQueryDto } from './dto/user-search-query.dto';
import { paginationMeta } from '../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
  ) {}

  async getProfile(userId: string) {
    return this.toProfile(await this.findWithProfile(userId));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findWithProfile(userId);
    Object.assign(user.profile, dto);
    await this.profileRepository.save(user.profile);
    return this.toProfile(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    await this.userRepository.update(userId, {
      passwordHash: await argon2.hash(dto.newPassword),
    });
    return { message: 'Password changed successfully' };
  }

  async search(query: UserSearchQueryDto) {
    const { q, page, limit } = query;
    const [users, total] = await this.userRepository.findAndCount({
      where: [
        { email: ILike(`%${q}%`) },
        { profile: { fullName: ILike(`%${q}%`) } },
      ],
      relations: { profile: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.profile?.fullName,
        avatarUrl: user.profile?.avatarUrl ?? null,
      })),
      meta: paginationMeta(page, limit, total),
    };
  }

  private async findWithProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      fullName: user.profile?.fullName,
      bio: user.profile?.bio ?? null,
      phone: user.profile?.phone ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      timezone: user.profile?.timezone ?? null,
      createdAt: user.createdAt,
    };
  }
}
