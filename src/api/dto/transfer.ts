import type { SelectTransfer, transfers } from '../../db/schema.js';

export interface TransferDto {
  id: string;
  idempotencyKey: string;
  toAddress: string;
  tokenAddress: string;
  amount: string;
  status: (typeof transfers.$inferSelect)['status'];
  createdAt: string;
  updatedAt: string;
}

export function toTransferDto(t: SelectTransfer): TransferDto {
  return {
    id: t.id,
    idempotencyKey: t.idempotencyKey,
    toAddress: t.toAddress,
    tokenAddress: t.tokenAddress,
    amount: t.amount,
    status: t.status,

    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
