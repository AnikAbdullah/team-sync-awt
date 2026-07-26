import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  WorkspaceMemberStatus,
  WorkspaceRole,
} from '../../common/enums/domain.enums';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';

export { WorkspaceMemberStatus, WorkspaceRole };

@Entity('workspace_members')
@Unique('UQ_workspace_members_workspace_user', ['workspaceId', 'userId'])
@Index('IDX_workspace_members_user_id', ['userId'])
@Index('IDX_workspace_members_workspace_role', ['workspaceId', 'role'])
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    enumName: 'workspace_role_enum',
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  @Column({
    type: 'enum',
    enum: WorkspaceMemberStatus,
    enumName: 'workspace_member_status_enum',
    default: WorkspaceMemberStatus.ACTIVE,
  })
  status: WorkspaceMemberStatus;

  @Column({ type: 'uuid', nullable: true })
  invitedById?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy?: User | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
