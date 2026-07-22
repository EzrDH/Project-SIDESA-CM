export type NotificationType =
  | 'letter.submitted' | 'letter.drafted' | 'letter.signed' | 'letter.rejected'
  | 'booking.requested' | 'booking.confirmed' | 'booking.cancelled';

export interface DomainEvent {
  type: NotificationType;
  refId: string;                 // letterRequestId or bookingId
  wargaAccountId?: string;       // owner, when the recipient is the warga
}
