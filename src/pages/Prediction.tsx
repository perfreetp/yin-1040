import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, Shield, Lock, Clock, AlertTriangle, Save,
  ChevronRight, RefreshCw, X, Edit3, GitCompare, ArrowLeftRight, Download,
  Sparkles, Users, Truck, CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatAmount, formatAmountFull } from '@/data/mockData';
import type { ActualResult, PredictionVersion, RiskLevel } from '@/types';

type Scenario = 'optimistic' | 'neutral' | 'pessimistic';
const scenarioLabels: Record<Scenario, string> = { optimistic: '乐观', neutral: '中性', pessimistic: '悲观' };
const TT_STYLE = { contentStyle: { background: 'rgba(10,30,60,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }, labelStyle: { color: '#fff' } };
const CARD = 'glass-card rounded-2xl';
const BTN_ROW = 'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all';
const ROW = 'flex justify-between text-xs';
const riskColor: Record<RiskLevel, string> = {
  A: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-ice-500/20 text-ice-400',
  C: 'bg-yellow-500/20 text-yellow-400',
  D: 'bg-coral-500/20 text-coral-500',
};

function formatMonth(m: string) { return `${parseInt(m.split('-')[1], 10)}月`; }
function calcDeviationRate(p: number, a: number) { return p === 0 ? 0 : ((a - p) / Math.abs(p)) * 100; }
function diffColor(d: number | null, r = false) {
  if (d === null) return 'text-gray-500';
  const g = r ? d < 0 : d > 0, b = r ? d > 0 : d < 0;
  return g ? 'text-emerald-400' : b ? 'text-coral-500' : 'text-gray-400';
}
function diffText(d: number | null) { return d === null ? '-' : `${d > 0 ? '+' : ''}${formatAmount(d)}`; }
function netColor(v: number | null) { return v === null ? 'text-gray-500' : v >= 0 ? 'text-ice-400' : 'text-coral-500'; }
function pressureColor(p: number) { return p >= 80 ? 'bg-coral-500' : p >= 50 ? 'bg-yellow-500' : 'bg-emerald-500'; }

export default function Prediction() {
  const {
    predictions, safetyBalance, predictionVersions, receivables, payables,
    setSafetyBalance, lockPredictionVersion, setActualForVersion, regeneratePredictions,
  } = useStore();

  const [scenario, setScenario] = useState<Scenario>('neutral');
  const [safetyInput, setSafetyInput] = useState(String(safetyBalance.amount / 10000));
  const [versionName, setVersionName] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<PredictionVersion | null>(null);
  const [editingActuals, setEditingActuals] = useState<Record<string, { inflow: string; outflow: string }>>({});
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => { setSafetyInput(String(safetyBalance.amount / 10000)); }, [safetyBalance.amount]);

  useEffect(() => {
    if (!selectedVersion) return;
    const latest = predictionVersions.find((v) => v.id === selectedVersion.id);
    if (!latest) return;
    setSelectedVersion(latest);
    const init: Record<string, { inflow: string; outflow: string }> = {};
    latest.predictions.forEach((p) => {
      const a = latest.actuals.find((x) => x.month === p.month);
      init[p.month] = { inflow: a ? String(a.inflow / 10000) : '', outflow: a ? String(a.outflow / 10000) : '' };
    });
    setEditingActuals(init);
  }, [selectedVersion?.id, predictionVersions]);

  const chartData = useMemo(() => predictions
    .filter((p) => p.scenario === scenario)
    .map((p) => ({ ...p, label: formatMonth(p.month), isGap: p.netFlow < 0 })),
    [predictions, scenario]);

  const gapMonths = useMemo(() => chartData.filter((d) => d.isGap), [chartData]);

  const modalChartData = useMemo(() => {
    if (!selectedVersion) return [];
    return selectedVersion.predictions.map((p) => ({
      label: formatMonth(p.month),
      预测净流: p.netFlow,
      实际净流: selectedVersion.actuals.find((a) => a.month === p.month)?.netFlow ?? 0,
    }));
  }, [selectedVersion]);

  const compareData = useMemo(() => {
    if (!compareA || !compareB) return [];
    const vA = predictionVersions.find((v) => v.id === compareA);
    const vB = predictionVersions.find((v) => v.id === compareB);
    if (!vA || !vB) return [];
    const months = Array.from(new Set([...vA.predictions.map((p) => p.month), ...vB.predictions.map((p) => p.month)])).sort();
    return months.map((m) => {
      const pA = vA.predictions.find((p) => p.month === m), pB = vB.predictions.find((p) => p.month === m);
      return { month: m, label: formatMonth(m), inflowA: pA?.inflow ?? null, inflowB: pB?.inflow ?? null, outflowA: pA?.outflow ?? null, outflowB: pB?.outflow ?? null, netA: pA?.netFlow ?? null, netB: pB?.netFlow ?? null };
    });
  }, [compareA, compareB, predictionVersions]);

  const compareChartData = useMemo(() => compareData.map((d) => ({ label: d.label, A净流: d.netA ?? 0, B净流: d.netB ?? 0 })), [compareData]);

  const monthDetail = useMemo(() => {
    if (!selectedMonth) return null;
    const [y, m] = selectedMonth.split('-').map(Number);
    const ms = new Date(y, m - 1, 1), me = new Date(y, m, 0);
    const inRange = (d: string) => { const dt = new Date(d); return dt >= ms && dt <= me; };
    const mR = receivables.filter((r) => r.status !== 'received' && inRange(r.dueDate)).sort((a, b) => b.amount - a.amount);
    const topC = mR.slice(0, 5).map((r) => ({ ...r, expectedContribution: Math.round(r.amount * (r.collectionProbability / 100)) }));
    const totalEI = topC.reduce((s, r) => s + r.expectedContribution, 0);
    const mP = payables.filter((p) => p.status !== 'paid' && inRange(p.dueDate)).sort((a, b) => b.paymentPressure - a.paymentPressure || b.amount - a.amount);
    const topS = mP.slice(0, 5);
    const totalEO = topS.reduce((s, p) => s + p.amount, 0);
    const anomalies = mR.filter((r) => r.isAnomaly);
    const pred = predictions.find((p) => p.month === selectedMonth && p.scenario === scenario);
    return { topC, totalEI, topS, totalEO, anomalies, pred, bars: [{ name: '预测流入', value: pred?.inflow ?? 0, fill: '#00D4FF' }, { name: '预测流出', value: pred?.outflow ?? 0, fill: '#FF8A80' }] };
  }, [selectedMonth, receivables, payables, predictions, scenario]);

  const handleSaveSafety = () => {
    const v = parseFloat(safetyInput);
    if (!isNaN(v) && v > 0) setSafetyBalance(v * 10000);
  };
  const handleLockVersion = () => { if (versionName.trim()) { lockPredictionVersion(versionName.trim()); setVersionName(''); } };
  const handleActualChange = (month: string, field: 'inflow' | 'outflow', value: string) => {
    setEditingActuals((p) => ({ ...p, [month]: { ...p[month], [field]: value } }));
    const cur = editingActuals[month] || { inflow: '', outflow: '' };
    const nv = parseFloat(value);
    if (isNaN(nv) || !selectedVersion) return;
    const iv = field === 'inflow' ? nv * 10000 : parseFloat(cur.inflow || '0') * 10000;
    const ov = field === 'outflow' ? nv * 10000 : parseFloat(cur.outflow || '0') * 10000;
    setActualForVersion(selectedVersion.id, { month, inflow: iv, outflow: ov, netFlow: iv - ov });
  };
  const openVersionModal = (v: PredictionVersion) => {
    setSelectedVersion(v);
    const init: Record<string, { inflow: string; outflow: string }> = {};
    v.predictions.forEach((p) => {
      const a = v.actuals.find((x) => x.month === p.month);
      init[p.month] = { inflow: a ? String(a.inflow / 10000) : '', outflow: a ? String(a.outflow / 10000) : '' };
    });
    setEditingActuals(init);
  };
  const closeModal = () => { setSelectedVersion(null); setEditingActuals({}); };
  const handleExportCompare = () => {
    if (compareData.length === 0) return;
    const vA = predictionVersions.find((v) => v.id === compareA), vB = predictionVersions.find((v) => v.id === compareB);
    const fmt = (v: number | null) => v !== null ? formatAmountFull(v) : '-';
    const lines = [`版本对比: ${vA?.name} vs ${vB?.name}`, '', '月份\tA流入\tB流入\t流入差异\tA流出\tB流出\t流出差异\tA净流\tB净流\t净流差异'];
    compareData.forEach((d) => {
      const iD = d.inflowA !== null && d.inflowB !== null ? d.inflowB - d.inflowA : null;
      const oD = d.outflowA !== null && d.outflowB !== null ? d.outflowB - d.outflowA : null;
      const nD = d.netA !== null && d.netB !== null ? d.netB - d.netA : null;
      lines.push([d.label, fmt(d.inflowA), fmt(d.inflowB), fmt(iD), fmt(d.outflowA), fmt(d.outflowB), fmt(oD), fmt(d.netA), fmt(d.netB), fmt(nD)].join('\t'));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `版本对比_${vA?.name}_${vB?.name}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="w-6 h-6 text-ice-500" />现金流预测</h1>
        <p className="text-gray-400 mt-1 text-sm">AI驱动的月度现金流预测与资金缺口分析</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 p-1 glass-card rounded-xl w-fit">
          {(Object.keys(scenarioLabels) as Scenario[]).map((k) => (
            <button key={k} onClick={() => setScenario(k)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${scenario === k ? 'bg-ice-500 text-white shadow-lg shadow-ice-500/30' : 'text-gray-400 hover:text-white'}`}>
              {scenarioLabels[k]}
            </button>
          ))}
        </div>
        <button onClick={() => regeneratePredictions()} className="px-4 py-2 glass-card rounded-xl text-sm font-medium text-ice-400 hover:text-white hover:bg-ice-500/20 flex items-center gap-1.5 transition-all">
          <RefreshCw className="w-4 h-4" />重新生成预测
        </button>
      </div>

      <div className={`${CARD} p-6`}>
        <h2 className="text-lg font-semibold text-white mb-4">月度现金流预测</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 13 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v: number) => formatAmount(v)} />
            <Tooltip {...TT_STYLE} formatter={(value: number, name: string) => [formatAmountFull(value), name === 'inflow' ? '流入' : '流出']} />
            <Legend formatter={(v: string) => (v === 'inflow' ? '流入' : '流出')} />
            <ReferenceLine y={safetyBalance.amount} stroke="#00D4FF" strokeDasharray="8 4" strokeWidth={2} label={{ value: `安全余额 ${formatAmount(safetyBalance.amount)}`, fill: '#00D4FF', fontSize: 12, position: 'right' }} />
            <Bar dataKey="inflow" name="inflow" radius={[4, 4, 0, 0]}>{chartData.map((e) => <Cell key={e.id} fill={e.isGap ? 'rgba(0,212,255,0.5)' : '#00D4FF'} />)}</Bar>
            <Bar dataKey="outflow" name="outflow" radius={[4, 4, 0, 0]}>{chartData.map((e) => <Cell key={e.id} fill={e.isGap ? '#FF6B6B' : '#FF8A80'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
        {gapMonths.length > 0 && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <h3 className="text-sm font-medium text-coral-500 flex items-center gap-1.5 mb-3"><AlertTriangle className="w-4 h-4" />资金缺口月份</h3>
            <div className="flex flex-wrap gap-3">{gapMonths.map((m) => (
              <div key={m.id} className="flex items-center gap-2 bg-coral-500/10 border border-coral-500/30 rounded-lg px-4 py-2">
                <span className="text-white text-sm font-medium">{m.label}</span>
                <span className="text-coral-500 font-mono text-sm">-{formatAmount(m.gap)}</span>
              </div>
            ))}</div>
          </div>
        )}
      </div>

      <div className={`${CARD} p-5`}>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-ice-500" />月度滚动预测明细</h3>
        <div className="flex flex-wrap gap-2">{chartData.map((m) => (
          <button key={m.month} onClick={() => setSelectedMonth(m.month)} className={`${BTN_ROW} ${m.isGap ? 'bg-coral-500/10 text-coral-400 hover:bg-coral-500/20 border border-coral-500/30' : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10'}`}>
            {formatMonth(m.month)}{m.isGap && <AlertTriangle className="w-3 h-3" />}
          </button>
        ))}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-ice-500" />安全余额设置</h2>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm whitespace-nowrap">设置安全余额</label>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-3 py-2 flex-1">
              <span className="text-gray-400 text-sm">¥</span>
              <input type="number" value={safetyInput} onChange={(e) => setSafetyInput(e.target.value)} className="bg-transparent text-white font-mono text-sm w-full outline-none" />
              <span className="text-gray-400 text-sm">万</span>
            </div>
            <button onClick={handleSaveSafety} className="px-4 py-2 bg-ice-500 hover:bg-ice-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors">
              <Save className="w-4 h-4" />保存
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">当前安全余额：¥{formatAmount(safetyBalance.amount)}（更新于{safetyBalance.updatedAt}）</p>
        </div>
        <div className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-ice-500" />版本锁定</h2>
          <div className="flex items-center gap-3">
            <input type="text" value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="输入版本名称" className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-ice-500/50 transition-colors" />
            <button onClick={handleLockVersion} className="px-4 py-2 bg-ice-500 hover:bg-ice-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Lock className="w-4 h-4" />锁定当前版本
            </button>
          </div>
        </div>
      </div>

      {predictionVersions.length > 0 && (
        <div className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-ice-500" />已锁定版本</h2>
          <div className="space-y-3">{predictionVersions.map((v) => (
            <div key={v.id} onClick={() => openVersionModal(v)} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-ice-500" />
                <span className="text-white text-sm font-medium">{v.name}</span>
                <span className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{v.lockedAt}</span>
                {v.actuals.length > 0 && <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">已录入 {v.actuals.length}/{v.predictions.length}</span>}
              </div>
              <button className="text-ice-500 hover:text-ice-400 text-sm flex items-center gap-1 transition-colors">查看详情<ChevronRight className="w-3 h-3" /></button>
            </div>
          ))}</div>
        </div>
      )}

      {predictionVersions.length > 0 && (
        <div className={`${CARD} p-6`}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><GitCompare className="w-5 h-5 text-ice-500" />版本对比</h2>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {(['A', 'B'] as const).map((s) => {
              const val = s === 'A' ? compareA : compareB, set = s === 'A' ? setCompareA : setCompareB;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">版本 {s}</span>
                  <select value={val} onChange={(e) => set(e.target.value)} className="bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-ice-500/50">
                    <option value="">选择版本</option>
                    {predictionVersions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              );
            })}
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
            {compareData.length > 0 && (
              <button onClick={handleExportCompare} className="px-4 py-2 bg-ice-500/20 hover:bg-ice-500/30 text-ice-400 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ml-auto">
                <Download className="w-4 h-4" />导出对比结果
              </button>
            )}
          </div>
          {compareData.length > 0 && (
            <>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10">
                    {['月份', 'A流入', 'B流入', '流入差异', 'A流出', 'B流出', '流出差异', 'A净流', 'B净流', '净流差异'].map((h, i) => (
                      <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} py-3 px-2 text-gray-400 font-medium`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{compareData.map((d) => {
                    const iD = d.inflowA !== null && d.inflowB !== null ? d.inflowB - d.inflowA : null;
                    const oD = d.outflowA !== null && d.outflowB !== null ? d.outflowB - d.outflowA : null;
                    const nD = d.netA !== null && d.netB !== null ? d.netB - d.netA : null;
                    return (
                      <tr key={d.month} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-2 text-white font-medium">{d.label}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{d.inflowA !== null ? formatAmount(d.inflowA) : '-'}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{d.inflowB !== null ? formatAmount(d.inflowB) : '-'}</td>
                        <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(iD)}`}>{diffText(iD)}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{d.outflowA !== null ? formatAmount(d.outflowA) : '-'}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{d.outflowB !== null ? formatAmount(d.outflowB) : '-'}</td>
                        <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(oD, true)}`}>{diffText(oD)}</td>
                        <td className={`py-3 px-2 text-right font-mono ${netColor(d.netA)}`}>{d.netA !== null ? formatAmount(d.netA) : '-'}</td>
                        <td className={`py-3 px-2 text-right font-mono ${netColor(d.netB)}`}>{d.netB !== null ? formatAmount(d.netB) : '-'}</td>
                        <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(nD)}`}>{diffText(nD)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div className={`${CARD} rounded-xl p-4`}>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><ArrowLeftRight className="w-4 h-4 text-ice-500" />净流对比</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={compareChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatAmount(v)} />
                    <Tooltip {...TT_STYLE} formatter={(v: number) => [formatAmountFull(v), '']} />
                    <Legend /><ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <Bar dataKey="A净流" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="B净流" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {selectedVersion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className={`${CARD} p-6 max-w-4xl w-full max-h-[85vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-ice-500" />{selectedVersion.name}</h2>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />锁定时间：{selectedVersion.lockedAt}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10">
                  {['月份', '预测流入', '实际流入', '预测流出', '实际流出', '预测净流', '实际净流', '偏差率'].map((h, i) => (
                    <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} py-3 px-2 text-gray-400 font-medium`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{selectedVersion.predictions.map((p) => {
                  const actual = selectedVersion.actuals.find((a) => a.month === p.month);
                  const ai = actual?.inflow ?? 0, ao = actual?.outflow ?? 0, an = ai - ao;
                  const dr = actual ? calcDeviationRate(p.netFlow, an) : 0, ok = actual && Math.abs(dr) <= 10;
                  const ev = editingActuals[p.month] || { inflow: '', outflow: '' };
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-2 text-white font-medium">{formatMonth(p.month)}</td>
                      <td className="py-3 px-2 text-right font-mono text-gray-300">{formatAmount(p.inflow)}</td>
                      <td className="py-3 px-2 text-right"><div className="flex items-center justify-end gap-1"><span className="text-gray-400 text-xs">¥</span><input type="number" value={ev.inflow} onChange={(e) => handleActualChange(p.month, 'inflow', e.target.value)} className="w-20 bg-white/5 rounded px-2 py-1 text-white font-mono text-xs text-right outline-none border border-white/10 focus:border-ice-500/50" placeholder="0" /><span className="text-gray-400 text-xs">万</span></div></td>
                      <td className="py-3 px-2 text-right font-mono text-gray-300">{formatAmount(p.outflow)}</td>
                      <td className="py-3 px-2 text-right"><div className="flex items-center justify-end gap-1"><span className="text-gray-400 text-xs">¥</span><input type="number" value={ev.outflow} onChange={(e) => handleActualChange(p.month, 'outflow', e.target.value)} className="w-20 bg-white/5 rounded px-2 py-1 text-white font-mono text-xs text-right outline-none border border-white/10 focus:border-ice-500/50" placeholder="0" /><span className="text-gray-400 text-xs">万</span></div></td>
                      <td className={`py-3 px-2 text-right font-mono ${p.netFlow >= 0 ? 'text-ice-400' : 'text-coral-500'}`}>{formatAmount(p.netFlow)}</td>
                      <td className={`py-3 px-2 text-right font-mono ${actual ? (an >= 0 ? 'text-ice-400' : 'text-coral-500') : 'text-gray-500'}`}>{actual ? formatAmount(an) : '-'}</td>
                      <td className={`py-3 px-2 text-right font-mono font-medium ${actual ? (ok ? 'text-emerald-400' : 'text-coral-500') : 'text-gray-500'}`}>{actual ? `${dr >= 0 ? '+' : ''}${dr.toFixed(1)}%` : '-'}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div className={`${CARD} rounded-xl p-4`}>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-ice-500" />预测净流 vs 实际净流</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={modalChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatAmount(v)} />
                  <Tooltip {...TT_STYLE} formatter={(v: number) => [formatAmountFull(v), '']} />
                  <Legend /><ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Bar dataKey="预测净流" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="实际净流" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeModal} className="px-5 py-2 glass-card rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">关闭</button>
            </div>
          </div>
        </div>
      )}

      {selectedMonth && monthDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMonth(null)}>
          <div className={`${CARD} p-6 max-w-6xl w-full max-h-[90vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-ice-500" />{formatMonth(selectedMonth)} 预测明细</h2>
                <p className="text-gray-400 text-sm mt-1">场景：{scenarioLabels[scenario]} · 预测净流 <span className={monthDetail.pred && monthDetail.pred.netFlow >= 0 ? 'text-ice-400' : 'text-coral-500'}>{monthDetail.pred ? formatAmount(monthDetail.pred.netFlow) : '-'}</span></p>
              </div>
              <button onClick={() => setSelectedMonth(null)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className={`${CARD} rounded-xl p-4 mb-5`}>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-ice-500" />本月现金流对比</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthDetail.bars} layout="vertical" barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatAmount(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#fff', fontSize: 12 }} width={70} />
                  <Tooltip {...TT_STYLE} formatter={(v: number) => [formatAmountFull(v), '']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>{monthDetail.bars.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <div className={`${CARD} rounded-xl p-4`}>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Users className="w-4 h-4 text-ice-500" />流入构成 · Top 5</h3>
                <div className="space-y-2 mb-3">
                  {monthDetail.topC.length === 0 ? <p className="text-gray-500 text-xs py-4 text-center">本月无预期回款</p> : monthDetail.topC.map((r) => (
                    <div key={r.id} className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex justify-between items-center mb-1"><span className="text-white text-xs font-medium truncate max-w-[120px]" title={r.customerName}>{r.customerName}</span><span className={`text-xs font-mono px-1.5 py-0.5 rounded ${riskColor[r.riskLevel]}`}>{r.riskLevel}</span></div>
                      <div className={ROW}><span className="text-gray-400">金额</span><span className="text-gray-300 font-mono">{formatAmount(r.amount)}</span></div>
                      <div className={ROW}><span className="text-gray-400">回款概率</span><span className="text-ice-400 font-mono">{r.collectionProbability}%</span></div>
                      <div className={ROW}><span className="text-gray-400">预期贡献</span><span className="text-emerald-400 font-mono font-medium">{formatAmount(r.expectedContribution)}</span></div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-2 text-xs space-y-1">
                  <div className={ROW}><span className="text-gray-400">Top 5 预期合计</span><span className="text-emerald-400 font-mono font-medium">{formatAmount(monthDetail.totalEI)}</span></div>
                  <div className={ROW}><span className="text-gray-400">预测流入</span><span className="text-ice-400 font-mono">{monthDetail.pred ? formatAmount(monthDetail.pred.inflow) : '-'}</span></div>
                </div>
              </div>
              <div className={`${CARD} rounded-xl p-4`}>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Truck className="w-4 h-4 text-coral-400" />流出构成 · Top 5</h3>
                <div className="space-y-2 mb-3">
                  {monthDetail.topS.length === 0 ? <p className="text-gray-500 text-xs py-4 text-center">本月无预期付款</p> : monthDetail.topS.map((p) => (
                    <div key={p.id} className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="flex justify-between items-center mb-1"><span className="text-white text-xs font-medium truncate max-w-[120px]" title={p.supplierName}>{p.supplierName}</span><span className="text-gray-500 text-xs">#{p.priority}</span></div>
                      <div className={ROW}><span className="text-gray-400">金额</span><span className="text-gray-300 font-mono">{formatAmount(p.amount)}</span></div>
                      <div className="flex justify-between text-xs items-center gap-2"><span className="text-gray-400 shrink-0">付款压力</span><div className="flex-1 flex items-center gap-1.5"><div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pressureColor(p.paymentPressure)}`} style={{ width: `${p.paymentPressure}%` }} /></div><span className="text-gray-300 font-mono text-xs shrink-0">{p.paymentPressure}%</span></div></div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/5 pt-2 text-xs space-y-1">
                  <div className={ROW}><span className="text-gray-400">Top 5 应付合计</span><span className="text-coral-400 font-mono font-medium">{formatAmount(monthDetail.totalEO)}</span></div>
                  <div className={ROW}><span className="text-gray-400">预测流出</span><span className="text-coral-500 font-mono">{monthDetail.pred ? formatAmount(monthDetail.pred.outflow) : '-'}</span></div>
                </div>
              </div>
              <div className={`${CARD} rounded-xl p-4`}>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-yellow-500" />异常影响分析</h3>
                {monthDetail.anomalies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6"><CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" /><p className="text-emerald-400 text-xs font-medium">✅ 本月数据无异常记录</p></div>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">{monthDetail.anomalies.map((r) => (
                      <div key={r.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                        <div className="flex justify-between items-center mb-1"><span className="text-white text-xs font-medium truncate max-w-[140px]" title={r.customerName}>{r.customerName}</span><span className="text-yellow-400 font-mono text-xs">{formatAmount(r.amount)}</span></div>
                        <p className="text-yellow-400/80 text-xs flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{r.anomalyReason || '未说明原因'}</p>
                      </div>
                    ))}</div>
                    <div className="bg-coral-500/5 border border-coral-500/20 rounded-lg px-3 py-2"><p className="text-coral-400 text-xs flex items-start gap-1"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />该异常记录影响了预测，预计实际回款可能低于预测</p></div>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end"><button onClick={() => setSelectedMonth(null)} className="px-5 py-2 glass-card rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors">关闭</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
