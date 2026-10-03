import { isAddress } from 'viem';
import z from 'zod';

const MAX_UINT256 = 2n ** 256n - 1n;

export const addressSchema = z
  .string()
  .min(1)
  .refine(isAddress, 'invalid address')
  .transform((v) => v.toLowerCase());

export const amountSchema = z
  .string()
  .max(78)
  .regex(/^[1-9][0-9]*$/, { abort: true })
  .refine((v) => BigInt(v) <= MAX_UINT256, 'amount exceeds max uint256');
