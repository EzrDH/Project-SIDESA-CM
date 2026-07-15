import { Injectable } from '@nestjs/common';
import { verifyEligibility } from '@sidesa/crypto';
import { hexToBytes } from './registry.builder';
import { RegistryService } from './registry.service';

export interface EligibilityProofDto {
  publicKey: string;
  attributes: string;
  merkleProof: { sibling: string; isRight: boolean }[];
  ownership: { R: string; s: string };
}

const enc = new TextEncoder();

@Injectable()
export class EligibilityService {
  constructor(private readonly registry: RegistryService) {}

  async verify(dto: EligibilityProofDto, context: string): Promise<{ valid: boolean }> {
    const rootHexStr = await this.registry.activeRootHex();
    if (!rootHexStr) return { valid: false };
    const proof = {
      publicKey: hexToBytes(dto.publicKey),
      attributes: enc.encode(dto.attributes),
      merkleProof: dto.merkleProof.map((s) => ({ sibling: hexToBytes(s.sibling), isRight: s.isRight })),
      ownership: { R: hexToBytes(dto.ownership.R), s: hexToBytes(dto.ownership.s) },
    };
    const valid = verifyEligibility(proof, hexToBytes(rootHexStr), enc.encode(context));
    return { valid };
  }
}
