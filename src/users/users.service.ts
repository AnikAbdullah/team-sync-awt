import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
