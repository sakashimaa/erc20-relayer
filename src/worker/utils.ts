import {
  estimateContractGas,
  estimateFeesPerGas,
  getBalance,
  getChainId,
  getCode,
  getTransaction,
  getTransactionCount,
  getTransactionReceipt,
  sendRawTransaction,
} from 'viem/actions';
import type { ClaimedTransfer } from './batch.js';
import {
  BaseError,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  keccak256,
  NonceTooLowError,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Address,
  type Hex,
  type TransactionReceipt,
} from 'viem';
import { account, publicClient } from './chain.js';
import { sepolia } from 'viem/chains';
import { db, type Executor } from '../db/index.js';
import { transferAttempts, transfers, type TransferStatus } from '../db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';
import logger from '../lib/logger.js';
import { CHECK_DELAY_MS } from './index.js';
import type { PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { rowId } from 'drizzle-orm/sqlite-core/expressions';

export class LeaseLostError extends Error {}

const verifiedTokens = new Set<string>();

const assertContract = async (token: Address) => {
  if (verifiedTokens.has(token)) return;

  const code = await getCode(publicClient, { address: token });
  if (!code || code === '0x') throw new Error(`no contract at ${token}`);

  verifiedTokens.add(token);
};

const isAlreadyKnown = (e: unknown) =>
  e instanceof BaseError &&
  NonceTooLowError.nodeMessage.test((e as { details?: string }).details ?? '');

export const prepare = async ({
  id,
  tokenAddress,
  toAddress,
  amount,
  attempts,
}: ClaimedTransfer) => {
  const token = tokenAddress as Address;
  const args = [toAddress as Address, BigInt(amount)] as const;

  await assertContract(token);

  const gas = await estimateContractGas(publicClient, {
    address: token,
    abi: erc20Abi,
    functionName: 'transfer',
    args,
    account: account.address,
  });

  const { maxFeePerGas, maxPriorityFeePerGas } = await estimateFeesPerGas(publicClient);

  const nonce = await getTransactionCount(publicClient, {
    address: account.address,
    blockTag: 'pending',
  });

  const raw = await account.signTransaction({
    type: 'eip1559',
    chainId: sepolia.id,
    to: tokenAddress as Address,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args }),
    value: 0n,
    nonce,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  const txHash = keccak256(raw);

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(transfers)
      .set({ status: 'signed', nonce })
      .where(
        and(
          eq(transfers.id, id),
          eq(transfers.status, 'queued'),
          eq(transfers.attempts, attempts),
        ),
      )
      .returning({ id: transfers.id });

    if (updated.length === 0) throw new LeaseLostError(id);

    await tx.insert(transferAttempts).values({
      transferId: id,
      txHash,
      rawTx: raw,
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    });
  });
};

export const send = async ({ id, attempts }: ClaimedTransfer) => {
  const [attempt] = await db
    .select()
    .from(transferAttempts)
    .where(eq(transferAttempts.transferId, id))
    .orderBy(desc(transferAttempts.createdAt))
    .limit(1);
  if (!attempt) throw new Error(`no attempts for transfer ${id}`);

  try {
    await sendRawTransaction(publicClient, {
      serializedTransaction: attempt.rawTx as Hex,
    });
  } catch (e) {
    if (!isAlreadyKnown(e)) throw e;

    logger.warn({ id }, 'tx already known to node, moving on');
  }

  const updated = await db
    .update(transfers)
    .set({
      status: 'sent',
      nextAttemptAt: sql`now() + make_interval(secs => ${CHECK_DELAY_MS / 1000})`,
      lockedUntil: null,
    })
    .where(
      and(
        eq(transfers.id, id),
        eq(transfers.status, 'signed'),
        eq(transfers.attempts, attempts),
      ),
    )
    .returning({ id: transfers.id });

  if (updated.length <= 0) throw new LeaseLostError(id);
};

const guardedUpdate = async (
  row: { id: string; attempts: number },
  from: TransferStatus,
  values: PgUpdateSetSource<typeof transfers>,
  executor: Executor = db,
): Promise<void> => {
  const updated = await executor
    .update(transfers)
    .set({ lockedUntil: null, ...values })
    .where(
      and(
        eq(transfers.id, row.id),
        eq(transfers.status, from),
        eq(transfers.attempts, row.attempts),
      ),
    )
    .returning({ id: transfers.id });

  if (updated.length === 0) {
    throw new LeaseLostError(row.id);
  }
};

const getReceiptOrNull = async (hash: `0x${string}`) => {
  try {
    return await getTransactionReceipt(publicClient, { hash });
  } catch (err) {
    if (err instanceof TransactionReceiptNotFoundError) {
      return null;
    }

    throw err;
  }
};

const getTransactionOrNull = async (hash: `0x${string}`) => {
  try {
    return await getTransaction(publicClient, { hash });
  } catch (err) {
    if (err instanceof TransactionNotFoundError) {
      return null;
    }

    throw err;
  }
};

const applyReceipt = async (
  { id, attempts }: { id: string; attempts: number },
  receipt: TransactionReceipt,
) => {
  if (receipt.status === 'success') {
    await guardedUpdate({ id, attempts }, 'sent', {
      status: 'confirmed',
    });
  } else {
    await guardedUpdate({ id, attempts }, 'sent', {
      status: 'failed',
      lastError: `reverted in block ${receipt.blockNumber}`,
    });
  }
};

export const check = async ({ id, nonce, attempts }: ClaimedTransfer) => {
  if (nonce === null) throw new Error(`sent transfer ${id} has no nonce`);

  const [lastAttempt] = await db
    .select()
    .from(transferAttempts)
    .where(eq(transferAttempts.transferId, id))
    .orderBy(desc(transferAttempts.createdAt))
    .limit(1);

  if (!lastAttempt) throw new Error(`no transfer attempts for ${id} transfer`);

  const receipt = await getReceiptOrNull(lastAttempt.txHash as `0x${string}`);
  if (receipt) {
    await applyReceipt({ id, attempts }, receipt);

    return;
  }

  const txNonce = await getTransactionCount(publicClient, {
    address: account.address,
    blockTag: 'latest',
  });

  if (txNonce <= nonce) {
    const tx = await getTransactionOrNull(lastAttempt.txHash as `0x${string}`);

    if (!tx) {
      try {
        logger.warn(
          { id, txHash: lastAttempt.txHash },
          'tx not found in mempool, rebroadcasting',
        );

        await sendRawTransaction(publicClient, {
          serializedTransaction: lastAttempt.rawTx as Hex,
        });
      } catch (err) {
        if (!isAlreadyKnown(err)) throw err;
      }
    }

    await guardedUpdate({ id, attempts }, 'sent', {
      nextAttemptAt: sql`now() + make_interval(secs => ${CHECK_DELAY_MS / 1000})`,
    });

    return;
  }

  const lastReceipt = await getReceiptOrNull(lastAttempt.txHash as `0x${string}`);
  if (lastReceipt) {
    await applyReceipt({ id, attempts }, lastReceipt);

    return;
  }

  await guardedUpdate({ id, attempts }, 'sent', {
    status: 'failed',
    lastError: `nonce is consumed by another tx`,
  });
  logger.error({ id, nonce, attempts }, 'nonce is consumed by another tx');
};

export const preflight = async () => {
  const chainId = await getChainId(publicClient);
  if (chainId !== sepolia.id)
    throw new Error(`RPC is on chain ${chainId}, expected ${sepolia.id}`);

  const eth = await getBalance(publicClient, { address: account.address });
  logger.info(
    { address: account.address, eth: formatEther(eth), chainId },
    'worker preflight ok',
  );

  if (eth === 0n) logger.warn('relayer has no ETH for gas');
};
