import { IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString() username!: string;
  @IsString() @MinLength(6) password!: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}

export class AccountsQueryDto {
  @IsOptional() @IsString() branchId?: string;
}
