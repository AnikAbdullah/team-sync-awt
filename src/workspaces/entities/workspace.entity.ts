import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceStatus } from '../../common/enums/domain.enums';
import { User } from '../../users/entities/user.entity';
import { WorkspaceSettings } from './workspace-settings.entity';
import { WorkspaceMember } from '../../memberships/entities/workspace-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Channel } from '../../channels/entities/channel.entity';

@Entity('workspaces')
@Index('IDX_workspaces_owner_id', ['ownerId'])
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 140, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({
    type: 'enum',
    enum: WorkspaceStatus,
    enumName: 'workspace_status_enum',
    default: WorkspaceStatus.ACTIVE,
  })
  status: WorkspaceStatus;

  @OneToOne(() => WorkspaceSettings, (settings) => settings.workspace)
  settings: WorkspaceSettings;

  @OneToMany(() => WorkspaceMember, (member) => member.workspace)
  members: WorkspaceMember[];

  @OneToMany(() => Project, (project) => project.workspace)
  projects: Project[];

  @OneToMany(() => Channel, (channel) => channel.workspace)
  channels: Channel[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
