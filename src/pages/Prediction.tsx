import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { TrendingUp, Shield, Lock, Clock, AlertTriangle, Save, ChevronDown } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatAmount, formatAmountFull } from '@/data/mockData';

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

export default function Prediction() {
  const { predictions, safetyBalance, predictionVersions, setSafetyBalance, lockPredictionVersion } = useStore();
  const [scenario, setScenario] = useState<Scenario>('neutral');
  const [safetyInput, setSafetyInput] = useState(String(safetyBalance.amount / 10000));
  const [versionName, setVersionName] = useState('');

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-ice-500" />
          现金流预测
        </h1>
        <p className="text-gray-400 mt-1 text-sm">AI驱动的月度现金流预测与资金缺口分析</p>
      </div>

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
              <div key={v.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-ice-500" />
                  <span className="text-white text-sm font-medium">{v.name}</span>
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {v.lockedAt}
                  </span>
                </div>
                <button className="text-ice-500 hover:text-ice-400 text-sm flex items-center gap-1 transition-colors">
                  查看详情
                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
