import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  requestedSlot!: string;
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
