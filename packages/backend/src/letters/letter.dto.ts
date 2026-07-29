import { IsDefined, IsIn, IsObject, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SIG_HEX } from '../auth/auth.dto';
import { EligibilityEnvelopeDto } from '../registry/eligibility.dto';

export const LETTER_TYPES = ['SURAT_PENGANTAR', 'SKTM', 'DOMISILI'] as const;

export class RequestLetterDto {
  @IsIn(LETTER_TYPES as unknown as string[], { message: 'type surat tidak dikenal.' })
  type!: (typeof LETTER_TYPES)[number];

  @IsObject()
  formData!: Record<string, string>;

  // @sidesa/crypto remains the authority on whether the proof is *valid*; the
  // nested validation here only guarantees the verifier is handed the shape it
  // declares, so a malformed body is a 400 rather than a crash inside the
  // crypto layer.
  @IsDefined({ message: 'bukti kelayakan (eligibility) wajib disertakan.' })
  @ValidateNested()
  @Type(() => EligibilityEnvelopeDto)
  eligibility!: EligibilityEnvelopeDto;
}

export class SignLetterDto {
  @Matches(SIG_HEX, { message: 'signature harus 192 karakter heksadesimal (ECDSA P-384 compact).' })
  signature!: string;
}
