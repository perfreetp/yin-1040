import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { formatAmountFull } from '@/data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Truck, AlertTriangle, Calendar, Clock, ArrowUp, Shield, Filter, ArrowUpDown } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待付款', color: 'bg-ice-500/20 text-ice-400' },
  partial: { label: '部分付款', color: 'bg-amber-500/20 text-amber-400' },
  paid: { label: '已付款', color: 'bg-emerald-400/20 text-emerald-400' },
  overdue: { label: '已逾期', color: 'bg-coral-500/20 text-coral-400' },
};
const PRESSURE_OPTIONS = ['全部', '高压(≥80)', '中压(50-79)', '低压(<50)'] as const;
const PAY_STATUS_OPTIONS = ['全部', '待付款', '已逾期'] as const;
const PAY_SORT_OPTIONS = ['优先级', '金额降序', '金额升序', '压力降序', '压力升序'] as const;
const PAY_STATUS_MAP: Record<string, string> = { '待付款': 'pending', '已逾期': 'overdue' };
const PILL = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors';
const PILL_ON = 'bg-ice-500 text-white';
const PILL_OFF = 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10';

function getPressureColor(p: number) {
  if (p >= 80) return '#FF4757';
  if (p >= 50) return '#FFB020';
  return '#00D4FF';
}

function getPressureBorder(p: number) {
  if (p >= 80) return 'border-l-coral-500';
  if (p >= 50) return 'border-l-amber-500';
  return 'border-l-ice-500';
}

function getPressureBarColor(p: number) {
  if (p >= 80) return 'bg-coral-500';
  if (p >= 50) return 'bg-amber-500';
  return 'bg-ice-500';
}

function getPressureTextColor(p: number) {
  if (p >= 80) return 'text-coral-400';
  if (p >= 50) return 'text-amber-400';
  return 'text-ice-400';
}

export default function SupplierPayment() {
  const payables = useStore((s) => s.payables);
  const [pressureFilter, setPressureFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [sortBy, setSortBy] = useState('优先级');

  const filtered = useMemo(() => {
    let data = [...payables];
    if (pressureFilter === '高压(≥80)') data = data.filter((p) => p.paymentPressure >= 80);
    else if (pressureFilter === '中压(50-79)') data = data.filter((p) => p.paymentPressure >= 50 && p.paymentPressure < 80);
    else if (pressureFilter === '低压(<50)') data = data.filter((p) => p.paymentPressure < 50);
    if (statusFilter !== '全部') data = data.filter((p) => p.status === PAY_STATUS_MAP[statusFilter]);
    if (amountMin) data = data.filter((p) => p.amount >= parseFloat(amountMin) * 10000);
    if (amountMax) data = data.filter((p) => p.amount <= parseFloat(amountMax) * 10000);
    switch (sortBy) {
      case '优先级': data.sort((a, b) => a.priority - b.priority); break;
      case '金额降序': data.sort((a, b) => b.amount - a.amount); break;
      case '金额升序': data.sort((a, b) => a.amount - b.amount); break;
      case '压力降序': data.sort((a, b) => b.paymentPressure - a.paymentPressure); break;
      case '压力升序': data.sort((a, b) => a.paymentPressure - b.paymentPressure); break;
    }
    return data;
  }, [payables, pressureFilter, statusFilter, amountMin, amountMax, sortBy]);

  const totalPayables = filtered.reduce((s, p) => s + p.amount, 0);
  const highPressure = filtered.filter((p) => p.paymentPressure >= 80).length;
  const thisMonth = filtered.filter((p) => {
    const d = new Date(p.dueDate);
    return d.getFullYear() === 2026 && d.getMonth() === 6;
  }).length;

  const chartData = filtered.map((p) => ({
    name: p.supplierName.length > 6 ? p.supplierName.slice(0, 6) + '…' : p.supplierName,
    fullName: p.supplierName,
    pressure: p.paymentPressure,
    amount: p.amount,
  }));

  const calendarDays = useMemo(() => {
    const days: { day: number; amount: number }[] = [];
    filtered.forEach((p) => {
      const d = new Date(p.dueDate);
      if (d.getFullYear() === 2026 && d.getMonth() === 6) {
        const existing = days.find((x) => x.day === d.getDate());
        if (existing) existing.amount += p.amount;
        else days.push({ day: d.getDate(), amount: p.amount });
      }
    });
    return days;
  }, [filtered]);

  const firstDayOffset = 3;
  const totalCells = firstDayOffset + 31;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) calendarCells.push(i < firstDayOffset ? null : i - firstDayOffset + 1);

  function getDotColor(day: number) {
    const item = calendarDays.find((d) => d.day === day);
    if (!item) return null;
    if (item.amount > 2000000) return 'bg-coral-500';
    if (item.amount > 500000) return 'bg-amber-500';
    return 'bg-ice-500';
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">供应商付款预测</h1>
        <p className="mt-1 text-sm text-gray-400">AI预测各供应商付款压力与优先级排序</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-coral-500/15 p-2.5"><Truck className="h-5 w-5 text-coral-500" /></div>
            <div>
              <p className="text-xs text-gray-400">应付总额</p>
              <p className="font-mono text-lg text-white">{formatAmountFull(totalPayables)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-coral-500/15 p-2.5"><AlertTriangle className="h-5 w-5 text-coral-400" /></div>
            <div>
              <p className="text-xs text-gray-400">高压供应商</p>
              <p className="font-mono text-lg text-coral-400">{highPressure}<span className="text-sm text-gray-400 ml-1">家</span></p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2.5"><Clock className="h-5 w-5 text-amber-500" /></div>
            <div>
              <p className="text-xs text-gray-400">本月到期</p>
              <p className="font-mono text-lg text-amber-400">{thisMonth}<span className="text-sm text-gray-400 ml-1">笔</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">付款压力</span>
          {PRESSURE_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setPressureFilter(opt)} className={`${PILL} ${pressureFilter === opt ? PILL_ON : PILL_OFF}`}>{opt}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">状态</span>
          {PAY_STATUS_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setStatusFilter(opt)} className={`${PILL} ${statusFilter === opt ? PILL_ON : PILL_OFF}`}>{opt}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">金额范围</span>
          <input type="number" placeholder="min万" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-16 bg-white/5 rounded px-2 py-1 text-xs font-mono text-white outline-none border border-white/10" />
          <span className="text-xs text-gray-500">—</span>
          <input type="number" placeholder="max万" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-16 bg-white/5 rounded px-2 py-1 text-xs font-mono text-white outline-none border border-white/10" />
          <button className="px-3 py-1 rounded-lg text-xs font-medium bg-ice-500/20 text-ice-400 hover:bg-ice-500/30 border border-ice-500/30">筛选</button>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-400">排序</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none border border-white/10">
            {PAY_SORT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-300">付款压力指数</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={75} />
            <Tooltip
              formatter={(v: number, _n: string, props: any) => [`压力指数: ${v}`, props.payload.fullName]}
              contentStyle={{ background: '#0F2647', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="pressure" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((d, i) => <Cell key={i} fill={getPressureColor(d.pressure)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300">供应商付款优先级</h3>
        {filtered.map((p) => {
          const st = statusMap[p.status] || statusMap.pending;
          const isOverdue = p.status === 'overdue';
          return (
            <div key={p.id} className={`glass-card rounded-xl border-l-4 ${getPressureBorder(p.paymentPressure)} p-4 transition-all ${isOverdue ? 'bg-coral-500/5' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">{p.supplierName}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-navy-700 px-2 py-0.5 text-xs font-medium text-gray-300">
                      <ArrowUp className="h-3 w-3" /> P{p.priority}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xl text-white">{formatAmountFull(p.amount)}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>到期日: {p.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className={`h-4 w-4 ${getPressureTextColor(p.paymentPressure)}`} />
                  <span className={`text-sm font-medium ${getPressureTextColor(p.paymentPressure)}`}>{p.paymentPressure}%</span>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-700">
                <div className={`h-full rounded-full transition-all ${getPressureBarColor(p.paymentPressure)}`} style={{ width: `${p.paymentPressure}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-300">付款日历 — 2026年7月</h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const dot = getDotColor(day);
            return (
              <div key={day} className="flex flex-col items-center rounded-lg py-1.5 text-xs text-gray-300 hover:bg-navy-700/50">
                <span>{day}</span>
                {dot && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${dot}`} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
