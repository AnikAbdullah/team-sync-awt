import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class UserSearchQueryDto {
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  q: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
