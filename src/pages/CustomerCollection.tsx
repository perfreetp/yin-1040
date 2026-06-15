import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatAmountFull, getRiskColor, getRiskBg, getProbabilityColor, getProbabilityBg } from '@/data/mockData';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react';

const PIE_COLORS = ['#34d399', '#00b4d8', '#f59e0b', '#f87171'];
const RISK_LABELS: Record<string, string> = { A: '低风险', B: '中风险', C: '较高风险', D: '高风险' };

function getBorderClass(prob: number): string {
  if (prob >= 80) return 'border-l-emerald-400';
  if (prob >= 60) return 'border-l-ice-500';
  if (prob >= 40) return 'border-l-amber-500';
  return 'border-l-coral-500';
}

function statusLabel(s: string) {
  switch (s) {
    case 'pending': return '待回款';
    case 'partial': return '部分回款';
    case 'overdue': return '已逾期';
    default: return s;
  }
}

function statusStyle(s: string): string {
  switch (s) {
    case 'pending': return 'bg-ice-500/10 text-ice-500';
    case 'partial': return 'bg-amber-500/10 text-amber-500';
    case 'overdue': return 'bg-coral-500/10 text-coral-500';
    default: return 'bg-gray-500/10 text-gray-400';
  }
}

export default function CustomerCollection() {
  const receivables = useStore((s) => s.receivables);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const high = receivables.filter((r) => r.collectionProbability >= 80).length;
  const mid = receivables.filter((r) => r.collectionProbability >= 60 && r.collectionProbability < 80).length;
  const low = receivables.filter((r) => r.collectionProbability >= 40 && r.collectionProbability < 60).length;
  const vlow = receivables.filter((r) => r.collectionProbability < 40).length;

  const pieData = (['A', 'B', 'C', 'D'] as const).map((level, i) => ({
    name: `${level}级-${RISK_LABELS[level]}`,
    value: receivables.filter((r) => r.riskLevel === level).reduce((s, r) => s + r.amount, 0),
    color: PIE_COLORS[i],
  })).filter((d) => d.value > 0);

  const today = new Date('2026-06-15');
  const aging = receivables.reduce((acc, r) => {
    const due = new Date(r.dueDate);
    const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
    let bucket: string;
    if (diff <= 0) bucket = '未到期';
    else if (diff <= 30) bucket = '逾期1-30天';
    else if (diff <= 60) bucket = '逾期31-60天';
    else bucket = '逾期60天以上';
    acc[bucket] = (acc[bucket] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  const summaryCards = [
    { label: '高概率客户数', value: high, sub: '≥80%', icon: Shield, color: 'text-emerald-400' },
    { label: '中概率客户数', value: mid, sub: '60-80%', icon: TrendingUp, color: 'text-ice-500' },
    { label: '低概率客户数', value: low, sub: '40-60%', icon: Clock, color: 'text-amber-500' },
    { label: '极低概率客户数', value: vlow, sub: '<40%', icon: AlertTriangle, color: 'text-coral-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">客户回款预测</h1>
        <p className="mt-1 text-sm text-gray-400">AI预测各客户回款概率与风险评级</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{c.sub}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color} opacity-30`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-3 text-sm font-medium text-gray-300">回款风险分布</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatAmountFull(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 glass-card rounded-xl p-5">
          <h3 className="mb-3 text-sm font-medium text-gray-300">账龄分析</h3>
          <div className="space-y-3">
            {(['未到期', '逾期1-30天', '逾期31-60天', '逾期60天以上'] as const).map((bucket) => {
              const amount = aging[bucket] || 0;
              const total = Object.values(aging).reduce((s, v) => s + v, 0);
              const pct = total > 0 ? (amount / total) * 100 : 0;
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{bucket}</span>
                    <span className="font-mono text-gray-300">{formatAmountFull(amount)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-700">
                    <div className="h-full rounded-full bg-ice-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {receivables.map((r) => (
          <div key={r.id} className={`glass-card rounded-xl border-l-4 ${getBorderClass(r.collectionProbability)} p-4 transition-all`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-white">{r.customerName}</p>
                <p className="mt-1 font-mono text-sm text-gray-300">{formatAmountFull(r.amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusStyle(r.status)}`}>
                  {statusLabel(r.status)}
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getRiskBg(r.riskLevel)} ${getRiskColor(r.riskLevel)}`}>
                  {r.riskLevel}级
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>到期日：{r.dueDate}</span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">回款概率</span>
                <span className={`font-mono font-bold ${getProbabilityColor(r.collectionProbability)}`}>
                  {r.collectionProbability}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-700">
                <div
                  className={`h-full rounded-full transition-all ${getProbabilityBg(r.collectionProbability)}`}
                  style={{ width: `${r.collectionProbability}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => toggle(r.id)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-300"
            >
              {expanded.has(r.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded.has(r.id) ? '收起详情' : '展开详情'}
            </button>

            {expanded.has(r.id) && (
              <div className="mt-2 space-y-1 rounded-lg bg-navy-800/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">风险等级</span>
                  <span className={getRiskColor(r.riskLevel)}>{r.riskLevel}级 - {RISK_LABELS[r.riskLevel]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">异常标记</span>
                  <span className={r.isAnomaly ? 'text-coral-500' : 'text-emerald-400'}>
                    {r.isAnomaly ? '是' : '否'}
                  </span>
                </div>
                {r.isAnomaly && r.anomalyReason && (
                  <div className="flex items-start gap-1">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-coral-500" />
                    <span className="text-coral-400">{r.anomalyReason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
