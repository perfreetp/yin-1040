import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { mockHistoricalCashFlow, formatAmount, getAlertLevelBorder } from '@/data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Database, FlaskConical, AlertTriangle, Bell, RefreshCw, Pencil, Check, X, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

function buildChartData(predictions: import('@/types').CashFlowPrediction[], safetyAmount: number) {
  const predicted = predictions
    .filter((p) => p.scenario === 'neutral')
    .map((p) => ({ ...p, predicted: true }));
  return [
    ...mockHistoricalCashFlow.map((d) => ({ ...d, predicted: false })),
    ...predicted.map((d) => ({
      month: d.month,
      inflow: d.inflow,
      outflow: d.outflow,
      netFlow: d.netFlow,
      predicted: true,
    })),
  ];
}

function formatMonth(m: string) {
  return m.slice(5) + '月';
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-sm">
      <p className="text-gray-400 mb-1">{label}{item.predicted ? ' (预测)' : ''}</p>
      <p className="font-mono text-ice-400">净现金流: ¥{formatAmount(item.netFlow)}</p>
    </div>
  );
}

export default function Home() {
  const { predictions, alerts, safetyBalance, receivables, payables, currentBalance, setCurrentBalance, regeneratePredictions, activeFilter, clearActiveFilter } = useStore();
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(currentBalance));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useFilteredScope, setUseFilteredScope] = useState(false);

  function applyReceivableFilter(list: import('@/types').Receivable[], filter: import('@/types').FilterScope): import('@/types').Receivable[] {
    let data = [...list];
    if (filter.riskLevel && filter.riskLevel !== 'all') {
      data = data.filter((r) => r.riskLevel === filter.riskLevel);
    }
    if (filter.customerStatus && filter.customerStatus !== 'all') {
      data = data.filter((r) => r.status === filter.customerStatus);
    }
    if (filter.receivableAmountMin) {
      data = data.filter((r) => r.amount >= filter.receivableAmountMin!);
    }
    if (filter.receivableAmountMax) {
      data = data.filter((r) => r.amount <= filter.receivableAmountMax!);
    }
    return data;
  }

  function applyPayableFilter(list: import('@/types').Payable[], filter: import('@/types').FilterScope): import('@/types').Payable[] {
    let data = [...list];
    if (filter.pressureLevel && filter.pressureLevel !== 'all') {
      if (filter.pressureLevel === 'high') data = data.filter((p) => p.paymentPressure >= 80);
      else if (filter.pressureLevel === 'medium') data = data.filter((p) => p.paymentPressure >= 50 && p.paymentPressure < 80);
      else if (filter.pressureLevel === 'low') data = data.filter((p) => p.paymentPressure < 50);
    }
    if (filter.supplierStatus && filter.supplierStatus !== 'all') {
      data = data.filter((p) => p.status === filter.supplierStatus);
    }
    if (filter.payableAmountMin) {
      data = data.filter((p) => p.amount >= filter.payableAmountMin!);
    }
    if (filter.payableAmountMax) {
      data = data.filter((p) => p.amount <= filter.payableAmountMax!);
    }
    return data;
  }

  const chartData = buildChartData(predictions, safetyBalance.amount);
  const recentAlerts = alerts.slice(0, 3);
  const neutralPredictions = predictions.filter((p) => p.scenario === 'neutral');
  const maxGap = Math.max(...neutralPredictions.map((p) => p.gap), 1);
  const nextGap = neutralPredictions[0];
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  let workingReceivables = receivables;
  let workingPayables = payables;

  if (activeFilter && useFilteredScope) {
    if (activeFilter.scope === 'customer') {
      workingReceivables = applyReceivableFilter(receivables, activeFilter);
    } else if (activeFilter.scope === 'supplier') {
      workingPayables = applyPayableFilter(payables, activeFilter);
    }
  }

  const receivablesTotal = workingReceivables.filter((r) => r.status !== 'received').reduce((sum, r) => sum + r.amount, 0);
  const payablesTotal = workingPayables.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
  const netCashFlow = currentBalance + receivablesTotal - payablesTotal;

  const handleSaveBalance = () => {
    const val = parseFloat(balanceInput);
    if (!isNaN(val) && val >= 0) {
      setCurrentBalance(val);
      setIsEditingBalance(false);
    }
  };

  const handleStartEdit = () => {
    setBalanceInput(String(currentBalance));
    setIsEditingBalance(true);
  };

  const handleRegenerate = () => {
    setIsRefreshing(true);
    regeneratePredictions();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const statCards = [
    { key: 'balance', label: '当前可用资金', value: currentBalance, icon: Wallet, color: 'text-ice-500', bg: 'bg-ice-500/15', editable: true },
    { key: 'receivable', label: '应收总额', value: receivablesTotal, icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/15', editable: false },
    { key: 'payable', label: '应付总额', value: payablesTotal, icon: ArrowDownRight, color: 'text-coral-500', bg: 'bg-coral-500/15', editable: false },
    { key: 'netflow', label: '净现金流', value: netCashFlow, icon: TrendingUp, color: netCashFlow >= 0 ? 'text-emerald-400' : 'text-amber-500', bg: netCashFlow >= 0 ? 'bg-emerald-400/15' : 'bg-amber-500/15', editable: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">现金流总览</h1>
          <p className="text-gray-400 mt-1 text-sm">{today}</p>
        </div>
        <button
          onClick={handleRegenerate}
          className="glass-card rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-ice-400 hover:text-ice-300 hover:bg-navy-800/60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          重新生成预测
        </button>
      </div>

      {activeFilter && (
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <Search className="h-5 w-5 text-ice-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              当前数据口径：{activeFilter.label}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>应用时间：{activeFilter.appliedAt}</span>
              <span>
                应用范围：
                {activeFilter.scope === 'customer' ? '应收账款' : activeFilter.scope === 'supplier' ? '应付账款' : '全部'}
              </span>
            </div>
          </div>
          <button
            onClick={clearActiveFilter}
            className="shrink-0 p-2 rounded-lg bg-navy-700/50 hover:bg-navy-700 text-gray-400 hover:text-coral-400 transition-colors"
            title="清空筛选"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeFilter && (
        <div className="flex items-center justify-center">
          <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setUseFilteredScope(false)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                !useFilteredScope
                  ? 'bg-ice-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              全量口径
            </button>
            <button
              onClick={() => setUseFilteredScope(true)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                useFilteredScope
                  ? 'bg-ice-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              筛选口径
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isBalance = card.key === 'balance';
          return (
            <div key={card.key} className="glass-card rounded-xl p-4 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{card.label}</span>
                  {isBalance && !isEditingBalance && (
                    <button
                      onClick={handleStartEdit}
                      className="text-gray-500 hover:text-ice-400 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {isBalance && isEditingBalance ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xl text-white">¥</span>
                  <input
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    className="flex-1 bg-navy-800/60 border border-navy-600 rounded px-2 py-1 font-mono text-xl font-bold text-white focus:outline-none focus:border-ice-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveBalance}
                    className="p-1.5 rounded bg-ice-500/20 text-ice-400 hover:bg-ice-500/30 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="font-mono text-2xl font-bold text-white">
                  ¥{formatAmount(card.value)}
                </p>
              )}
              {!isEditingBalance && (
                <div className={`mt-2 text-xs text-gray-500`}>
                  {isBalance && <span>点击铅笔图标编辑当前余额</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">现金流趋势</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tickFormatter={formatMonth} stroke="#4A6A8A" tick={{ fill: '#7A9AB5', fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => formatAmount(v)} stroke="#4A6A8A" tick={{ fill: '#7A9AB5', fontSize: 11 }} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
              <ReferenceLine y={safetyBalance.amount} stroke="#FFB020" strokeDasharray="6 4" label={{ value: '安全线', fill: '#FFB020', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="netFlow"
                stroke="#00D4FF"
                strokeWidth={2}
                fill="url(#netFlowGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">资金缺口预测</h2>
          {nextGap ? (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{nextGap.month} 预计缺口</span>
                <span className="font-mono text-coral-500">¥{formatAmount(nextGap.gap)}</span>
              </div>
              <div className="w-full h-3 bg-navy-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-coral-500 to-amber-500 transition-all"
                  style={{ width: `${Math.min((nextGap.gap / maxGap) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0</span>
                <span>安全余额线 ¥{formatAmount(safetyBalance.amount)}</span>
              </div>
            </div>
          ) : (
            <p className="text-emerald-400 text-sm">暂无资金缺口</p>
          )}
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">最新预警</h2>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 ${getAlertLevelBorder(alert.level)} bg-navy-800/50 rounded-r-lg px-3 py-2.5`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-white">{alert.title}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{alert.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          to="/data-import"
          className="glass-card rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-ice-400 hover:text-ice-300 transition-colors"
        >
          <Database className="w-4 h-4" /> 导入数据
        </Link>
        <Link
          to="/prediction"
          className="glass-card rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-ice-400 hover:text-ice-300 transition-colors"
        >
          <TrendingUp className="w-4 h-4" /> 查看预测
        </Link>
        <Link
          to="/scenario"
          className="glass-card rounded-xl px-5 py-3 flex items-center gap-2 text-sm text-ice-400 hover:text-ice-300 transition-colors"
        >
          <FlaskConical className="w-4 h-4" /> 情景推演
        </Link>
      </div>
    </div>
  );
}
