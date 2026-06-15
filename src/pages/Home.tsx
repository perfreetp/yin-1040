import { useStore } from '@/store/useStore';
import { mockHistoricalCashFlow, formatAmount, getAlertLevelBorder } from '@/data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, TrendingUp, Database, FlaskConical, AlertTriangle, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

const statCards = [
  { key: 'balance', label: '当前可用资金', value: 12600000, trend: 8.2, icon: Wallet, color: 'text-ice-500', bg: 'bg-ice-500/15' },
  { key: 'receivable', label: '应收总额', value: 15610000, trend: 12.5, icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/15' },
  { key: 'payable', label: '应付总额', value: 15760000, trend: -6.3, icon: ArrowDownRight, color: 'text-coral-500', bg: 'bg-coral-500/15' },
  { key: 'netflow', label: '净现金流', value: -150000, trend: -15.4, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/15' },
];

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
  const { predictions, alerts, safetyBalance, receivables, payables, currentBalance } = useStore();
  const chartData = buildChartData(predictions, safetyBalance.amount);
  const recentAlerts = alerts.slice(0, 3);
  const neutralPredictions = predictions.filter((p) => p.scenario === 'neutral');
  const maxGap = Math.max(...neutralPredictions.map((p) => p.gap), 1);
  const nextGap = neutralPredictions[0];
  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">现金流总览</h1>
          <p className="text-gray-400 mt-1 text-sm">{today}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isUp = card.trend >= 0;
          return (
            <div key={card.key} className="glass-card rounded-xl p-4 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-gray-400 text-sm">{card.label}</span>
              </div>
              <p className="font-mono text-2xl font-bold text-white">
                ¥{formatAmount(card.value)}
              </p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${isUp ? 'text-emerald-400' : 'text-coral-500'}`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span>{isUp ? '+' : ''}{card.trend}% 环比</span>
              </div>
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
