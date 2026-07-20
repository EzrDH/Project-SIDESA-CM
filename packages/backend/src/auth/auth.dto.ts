import { IsNotEmpty, IsString, Matches } from 'class-validator';

/// Compact ECDSA P-384 signature: r||s, 96 bytes -> 192 hex chars.
export const SIG_HEX = /^[0-9a-fA-F]{192}$/;

export class ChallengeDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;
}

export class VerifyDto {
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @IsString()
  @IsNotEmpty()
  nonce!: string;

  @Matches(SIG_HEX, { message: 'signature harus 192 karakter heksadesimal (ECDSA P-384 compact).' })
  signature!: string;
}
