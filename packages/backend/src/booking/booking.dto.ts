import { IsDefined, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EligibilityEnvelopeDto } from '../registry/eligibility.dto';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  requestedSlot!: string;

  // Booking is what the eligibility gate protects: a resident must prove they
  // are in the published registry and control their key, without ever sending
  // a NIK. @sidesa/crypto decides whether the proof is valid; the nested
  // validation here only guarantees it is handed the shape it declares.
  @IsDefined({ message: 'bukti kelayakan (eligibility) wajib disertakan.' })
  @ValidateNested()
  @Type(() => EligibilityEnvelopeDto)
  eligibility!: EligibilityEnvelopeDto;
}

export class ConfirmBookingDto {
  @IsOptional()
  @IsString()
  slot?: string;
}

export class CheckinDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
