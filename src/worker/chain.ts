import { privateKeyToAccount } from 'viem/accounts';
import { env } from '../config/worker-env.js';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(env.RPC_URL),
});
