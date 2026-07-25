import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;
}
