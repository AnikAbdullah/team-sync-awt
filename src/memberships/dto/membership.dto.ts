import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { WorkspaceRole } from '../../common/enums/domain.enums';

export class AddWorkspaceMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole = WorkspaceRole.MEMBER;
}

export class UpdateWorkspaceMemberRoleDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}
