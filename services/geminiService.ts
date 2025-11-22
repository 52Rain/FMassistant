
import { GoogleGenAI } from "@google/genai";
import { Asset, Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const GeminiService = {
  /**
   * Analyzes the current portfolio and provides insights.
   */
  analyzePortfolio: async (assets: Asset[], recentTransactions: Transaction[]) => {
    if (!process.env.API_KEY) {
      return "未检测到 API Key，请配置环境变量。";
    }

    // Filter active assets for analysis
    const activeAssets = assets.filter(a => a.status === 'ACTIVE');

    const portfolioSummary = activeAssets.map(a => {
      const gain = a.currentValue - a.costBasis;
      const gainPct = a.costBasis !== 0 ? (gain / a.costBasis * 100).toFixed(2) : '0';
      return `- ${a.name} [${a.investmentDirection}]: 当前市值 ${a.currentValue} (投入本金: ${a.costBasis}, 目标持仓: ${a.targetAmount}). 收益率: ${gainPct}%`;
    }).join('\n');

    const prompt = `
      你是一位专业的基金理财顾问。请分析以下的基金投资组合。
      
      当前持仓:
      ${portfolioSummary}

      请提供简明的分析，涵盖：
      1. 投资方向（${Array.from(new Set(activeAssets.map(a => a.investmentDirection))).join(', ')}）的分布风险。
      2. 持仓金额与目标金额（Target Amount）的偏差分析，给出调整建议。
      3. 针对当前市场环境的建议。
      
      保持语气专业且具有鼓励性。请使用简体中文输出 Markdown 格式。不要提及“股数”或“份额”，只关注金额和投资方向。
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "抱歉，暂时无法分析您的投资组合。请稍后再试。";
    }
  },

  /**
   * Suggests an investment direction category for a new fund name.
   */
  suggestFundCategory: async (fundName: string) => {
    if (!process.env.API_KEY) return "";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `将名为 "${fundName}" 的基金归类为一个简短的投资方向（例如："黄金"、"美股科技"、"国内债基"、"消费"、"医疗"）。只返回类别名称，使用简体中文。`,
        });
        return response.text.trim();
    } catch (e) {
        return "";
    }
  }
};
