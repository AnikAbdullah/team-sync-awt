import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { User } from '../users/entities/user.entity';
import {
  WorkspaceMemberStatus,
  WorkspaceRole,
} from '../common/enums/domain.enums';
import {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberRoleDto,
} from './dto/membership.dto';
import { recordActivity } from '../common/utils/activity.util';

@Injectable()
export class MembershipsService {
  constructor(private readonly dataSource: DataSource) {}

  async add(
    workspaceId: string,
    actorId: string,
    actorRole: WorkspaceRole,
    dto: AddWorkspaceMemberDto,
  ) {
    if (
      actorRole === WorkspaceRole.ADMIN &&
      dto.role !== WorkspaceRole.MEMBER
    ) {
      throw new ForbiddenException('Admins may only add regular members');
    }
    if (dto.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Use ownership transfer to assign an owner');
    }

    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const repository = this.dataSource.getRepository(WorkspaceMember);
    const existing = await repository.findOne({
      where: { workspaceId, userId: dto.userId },
    });
    if (existing) throw new ConflictException('User is already a workspace member');

    const membership = await repository.save(
      repository.create({
        workspaceId,
        userId: dto.userId,
        role: dto.role,
        status: WorkspaceMemberStatus.ACTIVE,
        invitedById: actorId,
        joinedAt: new Date(),
      }),
    );

    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId,
      action: 'MEMBER_ADDED',
      targetType: 'User',
      targetId: dto.userId,
      metadata: { role: dto.role },
    });

    return membership;
  }

  async list(workspaceId: string) {
    return this.dataSource.getRepository(WorkspaceMember).find({
      where: { workspaceId },
      relations: { user: { profile: true }, invitedBy: { profile: true } },
      order: { role: 'ASC', joinedAt: 'ASC' },
    });
  }

  async updateRole(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
    actorRole: WorkspaceRole,
    dto: UpdateWorkspaceMemberRoleDto,
  ) {
    const repository = this.dataSource.getRepository(WorkspaceMember);
    const membership = await repository.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (!membership) throw new NotFoundException('Workspace member not found');
    if (membership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('The owner cannot be demoted directly');
    }
    if (dto.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Use ownership transfer to assign an owner');
    }
    if (
      actorRole === WorkspaceRole.ADMIN &&
      (membership.role === WorkspaceRole.ADMIN ||
        dto.role === WorkspaceRole.ADMIN)
    ) {
      throw new ForbiddenException('Admins cannot manage administrator roles');
    }

    membership.role = dto.role;
    await repository.save(membership);
    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId,
      action: 'MEMBER_ROLE_UPDATED',
      targetType: 'User',
      targetId: targetUserId,
      metadata: { role: dto.role },
    });
    return membership;
  }

  async remove(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
    actorRole: WorkspaceRole,
  ) {
    const repository = this.dataSource.getRepository(WorkspaceMember);
    const membership = await repository.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (!membership) throw new NotFoundException('Workspace member not found');
    if (membership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('The owner cannot be removed');
    }
    if (
      actorRole === WorkspaceRole.ADMIN &&
      membership.role === WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await repository.remove(membership);
    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId,
      action: 'MEMBER_REMOVED',
      targetType: 'User',
      targetId: targetUserId,
    });
    return { message: 'Workspace member removed' };
  }

  async leave(workspaceId: string, userId: string) {
    const repository = this.dataSource.getRepository(WorkspaceMember);
    const membership = await repository.findOne({
      where: { workspaceId, userId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Transfer ownership before leaving the workspace',
      );
    }
    await repository.remove(membership);
    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId: userId,
      action: 'MEMBER_LEFT',
      targetType: 'User',
      targetId: userId,
    });
    return { message: 'You left the workspace' };
  }
}
