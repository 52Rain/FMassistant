
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sparkles,
  Target,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';

import { Asset, Transaction, TransactionType, PortfolioStats } from './types';
import { StorageService } from './services/storageService';
import { GeminiService } from './services/geminiService';
import { TransactionModal } from './components/TransactionModal';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

// Chinese Market Colors: Red for Up/Gain, Green for Down/Loss
const COLOR_UP_TEXT = 'text-red-600';
const COLOR_DOWN_TEXT = 'text-emerald-600';
const FILL_UP = '#ef4444';
const FILL_DOWN = '#10b981';

const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatCard = ({ label, value, subValue, icon: Icon, trend, trendColor }: any) => (
  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        {subValue && (
          <p className={`text-xs mt-1 flex items-center ${trendColor ? trendColor : (trend === 'up' ? COLOR_UP_TEXT : trend === 'down' ? COLOR_DOWN_TEXT : 'text-gray-500')}`}>
            {trend === 'up' && <TrendingUp size={12} className="mr-1" />}
            {trend === 'down' && <TrendingDown size={12} className="mr-1" />}
            {subValue}
          </p>
        )}
      </div>
      <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'HOLDINGS' | 'HISTORY'>('DASHBOARD');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiCollapsed, setIsAiCollapsed] = useState(false);

  useEffect(() => {
    setAssets(StorageService.getAssets());
    setTransactions(StorageService.getTransactions());
  }, []);

  // Filter active assets
  const activeAssets = useMemo(() => assets.filter(a => a.status !== 'DELETED'), [assets]);

  // Stats
  const stats: PortfolioStats = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let targetTotal = 0;

    activeAssets.forEach(asset => {
      totalValue += asset.currentValue;
      totalCost += asset.costBasis;
      targetTotal += asset.targetAmount || 0;
    });

    const totalGain = totalValue - totalCost;
    const gainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return { totalValue, totalCost, totalGain, gainPercentage, targetTotal };
  }, [activeAssets]);

  // --- Chart Data Preparation ---

  // 1. Allocation by Direction
  const directionData = useMemo(() => {
    const grouped: Record<string, number> = {};
    activeAssets.forEach(a => {
      const dir = a.investmentDirection || '其他';
      grouped[dir] = (grouped[dir] || 0) + a.currentValue;
    });
    return Object.keys(grouped)
      .map(key => ({ name: key, value: grouped[key] }))
      .sort((a, b) => b.value - a.value);
  }, [activeAssets]);

  // 2. Sector Performance (ROI %)
  const sectorPerformanceData = useMemo(() => {
    const grouped: Record<string, { cost: number, val: number }> = {};
    activeAssets.forEach(a => {
        const dir = a.investmentDirection || '其他';
        if (!grouped[dir]) grouped[dir] = { cost: 0, val: 0 };
        grouped[dir].cost += a.costBasis;
        grouped[dir].val += a.currentValue;
    });
    
    return Object.keys(grouped).map(dir => {
        const { cost, val } = grouped[dir];
        const gain = val - cost;
        const roi = cost > 0 ? (gain / cost) * 100 : 0;
        return { name: dir, roi: parseFloat(roi.toFixed(2)), gain };
    }).sort((a, b) => b.roi - a.roi);
  }, [activeAssets]);

  // 3. Deviation Data (Target vs Actual)
  const deviationData = useMemo(() => {
    return activeAssets
      .map(a => ({
        name: a.name.length > 10 ? a.name.substring(0, 10) + '...' : a.name,
        fullName: a.name,
        actual: a.currentValue,
        target: a.targetAmount,
        diff: a.currentValue - a.targetAmount
      }))
      .sort((a, b) => b.diff - a.diff);
  }, [activeAssets]);

  // 4. Profit Leaders (Individual Gains)
  const profitLeaderData = useMemo(() => {
      return activeAssets.map(a => ({
          name: a.name.length > 8 ? a.name.substring(0, 8) + '...' : a.name,
          fullName: a.name,
          gain: a.currentValue - a.costBasis
      })).sort((a, b) => b.gain - a.gain);
  }, [activeAssets]);

  // Handlers
  const handleTransactionSubmit = (data: any) => {
    const { isNewAsset, isSettingsUpdate, assetData, transactionData } = data;
    let newAssets = [...assets];
    
    if (isNewAsset) {
      const newAsset: Asset = {
        id: StorageService.generateId(),
        name: assetData.name,
        code: assetData.code,
        investmentDirection: assetData.investmentDirection,
        targetAmount: assetData.targetAmount,
        costBasis: transactionData.amount, // Initial Buy
        currentValue: transactionData.amount, // Initial Value
        status: 'ACTIVE',
        notes: ''
      };
      newAssets.push(newAsset);
      
      // Log Initial Buy
      const newTx: Transaction = {
        id: StorageService.generateId(),
        assetId: newAsset.id,
        assetName: newAsset.name,
        type: transactionData.type,
        amount: transactionData.amount,
        date: transactionData.date
      };
      const newTxs = [newTx, ...transactions];
      setTransactions(newTxs);
      StorageService.saveTransactions(newTxs);
    } else {
      // Update Existing Asset
      newAssets = newAssets.map(asset => {
        if (asset.id === assetData.id) {
          let updatedAsset = { ...asset };
          
          // Update Settings
          if (isSettingsUpdate) {
             updatedAsset.name = assetData.name;
             updatedAsset.code = assetData.code;
             updatedAsset.investmentDirection = assetData.investmentDirection;
             updatedAsset.targetAmount = assetData.targetAmount;
          }

          // Apply Transaction Logic
          if (transactionData) {
            const isBuy = transactionData.type === TransactionType.BUY;
            const amount = transactionData.amount;
            
            if (isBuy) {
              updatedAsset.costBasis += amount;
              updatedAsset.currentValue += amount;
            } else {
              updatedAsset.costBasis -= amount; // Net Investment reduces
              updatedAsset.currentValue -= amount;
            }
            
            if (updatedAsset.currentValue < 0) updatedAsset.currentValue = 0;
          }
          return updatedAsset;
        }
        return asset;
      });

      if (transactionData) {
        const newTx: Transaction = {
          id: StorageService.generateId(),
          assetId: assetData.id,
          assetName: assets.find(a => a.id === assetData.id)?.name || '',
          type: transactionData.type,
          amount: transactionData.amount,
          date: transactionData.date
        };
        const newTxs = [newTx, ...transactions];
        setTransactions(newTxs);
        StorageService.saveTransactions(newTxs);
      }
    }

    setAssets(newAssets);
    StorageService.saveAssets(newAssets);
    setSelectedAsset(null);
  };

  const handleDeleteAsset = (assetId: string) => {
    const newAssets = assets.map(a => a.id === assetId ? { ...a, status: 'DELETED' as const } : a);
    setAssets(newAssets);
    StorageService.saveAssets(newAssets);
    setSelectedAsset(null);
  };

  const handleUpdateValue = (assetId: string, newValue: number) => {
    const newAssets = assets.map(a => a.id === assetId ? { ...a, currentValue: newValue } : a);
    setAssets(newAssets);
    StorageService.saveAssets(newAssets);
  };

  const handleAiAnalysis = async () => {
    if (isAiCollapsed) setIsAiCollapsed(false);
    setIsAiLoading(true);
    // Clear previous slightly to show loading state if regenerating
    setAiAnalysis(null);
    const result = await GeminiService.analyzePortfolio(assets, transactions.slice(0, 10));
    setAiAnalysis(result);
    setIsAiLoading(false);
  };

  // Renderers
  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* 1. Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="总持仓市值" 
          value={formatCurrency(stats.totalValue)}
          subValue={`累计投入: ${formatCurrency(stats.totalCost)}`}
          trend="neutral"
          icon={Wallet}
        />
        <StatCard 
          label="总盈亏" 
          value={`${stats.totalGain >= 0 ? '+' : ''}${formatCurrency(stats.totalGain)}`}
          subValue={`${stats.gainPercentage >= 0 ? '+' : ''}${stats.gainPercentage.toFixed(2)}% 回报率`}
          trend={stats.totalGain >= 0 ? 'up' : 'down'}
          icon={DollarSign}
        />
        <StatCard 
          label="持仓规划完成度" 
          value={stats.targetTotal > 0 ? `${((stats.totalValue / stats.targetTotal) * 100).toFixed(1)}%` : 'N/A'}
          subValue={`目标总持仓: ${formatCurrency(stats.targetTotal)}`}
          trend="neutral"
          trendColor="text-blue-600"
          icon={Target}
        />
      </div>

      {/* 2. AI Insights - Collapsible & Regenerable */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-blue-50 rounded-xl border border-blue-100 shadow-sm">
        <div 
          className="p-5 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setIsAiCollapsed(!isAiCollapsed)}
        >
           <div className="flex items-center">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI 投资组合分析</h3>
                <p className="text-xs text-gray-500">基于当前 {activeAssets.length} 个持仓基金的智能诊断</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); handleAiAnalysis(); }}
                disabled={isAiLoading}
                className="flex items-center text-sm bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={14} className={`mr-2 ${isAiLoading ? 'animate-spin' : ''}`} />
                {aiAnalysis ? '重新生成' : '生成报告'}
              </button>
              <div className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                {isAiCollapsed ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
              </div>
           </div>
        </div>
        
        {!isAiCollapsed && (
          <div className="px-6 pb-6 border-t border-blue-50/50 pt-4">
             {isAiLoading && (
               <div className="flex items-center justify-center py-8 space-x-2 text-blue-600">
                 <Sparkles size={20} className="animate-pulse" />
                 <span className="text-sm font-medium">AI 正在深入分析您的投资分布与风险...</span>
               </div>
             )}
             {aiAnalysis && (
                 <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<b class="text-gray-900">$1</b>') }} 
                 />
             )}
             {!aiAnalysis && !isAiLoading && (
               <div className="text-center py-6">
                 <p className="text-sm text-gray-500 mb-3">暂无分析报告</p>
                 <button onClick={handleAiAnalysis} className="text-blue-600 hover:underline text-sm">立即生成</button>
               </div>
             )}
          </div>
        )}
      </div>

      {/* 3. Charts Area - Vertical Stack */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Row 1: Asset Allocation & Sector ROI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1.1 Asset Allocation */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-base font-bold text-gray-800 flex items-center">
                 <PieIcon size={18} className="mr-2 text-gray-500"/> 投资方向分布 (市值)
               </h3>
               <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">By Market Value</span>
            </div>
            <div className="flex-1 flex flex-row items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={directionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {directionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 pl-4 h-64 overflow-y-auto custom-scrollbar">
                <ul className="space-y-2">
                  {directionData.map((entry, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-gray-600 truncate max-w-[100px]" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="font-medium text-gray-900">{((entry.value / stats.totalValue) * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 1.2 Sector Performance */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-base font-bold text-gray-800 flex items-center">
                 <TrendingUp size={18} className="mr-2 text-gray-500"/> 各板块收益率 (ROI)
               </h3>
               <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500">Weighted Avg</span>
            </div>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorPerformanceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" unit="%" tick={{fontSize: 11}} />
                  <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                  <RechartTooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                            <p className="font-bold mb-1">{data.name}</p>
                            <p className={`${data.roi >= 0 ? COLOR_UP_TEXT : COLOR_DOWN_TEXT}`}>
                              收益率: {data.roi > 0 ? '+' : ''}{data.roi}%
                            </p>
                            <p className="text-gray-500 text-xs">盈亏额: {formatCurrency(data.gain)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="roi" barSize={20} radius={[0, 4, 4, 0]}>
                    {sectorPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.roi >= 0 ? FILL_UP : FILL_DOWN} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 2: Deviation Analysis (Full Width) */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-base font-bold text-gray-800 flex items-center">
               <Target size={18} className="mr-2 text-gray-500"/> 持仓偏差分析 (实际 - 目标)
             </h3>
             <div className="flex gap-4 text-xs text-gray-500">
               <span className="flex items-center"><div className={`w-3 h-3 mr-1 rounded-sm bg-red-500`}></div> 超配 (Overweight)</span>
               <span className="flex items-center"><div className={`w-3 h-3 mr-1 rounded-sm bg-emerald-500`}></div> 低配 (Underweight)</span>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             <div style={{ height: Math.max(400, deviationData.length * 45) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={deviationData}
                  margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12, fill: '#4b5563'}} interval={0} />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  <RechartTooltip 
                    cursor={{fill: '#f9fafb'}}
                    formatter={(value: any) => [formatCurrency(value), '偏差金额']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload.fullName || label}
                  />
                  <Bar dataKey="diff" barSize={16} radius={[0, 3, 3, 0]}>
                    {deviationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.diff > 0 ? FILL_UP : FILL_DOWN} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 3: Profit Breakdown (Full Width) */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-base font-bold text-gray-800 flex items-center">
               <BarChart3 size={18} className="mr-2 text-gray-500"/> 个基盈亏贡献
             </h3>
             <span className="text-xs text-gray-400">绝对金额 (Absolute PnL)</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div style={{ height: Math.max(400, profitLeaderData.length * 45) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={profitLeaderData}
                  margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12, fill: '#4b5563'}} interval={0} />
                  <ReferenceLine x={0} stroke="#9ca3af" />
                  <RechartTooltip 
                    cursor={{fill: '#f9fafb'}}
                    formatter={(value: any) => [formatCurrency(value), '盈亏']}
                    labelFormatter={(label, payload) => payload?.[0]?.payload.fullName || label}
                  />
                  <Bar dataKey="gain" barSize={16} radius={[0, 3, 3, 0]}>
                    {profitLeaderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.gain >= 0 ? FILL_UP : FILL_DOWN} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssetList = () => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">基金名称 / 代码</th>
              <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">投资方向</th>
              <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">累计投入(本金)</th>
              <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">当前市值</th>
              <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">目标规划</th>
              <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">偏差</th>
              <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">总盈亏</th>
              <th className="text-center text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeAssets.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400">暂无持仓，请点击右上角添加基金。</td></tr>
            ) : activeAssets.map((asset) => {
              const gain = asset.currentValue - asset.costBasis;
              const gainPct = asset.costBasis !== 0 ? (gain / asset.costBasis) * 100 : 0;
              const deviation = asset.currentValue - asset.targetAmount;

              return (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900 text-sm max-w-[200px] truncate" title={asset.name}>{asset.name}</div>
                    {asset.code && <div className="text-xs text-gray-400 font-mono mt-0.5">{asset.code}</div>}
                  </td>
                   <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {asset.investmentDirection}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-sm text-gray-600">{formatCurrency(asset.costBasis)}</td>
                  <td className="py-4 px-6 text-right text-sm font-bold text-gray-900">{formatCurrency(asset.currentValue)}</td>
                  <td className="py-4 px-6 text-right text-sm text-gray-500">
                    {formatCurrency(asset.targetAmount)}
                  </td>
                  <td className={`py-4 px-6 text-right text-sm font-medium ${deviation > 0 ? COLOR_UP_TEXT : COLOR_DOWN_TEXT}`}>
                    {deviation > 0 ? '+' : ''}{formatCurrency(deviation)}
                  </td>
                  <td className={`py-4 px-6 text-right text-sm font-bold ${gain >= 0 ? COLOR_UP_TEXT : COLOR_DOWN_TEXT}`}>
                    <div>{gain >= 0 ? '+' : ''}{formatCurrency(gain)}</div>
                    <div className="text-[10px] font-normal mt-0.5 opacity-80 bg-opacity-10 rounded px-1 inline-block">
                      {gainPct > 0 ? '+' : ''}{gainPct.toFixed(2)}%
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button 
                      onClick={() => { setSelectedAsset(asset); setIsModalOpen(true); }}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      
      {/* Sidebar */}
      <aside className="bg-white border-r border-gray-200 w-full md:w-64 flex-shrink-0 sticky top-0 z-20 h-auto md:h-screen flex flex-col">
        <div className="p-6 flex items-center justify-center md:justify-start border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mr-3 shadow-lg shadow-indigo-200">
            W
          </div>
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">WealthFolio</h1>
        </div>
        
        <nav className="p-4 space-y-1 flex flex-row md:flex-col justify-around md:justify-start overflow-x-auto">
          <button 
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full transition-all duration-200 ${activeTab === 'DASHBOARD' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <LayoutDashboard size={18} className={`mr-3 ${activeTab === 'DASHBOARD' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="hidden md:inline">概览分析</span>
          </button>
          <button 
            onClick={() => setActiveTab('HOLDINGS')}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full transition-all duration-200 ${activeTab === 'HOLDINGS' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Wallet size={18} className={`mr-3 ${activeTab === 'HOLDINGS' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="hidden md:inline">我的基金</span>
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl w-full transition-all duration-200 ${activeTab === 'HISTORY' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <History size={18} className={`mr-3 ${activeTab === 'HISTORY' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <span className="hidden md:inline">交易记录</span>
          </button>
        </nav>
        
        <div className="p-4 mt-auto hidden md:block">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-4 text-white shadow-lg shadow-indigo-200">
               <p className="text-xs font-medium opacity-80 mb-1">总资产</p>
               <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
               <button 
                onClick={() => { setSelectedAsset(null); setIsModalOpen(true); }}
                className="w-full mt-4 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition-colors backdrop-blur-sm"
              >
                <PlusCircle size={16} className="mr-2" />
                记一笔
              </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen scroll-smooth">
        <header className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === 'DASHBOARD' && '基金概览 & 深度分析'}
                {activeTab === 'HOLDINGS' && '持仓管理'}
                {activeTab === 'HISTORY' && '交易流水'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
               {activeTab === 'DASHBOARD' ? '多维度透视您的资产分布、收益来源及持仓健康度。' : '管理您的基金列表与持仓目标。'}
            </p>
          </div>
          
          <button 
            onClick={() => { setSelectedAsset(null); setIsModalOpen(true); }}
            className="md:hidden bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle size={24} />
          </button>
        </header>

        {activeTab === 'DASHBOARD' && renderDashboard()}
        {activeTab === 'HOLDINGS' && renderAssetList()}
        {activeTab === 'HISTORY' && (
           <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-gray-50 border-b border-gray-200">
                   <tr>
                     <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">日期</th>
                     <th className="text-left text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">基金名称</th>
                     <th className="text-center text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">类型</th>
                     <th className="text-right text-xs font-bold text-gray-600 uppercase tracking-wider py-4 px-6">金额</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {transactions.length === 0 ? (
                     <tr><td colSpan={4} className="text-center py-16 text-gray-500">暂无交易记录。</td></tr>
                   ) : transactions.map((tx) => (
                     <tr key={tx.id} className="hover:bg-gray-50">
                       <td className="py-4 px-6 text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                       <td className="py-4 px-6 text-sm font-medium text-gray-900">{tx.assetName}</td>
                       <td className="py-4 px-6 text-center">
                         <span className={`px-2.5 py-1 text-xs rounded-full font-medium
                           ${tx.type === 'BUY' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                           {tx.type === 'BUY' ? '买入/定投' : '卖出/赎回'}
                         </span>
                       </td>
                       <td className="py-4 px-6 text-right text-sm font-bold text-gray-900">{formatCurrency(tx.amount)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}
      </main>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTransactionSubmit}
        onDelete={handleDeleteAsset}
        onUpdateValue={handleUpdateValue}
        initialAsset={selectedAsset}
      />
    </div>
  );
}
