import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsNotEmpty, IsString, Matches, MaxLength, ValidateNested,
} from 'class-validator';
import { PROOF_HEX } from '../auth/auth.dto';

/// Compressed P-384 point: 0x02/0x03 prefix + 48-byte x, hex.
export const COMPRESSED_POINT_HEX = /^0[23][0-9a-fA-F]{96}$/;
/// SHA-384 digest, hex — the width of every Merkle node in the registry tree.
export const DIGEST_HEX = /^[0-9a-fA-F]{96}$/;

/// A Merkle tree of N residents has depth ceil(log2 N); 64 is far above any
/// plausible village registry and stops an attacker feeding an endless path.
const MAX_MERKLE_DEPTH = 64;

export class MerkleStepDto {
  @Matches(DIGEST_HEX, { message: 'sibling harus digest SHA-384 (96 karakter heksadesimal).' })
  sibling!: string;

  @IsBoolean()
  isRight!: boolean;
}

/// The eligibility proof as it arrives over the wire.
///
/// Validating the shape here — rather than letting @sidesa/crypto meet raw JSON
/// — is what makes a malformed proof a 400 instead of a dereference of
/// undefined inside the verifier. The cryptographic decision still belongs
/// entirely to the crypto package; this only guarantees it is handed the types
/// it declares.
export class EligibilityProofDto {
  @Matches(COMPRESSED_POINT_HEX, { message: 'publicKey harus kunci P-384 terkompresi (49 byte heksadesimal).' })
  publicKey!: string;

  @IsString()
  @MaxLength(200)
  attributes!: string;

  @IsArray()
  @ArrayMaxSize(MAX_MERKLE_DEPTH)
  @ValidateNested({ each: true })
  @Type(() => MerkleStepDto)
  merkleProof!: MerkleStepDto[];

  @Matches(PROOF_HEX, { message: 'ownership harus 194 karakter heksadesimal (Schnorr R||s).' })
  ownership!: string;
}

/// Body of the public POST /eligibility/verify.
export class VerifyEligibilityDto {
  @IsDefined({ message: 'proof wajib disertakan.' })
  @ValidateNested()
  @Type(() => EligibilityProofDto)
  proof!: EligibilityProofDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  context!: string;
}

/// The {proof, nonce} envelope a warga attaches to a letter request.
export class EligibilityEnvelopeDto {
  @IsDefined({ message: 'proof wajib disertakan.' })
  @ValidateNested()
  @Type(() => EligibilityProofDto)
  proof!: EligibilityProofDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  nonce!: string;
}
