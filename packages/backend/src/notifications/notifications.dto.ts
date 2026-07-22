import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class RegisterTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
  @IsString() @IsIn(['android', 'ios']) platform!: string;
}
export class UnregisterTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
}
