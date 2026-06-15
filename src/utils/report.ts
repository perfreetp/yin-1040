import type { Receivable, Payable, CashFlowPrediction, PredictionVersion, Alert, ScenarioSimulation, SafetyBalance } from '@/types';

export interface BusinessReportData {
  currentBalance: number;
  totalReceivable: number;
  totalPayable: number;
  receivables: Receivable[];
  payables: Payable[];
  predictions: CashFlowPrediction[];
  alerts: Alert[];
  predictionVersions: PredictionVersion[];
  scenarios: ScenarioSimulation[];
  safetyBalance: SafetyBalance;
  alertFilter?: string;
  filterDescription?: string;
  generatedAt: string;
  includedChapters?: string[];
}

export function generateBusinessReport(data: BusinessReportData): string {
  const {
    currentBalance, totalReceivable, totalPayable,
    receivables, payables, predictions, alerts,
    predictionVersions, scenarios, safetyBalance,
    alertFilter, filterDescription,
  } = data;

  const neutral = predictions.filter((p) => p.scenario === 'neutral');
  const totalGap = neutral.reduce((s, p) => s + p.gap, 0);
  const gapMonths = neutral.filter((p) => p.gap > 0);
  const netFlow = neutral.reduce((s, p) => s + p.netFlow, 0);

  const topRiskCustomers = [...receivables]
    .filter((r) => r.riskLevel === 'C' || r.riskLevel === 'D' || r.status === 'overdue')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const topPressureSuppliers = [...payables]
    .filter((p) => p.paymentPressure >= 60 || p.status === 'overdue')
    .sort((a, b) => b.paymentPressure - a.paymentPressure)
    .slice(0, 5);

  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const redAlerts = alerts.filter((a) => a.level === 'red');
  const orangeAlerts = alerts.filter((a) => a.level === 'orange');

  const fmt = (n: number) => '¥' + (n / 10000).toFixed(1) + '万';
  const fmtPct = (n: number) => `${n}%`;

  const scenarioSummary = scenarios.length > 0
    ? scenarios.map((s, i) => {
        const worstGap = s.adjustedPredictions.reduce((mx, p) => Math.max(mx, p.gap), 0);
        return `  方案${i + 1}「${s.name}」：延迟${s.collectionDelayDays}天 / 提前采购${fmt(s.earlyPurchaseAmount)}，最大缺口${fmt(worstGap)}`;
      }).join('\n')
    : '  （暂无情景推演方案）';

  const versionSummary = predictionVersions.length > 0
    ? predictionVersions.map((v) => {
        const filled = v.actuals.length;
        const total = v.predictions.length;
        return `  - ${v.name}（${v.lockedAt}），已录入实际结果 ${filled}/${total} 个月`;
      }).join('\n')
    : '  （暂无锁定版本）';

  const inc = (key: string) => !data.includedChapters || data.includedChapters.includes(key);

  const lines: string[] = [
    '══════════════════════════════════════════════════════════════',
    '              CASHFLOW AI 企业现金流经营摘要',
    '══════════════════════════════════════════════════════════════',
    '',
    `生成时间：${data.generatedAt}`,
    filterDescription ? `数据口径：${filterDescription}` : '',
    alertFilter ? `当前筛选条件：${alertFilter}` : '',
    '',
    ...(inc('core') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '一、核心经营指标',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  当前可用资金：${fmt(currentBalance)}`,
      `  应收总额：    ${fmt(totalReceivable)}（共 ${receivables.length} 笔）`,
      `  应付总额：    ${fmt(totalPayable)}（共 ${payables.length} 笔）`,
      `  安全余额线：  ${fmt(safetyBalance.amount)}（设置于 ${safetyBalance.updatedAt}）`,
      `  未来6月净流： ${netFlow >= 0 ? '+' : ''}${fmt(netFlow)}`,
      '',
    ] : []),
    ...(inc('gap') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '二、未来资金缺口分析',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  缺口月份数：  ${gapMonths.length} / ${neutral.length} 个月`,
      `  累计缺口额：  ${fmt(totalGap)}`,
      '',
      ...neutral.map((p) => {
        const tag = p.gap > 0 ? ` ⚠️ 缺口${fmt(p.gap)}` : p.netFlow >= 0 ? ` ✅ 净流入${fmt(p.netFlow)}` : ` ⚠️ 净流出${fmt(-p.netFlow)}`;
        return `  ${p.month}：流入${fmt(p.inflow)}，流出${fmt(p.outflow)}${tag}`;
      }),
      '',
    ] : []),
    ...(inc('customer') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '三、客户回款 Top 风险',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      topRiskCustomers.length > 0
        ? topRiskCustomers.map((r, i) =>
            `  ${i + 1}. ${r.customerName}（风险${r.riskLevel}）`
            + `\n     金额：${fmt(r.amount)}，到期日：${r.dueDate}`
            + `\n     回款概率：${fmtPct(r.collectionProbability)}，状态：${r.status}`
            + (r.anomalyReason ? `\n     异常：${r.anomalyReason}` : '')
          ).join('\n\n')
        : '  （暂无高风险客户）',
      '',
    ] : []),
    ...(inc('supplier') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '四、供应商付款 Top 压力',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      topPressureSuppliers.length > 0
        ? topPressureSuppliers.map((p, i) =>
            `  ${i + 1}. ${p.supplierName}（压力指数${p.paymentPressure}%）`
            + `\n     金额：${fmt(p.amount)}，到期日：${p.dueDate}`
            + `\n     优先级：P${p.priority}，状态：${p.status}`
          ).join('\n\n')
        : '  （暂无高压供应商）',
      '',
    ] : []),
    ...(inc('alerts') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '五、预警汇总',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `  预警总数：    ${alerts.length} 条`,
      `  未读预警：    ${unreadAlerts.length} 条`,
      `  红色预警：    ${redAlerts.length} 条`,
      `  橙色预警：    ${orangeAlerts.length} 条`,
      '',
      ...alerts.slice(0, 8).map((a) => {
        const icon = a.level === 'red' ? '🔴' : a.level === 'orange' ? '🟠' : a.level === 'yellow' ? '🟡' : '🟢';
        const readTag = a.isRead ? '[已读]' : '[未读]';
        return `  ${icon} ${readTag} ${a.title}（${a.createdAt}）\n     ${a.description}` + (a.notes.length ? `\n     备注：${a.notes.join('；')}` : '');
      }),
      '',
    ] : []),
    ...(inc('scenario') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '六、情景推演结论',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      scenarioSummary,
      '',
      scenarios.length > 0 ? (() => {
        const baselineWorst = Math.max(...neutral.map((p) => p.gap), 0);
        const simWorst = Math.max(...scenarios.flatMap((s) => s.adjustedPredictions.map((p) => p.gap)), 0);
        return `  基准方案最大缺口：${fmt(baselineWorst)}\n  模拟方案最大缺口：${fmt(simWorst)}\n  风险变化：${simWorst > baselineWorst ? '↑ 恶化' + fmt(simWorst - baselineWorst) : simWorst < baselineWorst ? '↓ 改善' + fmt(baselineWorst - simWorst) : '→ 持平'}`;
      })() : '',
      '',
    ] : []),
    ...(inc('versions') ? [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '七、预测版本追踪',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      versionSummary,
      '',
    ] : []),
    '══════════════════════════════════════════════════════════════',
    '                    本报告由 CashFlow AI 自动生成',
    '══════════════════════════════════════════════════════════════',
  ];

  return lines.filter((l) => l !== undefined).join('\n');
}

export function downloadReport(filename: string, content: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
