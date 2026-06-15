import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Bell, Shield, Lock, MessageSquare, Download, Eye, EyeOff, CheckCircle, AlertTriangle, Plus, FileText } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getAlertLevelColor, getAlertLevelBorder, formatAmount } from '@/data/mockData';

const levelConfig = [
  { level: 'green' as const, label: '低风险', bg: 'bg-emerald-500' },
  { level: 'yellow' as const, label: '中风险', bg: 'bg-amber-500' },
  { level: 'orange' as const, label: '较高风险', bg: 'bg-orange-500' },
  { level: 'red' as const, label: '高风险', bg: 'bg-coral-500' },
];

export default function AlertPage() {
  const { alerts, predictionVersions, markAlertRead, addAlertNote, lockPredictionVersion } = useStore();
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [versionName, setVersionName] = useState('');

  const riskCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    alerts.forEach((a) => { counts[a.level]++; });
    return counts;
  }, [alerts]);

  const comparisonData = useMemo(() => {
    const version = predictionVersions[0];
    if (!version) return [];
    const months = version.predictions.map((p) => p.month);
    return months.map((month) => {
      const pred = version.predictions.find((p) => p.month === month);
      const actual = version.actuals.find((a) => a.month === month);
      const predVal = pred ? pred.netFlow : 0;
      const actVal = actual ? actual.netFlow : 0;
      const deviation = predVal !== 0 ? ((actVal - predVal) / Math.abs(predVal) * 100).toFixed(1) : '0.0';
      return {
        month: parseInt(month.split('-')[1], 10) + '月',
        预测: predVal,
        实际: actVal,
        deviation: parseFloat(deviation),
      };
    });
  }, [predictionVersions]);

  const handleAddNote = (alertId: string) => {
    const note = noteInputs[alertId]?.trim();
    if (!note) return;
    addAlertNote(alertId, note);
    setNoteInputs((prev) => ({ ...prev, [alertId]: '' }));
  };

  const handleLockVersion = () => {
    if (versionName.trim()) {
      lockPredictionVersion(versionName.trim());
      setVersionName('');
    }
  };

  const handleExport = () => {
    const lines = [
      '=== 经营摘要报告 ===',
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
      '',
      '【风险预警统计】',
      ...levelConfig.map(({ level, label }) => `${label}：${riskCounts[level]}条`),
      '',
      '【预警详情】',
      ...alerts.map((a) => `[${a.level}] ${a.title} - ${a.description} (${a.createdAt})`),
      '',
      '【资金预测版本】',
      ...predictionVersions.map((v) => `${v.name}（锁定于${v.lockedAt}）`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '经营摘要.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" /> 风险预警中心
        </h1>
        <p className="text-gray-400 text-sm mt-1">AI风险等级评估与预警管理</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-ice-500" /> 风险等级分布
        </h2>
        <div className="flex gap-6">
          {levelConfig.map(({ level, label, bg }) => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${bg}`} />
              <span className="text-gray-300 text-sm">{label}</span>
              <span className="text-white font-mono font-bold text-sm">{riskCounts[level]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`glass-card rounded-2xl p-5 border-l-4 ${getAlertLevelBorder(alert.level)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${getAlertLevelColor(alert.level)}`} />
                <span className="text-white font-bold text-sm">{alert.title}</span>
              </div>
              <button
                onClick={() => markAlertRead(alert.id)}
                className="text-gray-400 hover:text-white transition-colors"
                title={alert.isRead ? '标为未读' : '标为已读'}
              >
                {alert.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-gray-400 text-sm mt-2">{alert.description}</p>
            <p className="text-gray-500 text-xs mt-1">{alert.createdAt}</p>

            <div className="mt-3 bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-300 text-xs font-medium">备注</span>
              </div>
              {alert.notes.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {alert.notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle className="w-3 h-3 text-ice-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{note}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInputs[alert.id] || ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote(alert.id)}
                  placeholder="添加备注..."
                  className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-white text-xs outline-none border border-white/10 focus:border-ice-500/50 transition-colors"
                />
                <button
                  onClick={() => handleAddNote(alert.id)}
                  className="px-3 py-1.5 bg-ice-500/20 hover:bg-ice-500/30 text-ice-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> 添加
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-ice-500" /> 预测版本锁定
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
            <Lock className="w-4 h-4" /> 锁定当前版本
          </button>
        </div>
        {predictionVersions.length > 0 && (
          <div className="mt-4 space-y-2">
            {predictionVersions.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-ice-500" />
                  <span className="text-white text-sm font-medium">{v.name}</span>
                  <span className="text-gray-500 text-xs">{v.lockedAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {comparisonData.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> 预测 vs 实际对比
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v: number) => formatAmount(v)} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v: number) => formatAmount(v)}
              />
              <Legend />
              <Bar dataKey="预测" fill="#00b4d8" radius={[4, 4, 0, 0]}>
                {comparisonData.map((_, i) => <Cell key={i} fill="#00b4d8" />)}
              </Bar>
              <Bar dataKey="实际" radius={[4, 4, 0, 0]}>
                {comparisonData.map((d, i) => (
                  <Cell key={i} fill={d.deviation > 10 || d.deviation < -10 ? '#f87171' : '#34d399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            {comparisonData.map((d) => (
              <span key={d.month} className={Math.abs(d.deviation) > 10 ? 'text-coral-500' : 'text-emerald-400'}>
                {d.month}偏差{d.deviation > 0 ? '+' : ''}{d.deviation}%
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleExport}
        className="w-full py-3 bg-gradient-to-r from-ice-500 to-ice-300 hover:from-ice-600 hover:to-ice-400 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
      >
        <Download className="w-4 h-4" /> 导出经营摘要
      </button>
    </div>
  );
}
