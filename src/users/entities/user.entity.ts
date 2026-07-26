import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UserStatus } from '../../common/enums/domain.enums';

export { UserStatus };

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 254, unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status_enum',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  emailVerificationTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt?: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  refreshTokenHash?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  passwordResetTokenHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date | null;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
