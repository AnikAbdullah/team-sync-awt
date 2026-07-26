import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskStatus } from '../../common/enums/domain.enums';
import { Workspace } from './workspace.entity';

@Entity('workspace_settings')
export class WorkspaceSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  workspaceId: string;

  @OneToOne(() => Workspace, (workspace) => workspace.settings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'workspace_default_task_status_enum',
    default: TaskStatus.TODO,
  })
  defaultTaskStatus: TaskStatus;

  @Column({ default: false })
  allowMemberProjectCreation: boolean;

  @Column({ default: false })
  allowMemberChannelCreation: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
