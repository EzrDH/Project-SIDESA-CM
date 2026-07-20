import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class IssueCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  displayName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
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

  @Matches(/^[0-9a-fA-F]{192}$/, { message: 'signature harus 192 karakter heksadesimal (ECDSA P-384 compact).' })
  signature!: string;
}
