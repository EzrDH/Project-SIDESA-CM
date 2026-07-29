import { IsNotEmpty, IsString, Matches } from 'class-validator';

/// Compact ECDSA P-384 signature: r||s, 96 bytes -> 192 hex chars.
export const SIG_HEX = /^[0-9a-fA-F]{192}$/;

/// Schnorr proof of knowledge: R||s, 97 bytes -> 194 hex chars.
export const PROOF_HEX = /^[0-9a-fA-F]{194}$/;

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

  @Matches(PROOF_HEX, { message: 'proof harus 194 karakter heksadesimal (Schnorr R||s).' })
  proof!: string;
}
