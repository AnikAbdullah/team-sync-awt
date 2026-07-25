import { UserStatus } from '../enums/domain.enums';

export interface AuthUser {
  id: string;
  email: string;
  status: UserStatus;
  profile?: {
    fullName?: string;
  };
}
