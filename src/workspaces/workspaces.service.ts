import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceSettings } from './entities/workspace-settings.entity';
import { WorkspaceMember } from '../memberships/entities/workspace-member.entity';
import { Channel } from '../channels/entities/channel.entity';
import {
  ChannelType,
  WorkspaceMemberStatus,
  WorkspaceRole,
  WorkspaceStatus,
} from '../common/enums/domain.enums';
import {
  CreateWorkspaceDto,
  TransferOwnershipDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';
import { slugify } from '../common/utils/slug.util';
import { recordActivity } from '../common/utils/activity.util';

@Injectable()
export class WorkspacesService {
  constructor(private readonly dataSource: DataSource) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.dataSource.transaction(async (manager) => {
      const workspaceRepo = manager.getRepository(Workspace);
      const baseSlug = dto.slug ?? slugify(dto.name);
      let slug = baseSlug;
      if (await workspaceRepo.exists({ where: { slug } })) {
        slug = `${baseSlug}-${randomUUID().slice(0, 6)}`;
      }

      const workspace = await manager.save(
        Workspace,
        manager.create(Workspace, {
          name: dto.name,
          slug,
          description: dto.description,
          ownerId: userId,
        }),
      );

      const settings = await manager.save(
        WorkspaceSettings,
        manager.create(WorkspaceSettings, {
          workspaceId: workspace.id,
          allowMemberProjectCreation:
            dto.allowMemberProjectCreation ?? false,
          allowMemberChannelCreation:
            dto.allowMemberChannelCreation ?? false,
        }),
      );

      await manager.save(
        WorkspaceMember,
        manager.create(WorkspaceMember, {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.OWNER,
          status: WorkspaceMemberStatus.ACTIVE,
          joinedAt: new Date(),
        }),
      );

      const generalChannel = await manager.save(
        Channel,
        manager.create(Channel, {
          workspaceId: workspace.id,
          name: 'general',
          description: 'Default workspace channel',
          type: ChannelType.GENERAL,
          createdById: userId,
        }),
      );

      await recordActivity(manager, {
        workspaceId: workspace.id,
        actorId: userId,
        action: 'WORKSPACE_CREATED',
        targetType: 'Workspace',
        targetId: workspace.id,
      });

      return { ...workspace, settings, defaultChannel: generalChannel };
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.dataSource
      .getRepository(WorkspaceMember)
      .find({
        where: {
          userId,
          status: WorkspaceMemberStatus.ACTIVE,
        },
        relations: {
          workspace: {
            settings: true,
          },
        },
        order: { joinedAt: 'DESC' },
      });

    return memberships.map((membership) => ({
      role: membership.role,
      joinedAt: membership.joinedAt,
      workspace: membership.workspace,
    }));
  }

  async findOne(workspaceId: string) {
    const workspace = await this.dataSource.getRepository(Workspace).findOne({
      where: { id: workspaceId },
      relations: {
        settings: true,
        owner: { profile: true },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.findOne(workspaceId);
    if (workspace.status === WorkspaceStatus.ARCHIVED) {
      throw new ConflictException('Archived workspaces are read-only');
    }

    const { allowMemberProjectCreation, allowMemberChannelCreation, ...fields } =
      dto;
    Object.assign(workspace, fields);
    await this.dataSource.getRepository(Workspace).save(workspace);

    if (
      allowMemberProjectCreation !== undefined ||
      allowMemberChannelCreation !== undefined
    ) {
      await this.dataSource.getRepository(WorkspaceSettings).update(
        { workspaceId },
        {
          ...(allowMemberProjectCreation !== undefined
            ? { allowMemberProjectCreation }
            : {}),
          ...(allowMemberChannelCreation !== undefined
            ? { allowMemberChannelCreation }
            : {}),
        },
      );
    }

    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId: userId,
      action: 'WORKSPACE_UPDATED',
      targetType: 'Workspace',
      targetId: workspaceId,
    });

    return this.findOne(workspaceId);
  }

  async archive(workspaceId: string, userId: string) {
    const workspace = await this.findOne(workspaceId);
    workspace.status = WorkspaceStatus.ARCHIVED;
    await this.dataSource.getRepository(Workspace).save(workspace);
    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId: userId,
      action: 'WORKSPACE_ARCHIVED',
      targetType: 'Workspace',
      targetId: workspaceId,
    });
    return workspace;
  }

  async remove(workspaceId: string, userId: string) {
    const workspace = await this.findOne(workspaceId);
    await this.dataSource.getRepository(Workspace).softRemove(workspace);
    await recordActivity(this.dataSource.manager, {
      workspaceId,
      actorId: userId,
      action: 'WORKSPACE_DELETED',
      targetType: 'Workspace',
      targetId: workspaceId,
    });
    return { message: 'Workspace deleted' };
  }

  async transferOwnership(
    workspaceId: string,
    currentOwnerId: string,
    dto: TransferOwnershipDto,
  ) {
    if (currentOwnerId === dto.newOwnerId) {
      throw new ConflictException('The selected member is already the owner');
    }

    return this.dataSource.transaction(async (manager) => {
      const workspace = await manager.getRepository(Workspace).findOne({
        where: { id: workspaceId },
      });
      if (!workspace) throw new NotFoundException('Workspace not found');
      if (workspace.ownerId !== currentOwnerId) {
        throw new ForbiddenException('Only the workspace owner can transfer ownership');
      }

      const membershipRepo = manager.getRepository(WorkspaceMember);
      const newOwnerMembership = await membershipRepo.findOne({
        where: {
          workspaceId,
          userId: dto.newOwnerId,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      });
      if (!newOwnerMembership) {
        throw new NotFoundException(
          'The new owner must be an active workspace member',
        );
      }

      const oldOwnerMembership = await membershipRepo.findOneOrFail({
        where: { workspaceId, userId: currentOwnerId },
      });

      oldOwnerMembership.role = WorkspaceRole.ADMIN;
      newOwnerMembership.role = WorkspaceRole.OWNER;
      workspace.ownerId = dto.newOwnerId;

      await membershipRepo.save([oldOwnerMembership, newOwnerMembership]);
      await manager.getRepository(Workspace).save(workspace);
      await recordActivity(manager, {
        workspaceId,
        actorId: currentOwnerId,
        action: 'OWNERSHIP_TRANSFERRED',
        targetType: 'Workspace',
        targetId: workspaceId,
        metadata: { newOwnerId: dto.newOwnerId },
      });

      return workspace;
    });
  }
}
