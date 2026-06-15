import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { FlaskConical, Clock, ShoppingCart, Plus, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatAmount } from '@/data/mockData';
import { generateBusinessReport, downloadReport } from '@/utils/report';
import type { CashFlowPrediction, ScenarioSimulation } from '@/types';

function computeAdjustedPredictions(
  neutral: CashFlowPrediction[],
  delayDays: number,
  earlyPurchase: number,
): CashFlowPrediction[] {
  const sorted = [...neutral].sort((a, b) => a.month.localeCompare(b.month));
  const n = sorted.length;
  const shiftRatio = Math.min(delayDays / 60, 1);
  const shiftPerMonth = shiftRatio * sorted[0].inflow * 0.3;
  const earlyCount = Math.ceil(n / 2);
  const lateCount = n - earlyCount;
  const lateGain = lateCount > 0 ? (shiftPerMonth * earlyCount) / lateCount : 0;

  return sorted.map((p, i) => {
    let inflow = p.inflow;
    let outflow = p.outflow;
    if (i < earlyCount) inflow -= shiftPerMonth;
    else inflow += lateGain;
    if (i === 0) outflow += earlyPurchase;
    const netFlow = inflow - outflow;
    const gap = Math.max(0, -netFlow);
    return { ...p, id: `adj-${p.id}`, inflow, outflow, netFlow, gap };
  });
}

const scenarioColors = ['#00D4FF', '#FFB020', '#FF4757'];

export default function Scenario() {
  const store = useStore();
  const { predictions, scenarioSimulations, addScenarioSimulation, removeScenarioSimulation,
    receivables, payables, alerts, predictionVersions, safetyBalance, currentBalance } = store;
  const [delayDays, setDelayDays] = useState(0);
  const [earlyPurchase, setEarlyPurchase] = useState(0);
  const [scenarioName, setScenarioName] = useState('');

  const neutralPredictions = useMemo(
    () => predictions.filter((p) => p.scenario === 'neutral'),
    [predictions],
  );

  const adjustedPredictions = useMemo(
    () => computeAdjustedPredictions(neutralPredictions, delayDays, earlyPurchase),
    [neutralPredictions, delayDays, earlyPurchase],
  );

  const totalGap = useMemo(() => adjustedPredictions.reduce((s, p) => s + p.gap, 0), [adjustedPredictions]);
  const firstGapMonth = useMemo(() => adjustedPredictions.find((p) => p.gap > 0), [adjustedPredictions]);

  const handleAddScenario = () => {
    if (scenarioSimulations.length >= 3) return;
    const name = scenarioName.trim() || `方案${scenarioSimulations.length + 1}`;
    addScenarioSimulation({
      id: 'sim-' + Date.now(),
      name,
      collectionDelayDays: delayDays,
      earlyPurchaseAmount: earlyPurchase,
      adjustedPredictions: [...adjustedPredictions],
    });
    setScenarioName('');
  };

  const chartData = useMemo(() => {
    if (scenarioSimulations.length === 0) return [];
    return neutralPredictions.map((p, i) => {
      const m = parseInt(p.month.split('-')[1], 10);
      const item: Record<string, string | number> = { month: `${m}月` };
      scenarioSimulations.forEach((sim, si) => {
        item[`s${si}`] = sim.adjustedPredictions[i]?.netFlow ?? 0;
      });
      return item;
    });
  }, [neutralPredictions, scenarioSimulations]);

  const tableRows: { label: string; getValue: (s: ScenarioSimulation) => string }[] = [
    { label: '回款延迟天数', getValue: (s) => `${s.collectionDelayDays}天` },
    { label: '提前采购金额', getValue: (s) => `¥${formatAmount(s.earlyPurchaseAmount)}` },
    {
      label: '7月净现金流',
      getValue: (s) => {
        const p = s.adjustedPredictions.find((x) => x.month.endsWith('-07'));
        return p ? `¥${formatAmount(p.netFlow)}` : '-';
      },
    },
    {
      label: '8月净现金流',
      getValue: (s) => {
        const p = s.adjustedPredictions.find((x) => x.month.endsWith('-08'));
        return p ? `¥${formatAmount(p.netFlow)}` : '-';
      },
    },
    {
      label: '资金缺口总额',
      getValue: (s) => `¥${formatAmount(s.adjustedPredictions.reduce((sum, x) => sum + x.gap, 0))}`,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-ice-500" />
          情景推演
        </h1>
        <p className="text-gray-400 mt-1 text-sm">模拟不同经营策略对现金流的影响</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-ice-500" />
            延迟回款模拟
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">回款延迟天数</span>
              <span className="text-ice-500 font-mono font-medium">{delayDays}天</span>
            </div>
            <input
              type="range" min={0} max={60} value={delayDays}
              onChange={(e) => setDelayDays(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-navy-700 accent-ice-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0天</span><span>30天</span><span>60天</span>
            </div>
            {delayDays > 0 && (
              <div className="bg-coral-500/10 border border-coral-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-coral-500 mt-0.5 shrink-0" />
                <p className="text-sm text-coral-400">
                  延迟{delayDays}天回款将导致{firstGapMonth ? parseInt(firstGapMonth.month.split('-')[1]) + '月' : '首月'}资金缺口增加至¥{formatAmount(totalGap)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            提前采购模拟
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">提前采购金额</span>
              <span className="text-amber-500 font-mono font-medium">¥{formatAmount(earlyPurchase)}</span>
            </div>
            <input
              type="range" min={0} max={5000000} step={100000} value={earlyPurchase}
              onChange={(e) => setEarlyPurchase(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-navy-700 accent-ice-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0万</span><span>250万</span><span>500万</span>
            </div>
            {earlyPurchase > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-400">
                  提前采购¥{formatAmount(earlyPurchase)}将增加首月现金流出，当月净现金流减少¥{formatAmount(earlyPurchase)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)}
          placeholder="方案名称（可选）"
          className="bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-ice-500/50 transition-colors w-48"
        />
        <button
          onClick={handleAddScenario}
          disabled={scenarioSimulations.length >= 3}
          className="px-4 py-2 bg-ice-500 hover:bg-ice-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加到对比方案
        </button>
        {scenarioSimulations.length >= 3 && <span className="text-gray-500 text-xs">最多3个方案</span>}
      </div>

      {scenarioSimulations.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="bg-navy-700 px-6 py-3 flex">
            <span className="flex-1 text-sm font-semibold text-gray-300">指标</span>
            {scenarioSimulations.map((sim, i) => (
              <span key={sim.id} className="flex-1 text-sm font-semibold text-center" style={{ color: scenarioColors[i] }}>
                {sim.name}
              </span>
            ))}
            <span className="w-10" />
          </div>
          {tableRows.map((row) => (
            <div key={row.label} className="px-6 py-3 flex border-t border-white/5">
              <span className="flex-1 text-sm text-gray-400">{row.label}</span>
              {scenarioSimulations.map((sim) => (
                <span key={sim.id} className="flex-1 text-sm text-white font-mono text-center">{row.getValue(sim)}</span>
              ))}
              <span className="w-10" />
            </div>
          ))}
          <div className="px-6 py-2 flex border-t border-white/5">
            <span className="flex-1" />
            {scenarioSimulations.map((sim) => (
              <span key={sim.id} className="flex-1 flex justify-center">
                <button onClick={() => removeScenarioSimulation(sim.id)} className="text-gray-500 hover:text-coral-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </span>
            ))}
            <span className="w-10" />
          </div>
        </div>
      )}

      {scenarioSimulations.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">方案净现金流对比</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 13 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v: number) => formatAmount(v)} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,30,60,0.95)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number, name: string) => [`¥${formatAmount(value)}`, scenarioSimulations[parseInt(name.slice(1))]?.name ?? name]}
              />
              <Legend formatter={(value: string) => scenarioSimulations[parseInt(value.slice(1))]?.name ?? value} />
              {scenarioSimulations.map((sim, i) => (
                <Bar key={sim.id} dataKey={`s${i}`} name={`s${i}`} fill={scenarioColors[i]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            const ts = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const fname = `情景推演报告_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.txt`;
            const totalReceivable = receivables.filter((r) => r.status !== 'received').reduce((s, r) => s + r.amount, 0);
            const totalPayable = payables.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
            const content = generateBusinessReport({
              currentBalance, totalReceivable, totalPayable,
              receivables, payables, predictions, alerts,
              predictionVersions, scenarios: scenarioSimulations, safetyBalance,
              generatedAt: new Date().toLocaleString('zh-CN'),
              alertFilter: '情景推演模式',
            });
            downloadReport(fname, content);
          }}
          className="px-6 py-2.5 bg-ice-500 hover:bg-ice-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4" />
          生成推演报告
        </button>
      </div>
    </div>
  );
}
