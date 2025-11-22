
import React, { useState, useEffect } from 'react';
import { X, Trash2, RefreshCw, Settings } from 'lucide-react';
import { Asset, TransactionType } from '../types';
import { GeminiService } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onDelete: (assetId: string) => void;
  onUpdateValue: (assetId: string, newValue: number) => void; // New handler for just updating market value
  initialAsset?: Asset | null; 
}

type ModalTab = 'TRANSACTION' | 'SETTINGS' | 'VALUE_UPDATE';

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, onDelete, onUpdateValue, initialAsset }) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('TRANSACTION');
  
  // Common State
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // New Asset / Settings State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [direction, setDirection] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  // Value Update State
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialAsset) {
        setName(initialAsset.name);
        setCode(initialAsset.code || '');
        setDirection(initialAsset.investmentDirection);
        setTargetAmount(initialAsset.targetAmount.toString());
        setNewValue(initialAsset.currentValue.toString());
        setActiveTab('TRANSACTION'); // Default to trade
      } else {
        // New Asset Mode
        setName('');
        setCode('');
        setDirection('');
        setTargetAmount('');
        setAmount('');
        setTransactionType(TransactionType.BUY);
        setActiveTab('TRANSACTION');
      }
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [initialAsset, isOpen]);

  // AI Suggestion
  const handleNameBlur = async () => {
    if (!initialAsset && name.length > 2 && !direction) {
        setIsSuggestionsLoading(true);
        const suggestion = await GeminiService.suggestFundCategory(name);
        if (suggestion) setDirection(suggestion);
        setIsSuggestionsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'VALUE_UPDATE' && initialAsset) {
      onUpdateValue(initialAsset.id, Number(newValue));
      onClose();
      return;
    }

    // Standard Transaction or New Asset or Settings Update
    onSubmit({
      isNewAsset: !initialAsset,
      isSettingsUpdate: activeTab === 'SETTINGS',
      assetData: {
        id: initialAsset?.id,
        name,
        code,
        investmentDirection: direction,
        targetAmount: Number(targetAmount)
      },
      transactionData: activeTab === 'TRANSACTION' ? {
        type: transactionType,
        amount: Number(amount),
        date: date,
      } : null
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialAsset && window.confirm('确定要删除此资产吗？交易记录将被保留。')) {
      onDelete(initialAsset.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">
            {!initialAsset ? '新增基金资产' : initialAsset.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs for Existing Assets */}
        {initialAsset && (
          <div className="flex border-b border-gray-100">
            <button 
              onClick={() => setActiveTab('TRANSACTION')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'TRANSACTION' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              交易 (买/卖)
            </button>
            <button 
              onClick={() => setActiveTab('VALUE_UPDATE')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'VALUE_UPDATE' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              修正市值
            </button>
            <button 
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'SETTINGS' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              编辑/删除
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* --- NEW ASSET FORM --- */}
          {!initialAsset && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">基金名称</label>
                <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameBlur}
                  placeholder="例如：易方达蓝筹精选"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">基金代码 (可选)</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={code} onChange={(e) => setCode(e.target.value)}
                  placeholder="例如：005827"
                />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1 flex justify-between">
                   <span>投资方向 (用于资产分布统计)</span>
                   {isSuggestionsLoading && <span className="text-blue-500 animate-pulse text-xs">AI 识别中...</span>}
                 </label>
                 <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={direction} onChange={(e) => setDirection(e.target.value)}
                  placeholder="例如：白酒、新能源、美股科技"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目标持仓金额 (规划)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                 <p className="text-xs font-bold text-gray-700 mb-2">初始买入</p>
                 <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number" required step="0.01"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}

          {/* --- EXISTING ASSET: TRANSACTION TAB --- */}
          {initialAsset && activeTab === 'TRANSACTION' && (
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-3">
                 <button
                   type="button"
                   onClick={() => setTransactionType(TransactionType.BUY)}
                   className={`py-2.5 text-sm font-medium border rounded-lg flex items-center justify-center ${transactionType === TransactionType.BUY ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                 >
                   买入 / 定投
                 </button>
                 <button
                   type="button"
                   onClick={() => setTransactionType(TransactionType.SELL)}
                   className={`py-2.5 text-sm font-medium border rounded-lg flex items-center justify-center ${transactionType === TransactionType.SELL ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-200 text-gray-600'}`}
                 >
                   卖出 / 赎回
                 </button>
               </div>

               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">交易金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number" required step="0.01"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">注意：此操作会同时调整 投入本金 和 当前市值。</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">日期</label>
                <input 
                  type="date" required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none"
                  value={date} onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* --- EXISTING ASSET: VALUE UPDATE TAB --- */}
          {initialAsset && activeTab === 'VALUE_UPDATE' && (
             <div className="space-y-4">
               <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                 当前记录市值: <strong>${initialAsset.currentValue.toFixed(2)}</strong>
                 <br/>
                 <span className="text-xs opacity-80">请根据基金APP最新净值更新总金额。这不会影响本金，只会更新浮动盈亏。</span>
               </div>
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">最新总市值</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number" required step="0.01"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newValue} onChange={(e) => setNewValue(e.target.value)}
                  />
                </div>
              </div>
             </div>
          )}

          {/* --- EXISTING ASSET: SETTINGS TAB --- */}
          {initialAsset && activeTab === 'SETTINGS' && (
             <div className="space-y-4">
               <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">基金名称</label>
                <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">基金代码</label>
                <input 
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none"
                  value={code} onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">投资方向</label>
                 <input 
                  type="text" required
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none"
                  value={direction} onChange={(e) => setDirection(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">目标持仓金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                  <input 
                    type="number" step="0.01"
                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-sm outline-none"
                    value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="mr-2" />
                  删除此资产
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">删除后，该资产将从列表中隐藏，但历史交易记录会保留。</p>
              </div>
             </div>
          )}

          {/* Footer Button */}
          {activeTab !== 'SETTINGS' && (
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-md mt-2"
            >
              {activeTab === 'VALUE_UPDATE' ? '确认更新市值' : (initialAsset ? '确认交易' : '创建资产')}
            </button>
          )}
          {activeTab === 'SETTINGS' && (
             <button 
             type="submit"
             className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 rounded-lg transition-colors shadow-md mt-2"
           >
             保存设置
           </button>
          )}

        </form>
      </div>
    </div>
  );
};
