export interface PoolData {
  id: string;
  poolManager: string;
  stableName: string;
  collatName: string;
  totalHedgeAmount: number;
  limitHAHedge: number;
  stockUser: number;
  feesForSLPs: number;
  stockSLP: number;
  timestamp: number;
  totalSLPFees: number;
  apr: number
}

export interface Perpetual {
  liquidationPrice: number;
  stableName: string;
  collatName: string;
  owner: string;
  perpetualID: string;
}

export interface OracleData {
  tokenIn: string;
  tokenOut: String;
  rateLower: number;
  rateUpper: number;
}
