declare module 'tronweb' {
  interface TronTransaction {
    txid: string;
    result: boolean;
  }

  interface TronTransactionOptions {
    feeLimit?: number;
  }

  class TronWeb {
    constructor(options: { 
      fullHost: string; 
      headers?: Record<string, string>;
      privateKey?: string;
    });
    createAccount(): Promise<{ address: { base58: string }, privateKey: string }>;
    contract(): { at: (address: string) => Promise<any> };
    setPrivateKey(key: string): void;
    setAddress(address: string): void;
    fromSun(value: string | number): number;
    toSun(value: number): string;
    address: {
      toHex(address: string): string;
      fromHex(hex: string): string;
    };
    trx: {
      getBalance(address: string): Promise<string>;
      sendTransaction(to: string, amount: number, options?: TronTransactionOptions): Promise<TronTransaction>;
      getAccount(address: string): Promise<any>;
    };
  }
  export default TronWeb;
} 