import {
  BaseError,
  ContractFunctionRevertedError,
  HttpRequestError,
  TimeoutError,
} from 'viem';

export type FailureKind = 'revert' | 'network' | 'unexpected';

export const classify = (e: unknown): FailureKind => {
  if (e instanceof BaseError) {
    if (e.walk((x) => x instanceof ContractFunctionRevertedError)) return 'revert';
    if (e.walk((x) => x instanceof HttpRequestError || x instanceof TimeoutError))
      return 'network';
  }

  return 'unexpected';
};
