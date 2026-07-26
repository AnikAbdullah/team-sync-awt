import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(2, 140)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional()
  @IsBoolean()
  allowMemberProjectCreation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMemberChannelCreation?: boolean;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  allowMemberProjectCreation?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMemberChannelCreation?: boolean;
}

export class TransferOwnershipDto {
  @IsUUID()
  newOwnerId: string;
}
