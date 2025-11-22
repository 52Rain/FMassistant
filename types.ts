
export enum TransactionType {
  BUY = 'BUY',        // 买入 / 定投
  SELL = 'SELL',      // 卖出 / 赎回
}

export interface Asset {
  id: string;
  name: string;
  code?: string;          // Fund Code (e.g., 007467)
  investmentDirection: string; // e.g., "Gold", "Bonds", "Tech"
  costBasis: number;      // Net Invested (Total Buys - Total Sells)
  currentValue: number;   // Current Market Value (Manually updated or adjusted by tx)
  targetAmount: number;   // Target holding amount
  status: 'ACTIVE' | 'DELETED';
  notes?: string;
}

export interface Transaction {
  id: string;
  assetId: string;
  assetName: string;
  type: TransactionType;
  amount: number;      // Transaction Value
  date: string;
  notes?: string;
}

export interface PortfolioStats {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  gainPercentage: number;
  targetTotal: number;
}
