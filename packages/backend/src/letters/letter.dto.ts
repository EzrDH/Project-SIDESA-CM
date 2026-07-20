import { IsDefined, IsIn, IsObject, Matches } from 'class-validator';
import { SIG_HEX } from '../auth/auth.dto';

export const LETTER_TYPES = ['SURAT_PENGANTAR', 'SKTM', 'DOMISILI'] as const;

export class RequestLetterDto {
  @IsIn(LETTER_TYPES as unknown as string[], { message: 'type surat tidak dikenal.' })
  type!: (typeof LETTER_TYPES)[number];

  @IsObject()
  formData!: Record<string, string>;

  // The eligibility proof is passed through untouched — @sidesa/crypto is the
  // authority on its validity, so we only require it to be present.
  @IsDefined({ message: 'bukti kelayakan (eligibility) wajib disertakan.' })
  @IsObject()
  eligibility!: { proof: unknown; nonce: string };
}

export class SignLetterDto {
  @Matches(SIG_HEX, { message: 'signature harus 192 karakter heksadesimal (ECDSA P-384 compact).' })
  signature!: string;
}
