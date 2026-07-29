import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PROOF_HEX } from '../auth/auth.dto';

export class IssueCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @Matches(/^[0-9a-f]{96}$/, { message: 'nikCommitment harus digest SHA-384 (96 karakter heksadesimal huruf kecil), bukan NIK mentah.' })
  nikCommitment!: string;

  @IsString()
  @MaxLength(200)
  attributes!: string;
}

export class ClaimCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @Matches(/^0[23][0-9a-fA-F]{96}$/, { message: 'publicKey harus kunci P-384 terkompresi (49 byte heksadesimal).' })
  publicKey!: string;

  @Matches(PROOF_HEX, { message: 'proof harus 194 karakter heksadesimal (Schnorr R||s).' })
  proof!: string;
}
