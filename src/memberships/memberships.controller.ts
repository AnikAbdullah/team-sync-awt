import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceRoles } from '../common/decorators/workspace-roles.decorator';
import { WorkspaceRole } from '../common/enums/domain.enums';
import { WorkspaceMemberGuard } from '../common/guards/workspace-member.guard';
import { WorkspaceRoleGuard } from '../common/guards/workspace-role.guard';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  AddWorkspaceMemberDto,
  UpdateWorkspaceMemberRoleDto,
} from './dto/membership.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('Members')
@ApiBearerAuth()
@Controller()
@UseGuards(WorkspaceMemberGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post('workspaces/:workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  add(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: Request & { workspaceMembership: { role: WorkspaceRole } },
    @Body() dto: AddWorkspaceMemberDto,
  ) {
    return this.membershipsService.add(
      workspaceId,
      user.id,
      request.workspaceMembership.role,
      dto,
    );
  }

  @Get('workspaces/:workspaceId/members')
  list(@Param('workspaceId', ParseUUIDPipe) workspaceId: string) {
    return this.membershipsService.list(workspaceId);
  }

  @Patch('workspaces/:workspaceId/members/:userId/role')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  updateRole(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: Request & { workspaceMembership: { role: WorkspaceRole } },
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ) {
    return this.membershipsService.updateRole(
      workspaceId,
      targetUserId,
      user.id,
      request.workspaceMembership.role,
      dto,
    );
  }

  @Delete('workspaces/:workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  remove(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Req() request: Request & { workspaceMembership: { role: WorkspaceRole } },
  ) {
    return this.membershipsService.remove(
      workspaceId,
      targetUserId,
      user.id,
      request.workspaceMembership.role,
    );
  }

  @Post('workspaces/:workspaceId/leave')
  leave(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.membershipsService.leave(workspaceId, user.id);
  }
}
