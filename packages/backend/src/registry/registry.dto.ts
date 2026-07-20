import { IsInt, IsNotEmpty, IsString, Matches, Min } from 'class-validator';
import { SIG_HEX } from '../auth/auth.dto';

export class ApproveWargaDto {
  @IsString()
  @IsNotEmpty()
  wargaAccountId!: string;

  @IsString()
  attributes!: string;
}

export class PublishRootDto {
  @IsInt()
  @Min(1)
  version!: number;

  @Matches(SIG_HEX, { message: 'signature harus 192 karakter heksadesimal (ECDSA P-384 compact).' })
  signature!: string;
}
