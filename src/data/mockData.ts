import type { Receivable, Payable, CashFlowPrediction, Alert, PredictionVersion } from '@/types';

export const mockReceivables: Receivable[] = [
  { id: 'r1', customerName: '华为技术有限公司', amount: 2800000, dueDate: '2026-07-15', status: 'pending', collectionProbability: 92, riskLevel: 'A', isAnomaly: false },
  { id: 'r2', customerName: '腾讯科技有限公司', amount: 1560000, dueDate: '2026-07-20', status: 'pending', collectionProbability: 88, riskLevel: 'A', isAnomaly: false },
  { id: 'r3', customerName: '阿里巴巴集团', amount: 980000, dueDate: '2026-06-30', status: 'overdue', collectionProbability: 45, riskLevel: 'C', isAnomaly: true, anomalyReason: '已逾期15天未回款' },
  { id: 'r4', customerName: '字节跳动科技', amount: 2100000, dueDate: '2026-08-10', status: 'pending', collectionProbability: 78, riskLevel: 'B', isAnomaly: false },
  { id: 'r5', customerName: '小米科技有限公司', amount: 650000, dueDate: '2026-07-05', status: 'partial', collectionProbability: 70, riskLevel: 'B', isAnomaly: false },
  { id: 'r6', customerName: '美团点评', amount: 1200000, dueDate: '2026-06-25', status: 'overdue', collectionProbability: 35, riskLevel: 'D', isAnomaly: true, anomalyReason: '金额异常：超出历史均值200%' },
  { id: 'r7', customerName: '京东集团', amount: 1890000, dueDate: '2026-08-01', status: 'pending', collectionProbability: 85, riskLevel: 'A', isAnomaly: false },
  { id: 'r8', customerName: '网易公司', amount: 420000, dueDate: '2026-07-28', status: 'pending', collectionProbability: 90, riskLevel: 'A', isAnomaly: false },
  { id: 'r9', customerName: '比亚迪股份', amount: 3200000, dueDate: '2026-07-12', status: 'pending', collectionProbability: 55, riskLevel: 'C', isAnomaly: true, anomalyReason: '疑似重复记录' },
  { id: 'r10', customerName: '中兴通讯', amount: 780000, dueDate: '2026-08-15', status: 'pending', collectionProbability: 62, riskLevel: 'B', isAnomaly: false },
  { id: 'r11', customerName: '联想集团', amount: 540000, dueDate: '2026-07-22', status: 'pending', collectionProbability: 82, riskLevel: 'A', isAnomaly: false },
  { id: 'r12', customerName: '格力电器', amount: 310000, dueDate: '2026-09-01', status: 'pending', collectionProbability: 75, riskLevel: 'B', isAnomaly: false },
];

export const mockPayables: Payable[] = [
  { id: 'p1', supplierName: '台积电半导体', amount: 3500000, dueDate: '2026-07-10', status: 'pending', paymentPressure: 95, priority: 1 },
  { id: 'p2', supplierName: '三星电子', amount: 2200000, dueDate: '2026-07-15', status: 'pending', paymentPressure: 82, priority: 2 },
  { id: 'p3', supplierName: '英特尔中国', amount: 1800000, dueDate: '2026-07-20', status: 'pending', paymentPressure: 70, priority: 3 },
  { id: 'p4', supplierName: '博世集团', amount: 960000, dueDate: '2026-07-25', status: 'pending', paymentPressure: 58, priority: 5 },
  { id: 'p5', supplierName: '高通通讯', amount: 1500000, dueDate: '2026-08-05', status: 'pending', paymentPressure: 65, priority: 4 },
  { id: 'p6', supplierName: 'SK海力士', amount: 2800000, dueDate: '2026-07-08', status: 'overdue', paymentPressure: 98, priority: 1 },
  { id: 'p7', supplierName: '德州仪器', amount: 670000, dueDate: '2026-08-12', status: 'pending', paymentPressure: 42, priority: 7 },
  { id: 'p8', supplierName: '英飞凌科技', amount: 430000, dueDate: '2026-08-20', status: 'pending', paymentPressure: 35, priority: 8 },
  { id: 'p9', supplierName: '恩智浦半导体', amount: 520000, dueDate: '2026-07-30', status: 'pending', paymentPressure: 48, priority: 6 },
  { id: 'p10', supplierName: '意法半导体', amount: 380000, dueDate: '2026-09-01', status: 'pending', paymentPressure: 28, priority: 9 },
];

export const mockPredictions: CashFlowPrediction[] = [
  { id: 'cf1', month: '2026-07', inflow: 8250000, outflow: 9860000, netFlow: -1610000, gap: 1610000, scenario: 'neutral' },
  { id: 'cf2', month: '2026-08', inflow: 9120000, outflow: 7530000, netFlow: 1590000, gap: 0, scenario: 'neutral' },
  { id: 'cf3', month: '2026-09', inflow: 7680000, outflow: 8950000, netFlow: -1270000, gap: 1270000, scenario: 'neutral' },
  { id: 'cf4', month: '2026-10', inflow: 10340000, outflow: 8120000, netFlow: 2220000, gap: 0, scenario: 'neutral' },
  { id: 'cf5', month: '2026-11', inflow: 8890000, outflow: 9340000, netFlow: -450000, gap: 450000, scenario: 'neutral' },
  { id: 'cf6', month: '2026-12', inflow: 11560000, outflow: 10230000, netFlow: 1330000, gap: 0, scenario: 'neutral' },
  { id: 'cf7', month: '2026-07', inflow: 9860000, outflow: 9860000, netFlow: 0, gap: 0, scenario: 'optimistic' },
  { id: 'cf8', month: '2026-08', inflow: 10560000, outflow: 7530000, netFlow: 3030000, gap: 0, scenario: 'optimistic' },
  { id: 'cf9', month: '2026-09', inflow: 9120000, outflow: 8950000, netFlow: 170000, gap: 0, scenario: 'optimistic' },
  { id: 'cf10', month: '2026-10', inflow: 11820000, outflow: 8120000, netFlow: 3700000, gap: 0, scenario: 'optimistic' },
  { id: 'cf11', month: '2026-11', inflow: 10230000, outflow: 9340000, netFlow: 890000, gap: 0, scenario: 'optimistic' },
  { id: 'cf12', month: '2026-12', inflow: 12890000, outflow: 10230000, netFlow: 2660000, gap: 0, scenario: 'optimistic' },
  { id: 'cf13', month: '2026-07', inflow: 6120000, outflow: 9860000, netFlow: -3740000, gap: 3740000, scenario: 'pessimistic' },
  { id: 'cf14', month: '2026-08', inflow: 7230000, outflow: 7530000, netFlow: -300000, gap: 300000, scenario: 'pessimistic' },
  { id: 'cf15', month: '2026-09', inflow: 5890000, outflow: 8950000, netFlow: -3060000, gap: 3060000, scenario: 'pessimistic' },
  { id: 'cf16', month: '2026-10', inflow: 8120000, outflow: 8120000, netFlow: 0, gap: 0, scenario: 'pessimistic' },
  { id: 'cf17', month: '2026-11', inflow: 6950000, outflow: 9340000, netFlow: -2390000, gap: 2390000, scenario: 'pessimistic' },
  { id: 'cf18', month: '2026-12', inflow: 9340000, outflow: 10230000, netFlow: -890000, gap: 890000, scenario: 'pessimistic' },
];

export const mockHistoricalCashFlow = [
  { month: '2025-07', inflow: 8500000, outflow: 7200000, netFlow: 1300000 },
  { month: '2025-08', inflow: 9200000, outflow: 8100000, netFlow: 1100000 },
  { month: '2025-09', inflow: 7800000, outflow: 9500000, netFlow: -1700000 },
  { month: '2025-10', inflow: 10500000, outflow: 8300000, netFlow: 2200000 },
  { month: '2025-11', inflow: 8900000, outflow: 9800000, netFlow: -900000 },
  { month: '2025-12', inflow: 12000000, outflow: 10500000, netFlow: 1500000 },
  { month: '2026-01', inflow: 7200000, outflow: 6800000, netFlow: 400000 },
  { month: '2026-02', inflow: 6800000, outflow: 7500000, netFlow: -700000 },
  { month: '2026-03', inflow: 9500000, outflow: 8200000, netFlow: 1300000 },
  { month: '2026-04', inflow: 8100000, outflow: 7900000, netFlow: 200000 },
  { month: '2026-05', inflow: 10200000, outflow: 9100000, netFlow: 1100000 },
  { month: '2026-06', inflow: 8700000, outflow: 9400000, netFlow: -700000 },
];

export const mockAlerts: Alert[] = [
  { id: 'a1', level: 'red', title: '资金缺口预警', description: '7月预计资金缺口161万元，低于安全余额线，请立即安排融资或加速回款', createdAt: '2026-06-15 09:30', isRead: false, notes: [] },
  { id: 'a2', level: 'orange', title: '逾期回款提醒', description: '阿里巴巴集团应收98万元已逾期15天，回款概率仅45%，建议催收', createdAt: '2026-06-15 08:15', isRead: false, notes: [] },
  { id: 'a3', level: 'orange', title: '高压力付款提醒', description: 'SK海力士应付280万元已逾期，付款压力指数98%，需优先处理', createdAt: '2026-06-14 16:45', isRead: true, notes: ['已联系财务安排付款'] },
  { id: 'a4', level: 'yellow', title: '9月资金压力预警', description: '9月预测净现金流-127万元，建议提前规划资金调度', createdAt: '2026-06-14 10:00', isRead: true, notes: [] },
  { id: 'a5', level: 'yellow', title: '客户回款风险', description: '美团点评回款概率仅35%，风险等级D，建议收紧信用额度', createdAt: '2026-06-13 14:20', isRead: true, notes: ['已通知销售部门'] },
  { id: 'a6', level: 'green', title: '10月资金改善', description: '10月预计净现金流222万元，资金状况改善', createdAt: '2026-06-13 09:00', isRead: true, notes: [] },
];

export const mockPredictionVersions: PredictionVersion[] = [
  {
    id: 'v1',
    name: '2026年6月预测V1',
    lockedAt: '2026-06-01 10:00',
    predictions: [
      { id: 'v1-cf1', month: '2026-07', inflow: 8000000, outflow: 9500000, netFlow: -1500000, gap: 1500000, scenario: 'neutral' },
      { id: 'v1-cf2', month: '2026-08', inflow: 9000000, outflow: 7200000, netFlow: 1800000, gap: 0, scenario: 'neutral' },
    ],
    actuals: [
      { id: 'v1-a1', month: '2026-07', inflow: 8250000, outflow: 9860000, netFlow: -1610000, gap: 1610000, scenario: 'neutral' },
      { id: 'v1-a2', month: '2026-08', inflow: 9120000, outflow: 7530000, netFlow: 1590000, gap: 0, scenario: 'neutral' },
    ],
  },
];

export function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return (amount / 10000).toFixed(1) + '万';
  }
  return amount.toLocaleString('zh-CN');
}

export function formatAmountFull(amount: number): string {
  return '¥' + amount.toLocaleString('zh-CN');
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'A': return 'text-emerald-400';
    case 'B': return 'text-ice-500';
    case 'C': return 'text-amber-500';
    case 'D': return 'text-coral-500';
    default: return 'text-gray-400';
  }
}

export function getRiskBg(level: string): string {
  switch (level) {
    case 'A': return 'bg-emerald-400/10 border-emerald-400/30';
    case 'B': return 'bg-ice-500/10 border-ice-500/30';
    case 'C': return 'bg-amber-500/10 border-amber-500/30';
    case 'D': return 'bg-coral-500/10 border-coral-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}

export function getAlertLevelColor(level: string): string {
  switch (level) {
    case 'green': return 'bg-emerald-500';
    case 'yellow': return 'bg-amber-500';
    case 'orange': return 'bg-orange-500';
    case 'red': return 'bg-coral-500';
    default: return 'bg-gray-500';
  }
}

export function getAlertLevelBorder(level: string): string {
  switch (level) {
    case 'green': return 'border-l-emerald-500';
    case 'yellow': return 'border-l-amber-500';
    case 'orange': return 'border-l-orange-500';
    case 'red': return 'border-l-coral-500';
    default: return 'border-l-gray-500';
  }
}

export function getProbabilityColor(prob: number): string {
  if (prob >= 80) return 'text-emerald-400';
  if (prob >= 60) return 'text-ice-500';
  if (prob >= 40) return 'text-amber-500';
  return 'text-coral-500';
}

export function getProbabilityBg(prob: number): string {
  if (prob >= 80) return 'bg-emerald-400';
  if (prob >= 60) return 'bg-ice-500';
  if (prob >= 40) return 'bg-amber-500';
  return 'bg-coral-500';
}
