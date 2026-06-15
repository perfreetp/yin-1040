import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Bell, Shield, Lock, MessageSquare, Download, Eye, EyeOff,
  CheckCircle, AlertTriangle, Plus, FileText, RefreshCw, CheckCheck, Filter,
  AlertCircle, CheckCircle2, Archive, Inbox, Layers,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getAlertLevelColor, getAlertLevelBorder, formatAmount } from '@/data/mockData';
import { generateBusinessReport, downloadReport } from '@/utils/report';
import type { AlertLevel, AlertType, AlertHandlingStatus, FilterScope, Receivable, Payable } from '@/types';
import ReportPreview from '@/components/ReportPreview';

const levelConfig = [
  { level: 'green' as const, label: '低风险', bg: 'bg-emerald-500', text: 'text-emerald-400' },
  { level: 'yellow' as const, label: '中风险', bg: 'bg-amber-500', text: 'text-amber-400' },
  { level: 'orange' as const, label: '较高风险', bg: 'bg-orange-500', text: 'text-orange-400' },
  { level: 'red' as const, label: '高风险', bg: 'bg-coral-500', text: 'text-coral-400' },
];

const typeBadgeConfig: Record<AlertType, { label: string; bg: string; text: string }> = {
  balance_safety: { label: '资金安全', bg: 'bg-coral-500/20', text: 'text-coral-400' },
  funding_gap: { label: '资金缺口', bg: 'bg-coral-500/20', text: 'text-coral-400' },
  customer_overdue: { label: '客户逾期', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  supplier_pressure: { label: '供应商压力', bg: 'bg-ice-500/20', text: 'text-ice-400' },
  anomaly: { label: '数据异常', bg: 'bg-purple-500/20', text: 'text-purple-400' },
};

const handlingStatusConfig: Array<{ status: AlertHandlingStatus; label: string; icon: any; bg: string; text: string; dot: string }> = [
  { status: 'unhandled', label: '未处理', icon: AlertCircle, bg: 'bg-coral-500/10', text: 'text-coral-400', dot: 'bg-coral-500' },
  { status: 'read', label: '已读', icon: Eye, bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-500' },
  { status: 'noted', label: '有备注', icon: MessageSquare, bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500' },
  { status: 'resolved', label: '已解决', icon: CheckCircle2, bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  { status: 'archived', label: '已归档', icon: Archive, bg: 'bg-gray-500/10', text: 'text-gray-400', dot: 'bg-gray-500' },
];
const pillBtn = 'px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors';

const levelFilterOptions: Array<{ value: 'all' | AlertLevel; label: string; bg?: string }> = [
  { value: 'all', label: '全部' },
  { value: 'green', label: '低风险', bg: 'bg-emerald-500' },
  { value: 'yellow', label: '中风险', bg: 'bg-amber-500' },
  { value: 'orange', label: '较高风险', bg: 'bg-orange-500' },
  { value: 'red', label: '高风险', bg: 'bg-coral-500' },
];

function applyRFilter(list: Receivable[], f: FilterScope): Receivable[] {
  return list.filter(r => {
    if (f.riskLevel && f.riskLevel !== 'all' && r.riskLevel !== f.riskLevel) return false;
    if (f.customerStatus && f.customerStatus !== 'all' && r.status !== f.customerStatus) return false;
    if (f.receivableAmountMin != null && r.amount < f.receivableAmountMin) return false;
    if (f.receivableAmountMax != null && r.amount > f.receivableAmountMax) return false;
    return true;
  });
}

function applyPFilter(list: Payable[], f: FilterScope): Payable[] {
  return list.filter(p => {
    if (f.pressureLevel && f.pressureLevel !== 'all') {
      if (f.pressureLevel === 'high' && p.paymentPressure < 80) return false;
      if (f.pressureLevel === 'medium' && (p.paymentPressure < 50 || p.paymentPressure >= 80)) return false;
      if (f.pressureLevel === 'low' && p.paymentPressure >= 50) return false;
    }
    if (f.supplierStatus && f.supplierStatus !== 'all' && p.status !== f.supplierStatus) return false;
    if (f.payableAmountMin != null && p.amount < f.payableAmountMin) return false;
    if (f.payableAmountMax != null && p.amount > f.payableAmountMax) return false;
    return true;
  });
}

export default function AlertPage() {
  const store = useStore();
  const {
    alerts, predictionVersions, receivables, payables, predictions,
    scenarioSimulations, safetyBalance, currentBalance, activeFilter,
    markAlertRead, markAllAlertsRead, addAlertNote,
    lockPredictionVersion, refreshAlerts,
    resolveAlert, archiveAlert, unarchiveAlert, setAlertHandlingStatus,
  } = store;

  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [versionName, setVersionName] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | AlertLevel>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [archiveView, setArchiveView] = useState<'active' | 'archived'>('active');
  const [previewOpen, setPreviewOpen] = useState(false);

  const riskCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
    alerts.forEach((a) => { counts[a.level]++; });
    return counts;
  }, [alerts]);

  const handlingStatusCounts = useMemo(() => {
    const counts: Record<AlertHandlingStatus, number> = { unhandled: 0, read: 0, noted: 0, resolved: 0, archived: 0 };
    alerts.forEach(a => a.archived ? counts.archived++ : (counts[a.handlingStatus] = (counts[a.handlingStatus] || 0) + 1));
    return counts;
  }, [alerts]);

  const filteredAlerts = useMemo(() => alerts.filter(a => {
    if (archiveView === 'active' && a.archived) return false;
    if (archiveView === 'archived' && !a.archived) return false;
    if (levelFilter !== 'all' && a.level !== levelFilter) return false;
    if (readFilter === 'unread' && a.isRead) return false;
    return true;
  }), [alerts, levelFilter, readFilter, archiveView]);

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

  const scopeReceivables = activeFilter?.scope === 'customer'
    ? applyRFilter(receivables, activeFilter) : receivables;
  const scopePayables = activeFilter?.scope === 'supplier'
    ? applyPFilter(payables, activeFilter) : payables;

  const totalReceivable = useMemo(
    () => scopeReceivables.reduce((s, r) => s + r.amount, 0),
    [scopeReceivables]
  );
  const totalPayable = useMemo(
    () => scopePayables.reduce((s, p) => s + p.amount, 0),
    [scopePayables]
  );

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

  const buildFilterDescription = (): string => {
    const parts: string[] = [];
    if (levelFilter !== 'all') {
      const levelLabel = levelConfig.find((l) => l.level === levelFilter)?.label || levelFilter;
      parts.push(`风险等级：${levelLabel}`);
    }
    if (readFilter === 'unread') {
      parts.push(`状态：未读`);
    }
    return parts.join('，');
  };

  const handleExport = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `经营摘要_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
    const alertFilter = buildFilterDescription();
    const filterDescription = activeFilter
      ? `${activeFilter.label}（${activeFilter.appliedAt}）`
      : undefined;
    const content = generateBusinessReport({
      currentBalance,
      totalReceivable,
      totalPayable,
      receivables: scopeReceivables,
      payables: scopePayables,
      predictions,
      alerts: filteredAlerts,
      predictionVersions,
      scenarios: scenarioSimulations,
      safetyBalance,
      alertFilter: alertFilter || undefined,
      filterDescription,
      generatedAt: now.toLocaleString('zh-CN'),
    });
    downloadReport(filename, content);
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" /> 风险预警中心
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI风险等级评估与预警管理</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-coral-500/15 border border-coral-500/30 rounded-full">
            <AlertTriangle className="w-4 h-4 text-coral-400" />
            <span className="text-coral-400 text-sm font-medium">{unreadCount} 条未读预警</span>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-ice-500" /> 风险等级分布
        </h2>
        <div className="flex gap-6 flex-wrap">
          {levelConfig.map(({ level, label, bg }) => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${bg}`} />
              <span className="text-gray-300 text-sm">{label}</span>
              <span className="text-white font-mono font-bold text-sm">{riskCounts[level]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-ice-500" /> 预警处理闭环统计
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {handlingStatusConfig.map(({ status, label, icon: Icon, bg, text, dot }) => (
            <div key={status} className={`${bg} rounded-xl p-3 border border-white/5`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <Icon className={`w-3.5 h-3.5 ${text}`} />
                <span className={`text-xs font-medium ${text}`}>{label}</span>
              </div>
              <div className="text-white font-mono font-bold text-xl">{handlingStatusCounts[status]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm font-medium">筛选</span>
          </div>
          <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg border border-white/10">
            {(['active', 'archived'] as const).map(v => (
              <button key={v} onClick={() => setArchiveView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  archiveView === v ? 'bg-ice-500 text-white shadow-md' : 'text-gray-300 hover:text-white'
                }`}>
                {v === 'active' ? <Inbox className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                {v === 'active' ? '活跃预警' : '已归档'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {levelFilterOptions.map(({ value, label, bg }) => (
              <button
                key={value}
                onClick={() => setLevelFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  levelFilter === value
                    ? 'bg-ice-500 text-white shadow-lg shadow-ice-500/20'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {bg && <div className={`w-2 h-2 rounded-full ${bg}`} />}
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="flex gap-2">
            <button
              onClick={() => setReadFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                readFilter === 'all'
                  ? 'bg-ice-500 text-white shadow-lg shadow-ice-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              全部状态
            </button>
            <button
              onClick={() => setReadFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                readFilter === 'unread'
                  ? 'bg-coral-500 text-white shadow-lg shadow-coral-500/20'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <EyeOff className="w-3 h-3" /> 未读
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex gap-2">
            <button
              onClick={markAllAlertsRead}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> 全部标为已读
            </button>
            <button
              onClick={refreshAlerts}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> 刷新预警
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          共 {filteredAlerts.length} / {alerts.length} 条预警
        </div>
      </div>

      <div className="space-y-4">
        {filteredAlerts.map((alert) => {
          const typeConfig = typeBadgeConfig[alert.type] || { label: alert.type, bg: 'bg-gray-500/20', text: 'text-gray-400' };
          const isArchived = alert.archived;
          return (
            <div
              key={alert.id}
              className={`glass-card rounded-2xl p-5 border-l-4 ${getAlertLevelBorder(alert.level)} ${
                !alert.isRead ? 'bg-white/[0.07]' : ''
              } ${isArchived ? 'opacity-70 bg-white/[0.02]' : ''}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-2.5 flex-wrap">
                  <div className={`w-2.5 h-2.5 rounded-full ${getAlertLevelColor(alert.level)} mt-1.5`} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>{typeConfig.label}</span>
                      {isArchived && <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-500/25 text-gray-400">已归档</span>}
                      {!alert.isRead && !isArchived && <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-coral-500/25 text-coral-400 animate-pulse">NEW</span>}
                      <span className="text-white font-bold text-sm">{alert.title}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{alert.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-gray-500 text-xs">{alert.createdAt}</span>
                      {isArchived && alert.archivedAt && (
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Archive className="w-3 h-3" /> 归档于 {alert.archivedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!isArchived && (
                  <button
                    onClick={() => markAlertRead(alert.id, !alert.isRead)}
                    className="text-gray-400 hover:text-white transition-colors shrink-0"
                    title={alert.isRead ? '标为未读' : '标为已读'}
                  >
                    {alert.isRead ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <div className="mt-4 bg-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-300 text-xs font-medium">备注</span>
                  {alert.notes.length > 0 && (
                    <span className="text-gray-500 text-xs">({alert.notes.length})</span>
                  )}
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
                {!isArchived && (
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
                )}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                {isArchived ? (
                  <button onClick={() => unarchiveAlert(alert.id)} className={`${pillBtn} bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400`}>
                    <Inbox className="w-3.5 h-3.5" /> 恢复
                  </button>
                ) : (<>
                  <button onClick={() => resolveAlert(alert.id)} className={`${pillBtn} bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> 标记已解决
                  </button>
                  <button onClick={() => archiveAlert(alert.id)} className={`${pillBtn} bg-gray-500/20 hover:bg-gray-500/30 text-gray-300`}>
                    <Archive className="w-3.5 h-3.5" /> 归档处理
                  </button>
                </>)}
              </div>
            </div>
          );
        })}
        {filteredAlerts.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center">
            <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">暂无符合条件的预警</p>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-ice-500" /> 预测版本锁定
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
            placeholder="输入版本名称"
            className="flex-1 min-w-[200px] bg-white/5 rounded-lg px-3 py-2 text-white text-sm outline-none border border-white/10 focus:border-ice-500/50 transition-colors"
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
          <div className="flex gap-4 mt-3 text-xs text-gray-400 flex-wrap">
            {comparisonData.map((d) => (
              <span key={d.month} className={Math.abs(d.deviation) > 10 ? 'text-coral-500' : 'text-emerald-400'}>
                {d.month}偏差{d.deviation > 0 ? '+' : ''}{d.deviation}%
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex-1 py-3 bg-gradient-to-r from-ice-500 to-ice-300 hover:from-ice-600 hover:to-ice-400 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
        >
          <FileText className="w-4 h-4" /> 预览经营摘要
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-2xl text-sm font-medium flex items-center gap-2 transition-colors"
          title="直接导出全部章节"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <ReportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        reportData={{
          currentBalance,
          totalReceivable,
          totalPayable,
          receivables,
          payables,
          predictions,
          alerts: filteredAlerts,
          predictionVersions,
          scenarios: scenarioSimulations,
          safetyBalance,
          alertFilter: buildFilterDescription() || undefined,
          generatedAt: new Date().toLocaleString('zh-CN'),
        }}
        activeFilter={activeFilter}
        rawData={{ receivables, payables }}
      />
    </div>
  );
}
