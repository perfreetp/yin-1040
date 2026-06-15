import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, Shield, Lock, Clock, AlertTriangle, Save,
  ChevronRight, RefreshCw, X, Edit3, GitCompare, ArrowLeftRight, Download,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatAmount, formatAmountFull } from '@/data/mockData';
import type { ActualResult, PredictionVersion } from '@/types';

type Scenario = 'optimistic' | 'neutral' | 'pessimistic';

const scenarioLabels: Record<Scenario, string> = {
  optimistic: '乐观',
  neutral: '中性',
  pessimistic: '悲观',
};

function formatMonth(month: string) {
  const m = parseInt(month.split('-')[1], 10);
  return `${m}月`;
}

function calcDeviationRate(predicted: number, actual: number): number {
  if (predicted === 0) return 0;
  return ((actual - predicted) / Math.abs(predicted)) * 100;
}

function diffColor(diff: number | null, reverse = false) {
  if (diff === null) return 'text-gray-500';
  const good = reverse ? diff < 0 : diff > 0;
  const bad = reverse ? diff > 0 : diff < 0;
  return good ? 'text-emerald-400' : bad ? 'text-coral-500' : 'text-gray-400';
}

function diffText(diff: number | null) {
  if (diff === null) return '-';
  return `${diff > 0 ? '+' : ''}${formatAmount(diff)}`;
}

function netColor(val: number | null) {
  return val === null ? 'text-gray-500' : val >= 0 ? 'text-ice-400' : 'text-coral-500';
}

export default function Prediction() {
  const {
    predictions, safetyBalance, predictionVersions,
    setSafetyBalance, lockPredictionVersion, setActualForVersion,
    regeneratePredictions,
  } = useStore();

  const [scenario, setScenario] = useState<Scenario>('neutral');
  const [safetyInput, setSafetyInput] = useState(String(safetyBalance.amount / 10000));
  const [versionName, setVersionName] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<PredictionVersion | null>(null);
  const [editingActuals, setEditingActuals] = useState<Record<string, { inflow: string; outflow: string }>>({});
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');

  useEffect(() => {
    setSafetyInput(String(safetyBalance.amount / 10000));
  }, [safetyBalance.amount]);

  useEffect(() => {
    if (!selectedVersion) return;
    const latest = predictionVersions.find((v) => v.id === selectedVersion.id);
    if (!latest) return;
    setSelectedVersion(latest);
    const initial: Record<string, { inflow: string; outflow: string }> = {};
    latest.predictions.forEach((p) => {
      const a = latest.actuals.find((x) => x.month === p.month);
      initial[p.month] = { inflow: a ? String(a.inflow / 10000) : '', outflow: a ? String(a.outflow / 10000) : '' };
    });
    setEditingActuals(initial);
  }, [selectedVersion?.id, predictionVersions]);

  const chartData = useMemo(() => {
    return predictions
      .filter((p) => p.scenario === scenario)
      .map((p) => ({
        ...p,
        label: formatMonth(p.month),
        isGap: p.netFlow < 0,
      }));
  }, [predictions, scenario]);

  const gapMonths = useMemo(() => chartData.filter((d) => d.isGap), [chartData]);

  const modalChartData = useMemo(() => {
    if (!selectedVersion) return [];
    return selectedVersion.predictions.map((p) => ({
      label: formatMonth(p.month),
      预测净流: p.netFlow,
      实际净流: selectedVersion.actuals.find((a) => a.month === p.month)?.netFlow ?? 0,
    }));
  }, [selectedVersion]);

  const handleSaveSafety = () => {
    const val = parseFloat(safetyInput);
    if (!isNaN(val) && val > 0) {
      setSafetyBalance(val * 10000);
    }
  };

  const handleLockVersion = () => {
    if (versionName.trim()) {
      lockPredictionVersion(versionName.trim());
      setVersionName('');
    }
  };

  const handleActualChange = (month: string, field: 'inflow' | 'outflow', value: string) => {
    setEditingActuals((prev) => ({ ...prev, [month]: { ...prev[month], [field]: value } }));
    const cur = editingActuals[month] || { inflow: '', outflow: '' };
    const newVal = parseFloat(value);
    if (isNaN(newVal) || !selectedVersion) return;
    const inflowVal = field === 'inflow' ? newVal * 10000 : parseFloat(cur.inflow || '0') * 10000;
    const outflowVal = field === 'outflow' ? newVal * 10000 : parseFloat(cur.outflow || '0') * 10000;
    setActualForVersion(selectedVersion.id, { month, inflow: inflowVal, outflow: outflowVal, netFlow: inflowVal - outflowVal });
  };

  const openVersionModal = (version: PredictionVersion) => {
    setSelectedVersion(version);
    const initial: Record<string, { inflow: string; outflow: string }> = {};
    version.predictions.forEach((p) => {
      const a = version.actuals.find((x) => x.month === p.month);
      initial[p.month] = { inflow: a ? String(a.inflow / 10000) : '', outflow: a ? String(a.outflow / 10000) : '' };
    });
    setEditingActuals(initial);
  };

  const closeModal = () => {
    setSelectedVersion(null);
    setEditingActuals({});
  };

  const compareData = useMemo(() => {
    if (!compareA || !compareB) return [];
    const vA = predictionVersions.find((v) => v.id === compareA);
    const vB = predictionVersions.find((v) => v.id === compareB);
    if (!vA || !vB) return [];
    const monthSet = new Set([...vA.predictions.map((p) => p.month), ...vB.predictions.map((p) => p.month)]);
    const months = Array.from(monthSet).sort();
    return months.map((month) => {
      const pA = vA.predictions.find((p) => p.month === month);
      const pB = vB.predictions.find((p) => p.month === month);
      return {
        month,
        label: formatMonth(month),
        inflowA: pA?.inflow ?? null,
        inflowB: pB?.inflow ?? null,
        outflowA: pA?.outflow ?? null,
        outflowB: pB?.outflow ?? null,
        netA: pA?.netFlow ?? null,
        netB: pB?.netFlow ?? null,
      };
    });
  }, [compareA, compareB, predictionVersions]);

  const compareChartData = useMemo(() => {
    return compareData.map((d) => ({ label: d.label, A净流: d.netA ?? 0, B净流: d.netB ?? 0 }));
  }, [compareData]);

  const handleExportCompare = () => {
    if (compareData.length === 0) return;
    const vA = predictionVersions.find((v) => v.id === compareA);
    const vB = predictionVersions.find((v) => v.id === compareB);
    const fmt = (v: number | null) => v !== null ? formatAmountFull(v) : '-';
    const lines = [`版本对比: ${vA?.name} vs ${vB?.name}`, '', '月份\tA流入\tB流入\t流入差异\tA流出\tB流出\t流出差异\tA净流\tB净流\t净流差异'];
    compareData.forEach((d) => {
      const infD = d.inflowA !== null && d.inflowB !== null ? d.inflowB - d.inflowA : null;
      const outD = d.outflowA !== null && d.outflowB !== null ? d.outflowB - d.outflowA : null;
      const netD = d.netA !== null && d.netB !== null ? d.netB - d.netA : null;
      lines.push([d.label, fmt(d.inflowA), fmt(d.inflowB), fmt(infD), fmt(d.outflowA), fmt(d.outflowB), fmt(outD), fmt(d.netA), fmt(d.netB), fmt(netD)].join('\t'));
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
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-ice-500" />
          现金流预测
        </h1>
        <p className="text-gray-400 mt-1 text-sm">AI驱动的月度现金流预测与资金缺口分析</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 p-1 glass-card rounded-xl w-fit">
          {(Object.keys(scenarioLabels) as Scenario[]).map((key) => (
            <button
              key={key}
              onClick={() => setScenario(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                scenario === key
                  ? 'bg-ice-500 text-white shadow-lg shadow-ice-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {scenarioLabels[key]}
            </button>
          ))}
        </div>
        <button
          onClick={() => regeneratePredictions()}
          className="px-4 py-2 glass-card rounded-xl text-sm font-medium text-ice-400 hover:text-white hover:bg-ice-500/20 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          重新生成预测
        </button>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">月度现金流预测</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 13 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v: number) => formatAmount(v)} />
            <Tooltip
              contentStyle={{ background: 'rgba(10,30,60,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }}
              labelStyle={{ color: '#fff' }}
              formatter={(value: number, name: string) => [formatAmountFull(value), name === 'inflow' ? '流入' : '流出']}
            />
            <Legend formatter={(value: string) => (value === 'inflow' ? '流入' : '流出')} />
            <ReferenceLine
              y={safetyBalance.amount}
              stroke="#00D4FF"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{ value: `安全余额 ${formatAmount(safetyBalance.amount)}`, fill: '#00D4FF', fontSize: 12, position: 'right' }}
            />
            <Bar dataKey="inflow" name="inflow" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.isGap ? 'rgba(0,212,255,0.5)' : '#00D4FF'} />
              ))}
            </Bar>
            <Bar dataKey="outflow" name="outflow" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.isGap ? '#FF6B6B' : '#FF8A80'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {gapMonths.length > 0 && (
          <div className="mt-5 border-t border-white/5 pt-4">
            <h3 className="text-sm font-medium text-coral-500 flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-4 h-4" />
              资金缺口月份
            </h3>
            <div className="flex flex-wrap gap-3">
              {gapMonths.map((m) => (
                <div key={m.id} className="flex items-center gap-2 bg-coral-500/10 border border-coral-500/30 rounded-lg px-4 py-2">
                  <span className="text-white text-sm font-medium">{m.label}</span>
                  <span className="text-coral-500 font-mono text-sm">-{formatAmount(m.gap)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-ice-500" />
            安全余额设置
          </h2>
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm whitespace-nowrap">设置安全余额</label>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-3 py-2 flex-1">
              <span className="text-gray-400 text-sm">¥</span>
              <input
                type="number"
                value={safetyInput}
                onChange={(e) => setSafetyInput(e.target.value)}
                className="bg-transparent text-white font-mono text-sm w-full outline-none"
              />
              <span className="text-gray-400 text-sm">万</span>
            </div>
            <button
              onClick={handleSaveSafety}
              className="px-4 py-2 bg-ice-500 hover:bg-ice-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            当前安全余额：¥{formatAmount(safetyBalance.amount)}（更新于{safetyBalance.updatedAt}）
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-ice-500" />
            版本锁定
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="输入版本名称"
              className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-ice-500/50 transition-colors"
            />
            <button
              onClick={handleLockVersion}
              className="px-4 py-2 bg-ice-500 hover:bg-ice-600 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Lock className="w-4 h-4" />
              锁定当前版本
            </button>
          </div>
        </div>
      </div>

      {predictionVersions.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-ice-500" />
            已锁定版本
          </h2>
          <div className="space-y-3">
            {predictionVersions.map((v) => (
              <div
                key={v.id}
                onClick={() => openVersionModal(v)}
                className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-ice-500" />
                  <span className="text-white text-sm font-medium">{v.name}</span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {v.lockedAt}
                  </span>
                  {v.actuals.length > 0 && (
                    <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      已录入 {v.actuals.length}/{v.predictions.length}
                    </span>
                  )}
                </div>
                <button className="text-ice-500 hover:text-ice-400 text-sm flex items-center gap-1 transition-colors">
                  查看详情
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {predictionVersions.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-ice-500" />
            版本对比
          </h2>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {(['A', 'B'] as const).map((slot) => {
              const val = slot === 'A' ? compareA : compareB;
              const set = slot === 'A' ? setCompareA : setCompareB;
              return (
                <div key={slot} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">版本 {slot}</span>
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
                  <thead>
                    <tr className="border-b border-white/10">
                      {['月份', 'A流入', 'B流入', '流入差异', 'A流出', 'B流出', '流出差异', 'A净流', 'B净流', '净流差异'].map((h, i) => (
                        <th key={h} className={`${i === 0 ? 'text-left' : 'text-right'} py-3 px-2 text-gray-400 font-medium`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareData.map((d) => {
                      const infDiff = d.inflowA !== null && d.inflowB !== null ? d.inflowB - d.inflowA : null;
                      const outDiff = d.outflowA !== null && d.outflowB !== null ? d.outflowB - d.outflowA : null;
                      const netDiff = d.netA !== null && d.netB !== null ? d.netB - d.netA : null;
                      return (
                        <tr key={d.month} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-2 text-white font-medium">{d.label}</td>
                          <td className="py-3 px-2 text-right font-mono text-gray-300">{d.inflowA !== null ? formatAmount(d.inflowA) : '-'}</td>
                          <td className="py-3 px-2 text-right font-mono text-gray-300">{d.inflowB !== null ? formatAmount(d.inflowB) : '-'}</td>
                          <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(infDiff)}`}>{diffText(infDiff)}</td>
                          <td className="py-3 px-2 text-right font-mono text-gray-300">{d.outflowA !== null ? formatAmount(d.outflowA) : '-'}</td>
                          <td className="py-3 px-2 text-right font-mono text-gray-300">{d.outflowB !== null ? formatAmount(d.outflowB) : '-'}</td>
                          <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(outDiff, true)}`}>{diffText(outDiff)}</td>
                          <td className={`py-3 px-2 text-right font-mono ${netColor(d.netA)}`}>{d.netA !== null ? formatAmount(d.netA) : '-'}</td>
                          <td className={`py-3 px-2 text-right font-mono ${netColor(d.netB)}`}>{d.netB !== null ? formatAmount(d.netB) : '-'}</td>
                          <td className={`py-3 px-2 text-right font-mono font-medium ${diffColor(netDiff)}`}>{diffText(netDiff)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-ice-500" />
                  净流对比
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={compareChartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatAmount(v)} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(10,30,60,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatAmountFull(value), '']}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
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
          <div
            className="glass-card rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-ice-500" />
                  {selectedVersion.name}
                </h2>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  锁定时间：{selectedVersion.lockedAt}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">月份</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">预测流入</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">实际流入</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">预测流出</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">实际流出</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">预测净流</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">实际净流</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">偏差率</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVersion.predictions.map((p) => {
                    const actual = selectedVersion.actuals.find((a) => a.month === p.month);
                    const actualInflow = actual?.inflow ?? 0;
                    const actualOutflow = actual?.outflow ?? 0;
                    const actualNetFlow = actualInflow - actualOutflow;
                    const devRate = actual ? calcDeviationRate(p.netFlow, actualNetFlow) : 0;
                    const isDevOk = actual && Math.abs(devRate) <= 10;
                    const editVals = editingActuals[p.month] || { inflow: '', outflow: '' };

                    return (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-2 text-white font-medium">{formatMonth(p.month)}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{formatAmount(p.inflow)}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400 text-xs">¥</span>
                            <input
                              type="number"
                              value={editVals.inflow}
                              onChange={(e) => handleActualChange(p.month, 'inflow', e.target.value)}
                              className="w-20 bg-white/5 rounded px-2 py-1 text-white font-mono text-xs text-right outline-none border border-white/10 focus:border-ice-500/50"
                              placeholder="0"
                            />
                            <span className="text-gray-400 text-xs">万</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-gray-300">{formatAmount(p.outflow)}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400 text-xs">¥</span>
                            <input
                              type="number"
                              value={editVals.outflow}
                              onChange={(e) => handleActualChange(p.month, 'outflow', e.target.value)}
                              className="w-20 bg-white/5 rounded px-2 py-1 text-white font-mono text-xs text-right outline-none border border-white/10 focus:border-ice-500/50"
                              placeholder="0"
                            />
                            <span className="text-gray-400 text-xs">万</span>
                          </div>
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${p.netFlow >= 0 ? 'text-ice-400' : 'text-coral-500'}`}>
                          {formatAmount(p.netFlow)}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono ${actual ? (actualNetFlow >= 0 ? 'text-ice-400' : 'text-coral-500') : 'text-gray-500'}`}>
                          {actual ? formatAmount(actualNetFlow) : '-'}
                        </td>
                        <td className={`py-3 px-2 text-right font-mono font-medium ${actual ? (isDevOk ? 'text-emerald-400' : 'text-coral-500') : 'text-gray-500'}`}>
                          {actual ? `${devRate >= 0 ? '+' : ''}${devRate.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-ice-500" />
                预测净流 vs 实际净流
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={modalChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v: number) => formatAmount(v)} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(10,30,60,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatAmountFull(value), '']}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                  <Bar dataKey="预测净流" fill="#00D4FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="实际净流" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-5 py-2 glass-card rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
