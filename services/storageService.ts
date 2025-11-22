
import { Asset, Transaction } from '../types';

// Updated version key to force fresh data load
const ASSETS_KEY = 'wealthfolio_assets_v3';
const TRANSACTIONS_KEY = 'wealthfolio_transactions_v3';

const DEFAULT_ASSETS: Asset[] = [
  { id: '1', name: '华泰柏瑞中证红利低波动ETF联接C', code: '007467', investmentDirection: '红利', targetAmount: 10000, costBasis: 4978.04, currentValue: 5060.35, status: 'ACTIVE' },
  { id: '2', name: '平安鑫瑞混合C', code: '011762', investmentDirection: '债券', targetAmount: 20000, costBasis: 1007.76, currentValue: 1012.24, status: 'ACTIVE' },
  { id: '3', name: '国泰黄金ETF联接C', code: '004253', investmentDirection: '黄金', targetAmount: 50000, costBasis: 4557.71, currentValue: 4602.61, status: 'ACTIVE' },
  { id: '4', name: '天弘沪深300ETF联接C', code: '005918', investmentDirection: '宽基指数', targetAmount: 10000, costBasis: 3841.62, currentValue: 3831.85, status: 'ACTIVE' },
  { id: '5', name: '富国中证A500ETF联接C', code: '022464', investmentDirection: '宽基指数', targetAmount: 10000, costBasis: 1000.00, currentValue: 974.33, status: 'ACTIVE' },
  { id: '6', name: '天弘创业板ETF联接C', code: '001593', investmentDirection: '宽基指数', targetAmount: 5000, costBasis: 3771.44, currentValue: 3628.89, status: 'ACTIVE' },
  { id: '7', name: '南方恒生ETF联接C', code: '005659', investmentDirection: '宽基指数', targetAmount: 5000, costBasis: 1000.00, currentValue: 946.07, status: 'ACTIVE' },
  { id: '8', name: '创金合信全球芯片产业股票(QDII)C', code: '017654', investmentDirection: '全球芯片', targetAmount: 10000, costBasis: 700.00, currentValue: 700.00, status: 'ACTIVE' },
  { id: '9', name: '富国全球消费精选混合(QDII)C', code: '012062', investmentDirection: '全球消费', targetAmount: 5000, costBasis: 1898.03, currentValue: 1873.04, status: 'ACTIVE' },
  { id: '10', name: '银华海外数字经济量化选股混合(QDII)C', code: '016702', investmentDirection: '海外科技', targetAmount: 5000, costBasis: 1698.08, currentValue: 1740.85, status: 'ACTIVE' }
];

export const StorageService = {
  getAssets: (): Asset[] => {
    const data = localStorage.getItem(ASSETS_KEY);
    if (!data) {
      // Initialize with default data if empty
      localStorage.setItem(ASSETS_KEY, JSON.stringify(DEFAULT_ASSETS));
      return DEFAULT_ASSETS;
    }
    return JSON.parse(data);
  },

  saveAssets: (assets: Asset[]) => {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  },

  // Helper to generate ID
  generateId: (): string => {
    return Math.random().toString(36).substring(2, 9);
  }
};
