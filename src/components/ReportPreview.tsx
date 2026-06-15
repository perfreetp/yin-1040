import { useState, useMemo } from 'react';
import { X, FileText, Download, Check, CheckCheck } from 'lucide-react';
import { generateBusinessReport, downloadReport } from '@/utils/report';
import type { BusinessReportData } from '@/utils/report';
import type { FilterScope, Receivable, Payable } from '@/types';

const CHAPTERS = [
  { key: 'core', label: '一、核心经营指标', defaultChecked: true },
  { key: 'gap', label: '二、未来资金缺口分析', defaultChecked: true },
  { key: 'customer', label: '三、客户回款 Top 风险', defaultChecked: true },
  { key: 'supplier', label: '四、供应商付款 Top 压力', defaultChecked: true },
  { key: 'alerts', label: '五、预警汇总', defaultChecked: true },
  { key: 'scenario', label: '六、情景推演结论', defaultChecked: true },
  { key: 'versions', label: '七、预测版本追踪', defaultChecked: true },
];

interface ReportPreviewProps {
  open: boolean;
  onClose: () => void;
  reportData: BusinessReportData;
  activeFilter?: FilterScope | null;
  rawData: { receivables: Receivable[]; payables: Payable[] };
}

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

export default function ReportPreview({ open, onClose, reportData, activeFilter, rawData }: ReportPreviewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CHAPTERS.map((c) => [c.key, c.defaultChecked]))
  );
  const [useFilteredScope, setUseFilteredScope] = useState(false);

  const includedChapters = useMemo(
    () => CHAPTERS.filter((c) => checked[c.key]).map((c) => c.key),
    [checked]
  );

  const scopeReceivables = useFilteredScope && activeFilter?.scope === 'customer'
    ? applyRFilter(rawData.receivables, activeFilter) : rawData.receivables;
  const scopePayables = useFilteredScope && activeFilter?.scope === 'supplier'
    ? applyPFilter(rawData.payables, activeFilter) : rawData.payables;

  const totalReceivable = useMemo(
    () => scopeReceivables.reduce((s, r) => s + r.amount, 0),
    [scopeReceivables]
  );
  const totalPayable = useMemo(
    () => scopePayables.reduce((s, p) => s + p.amount, 0),
    [scopePayables]
  );

  const filterDescription = useFilteredScope && activeFilter
    ? `${activeFilter.label}（${activeFilter.appliedAt}）`
    : undefined;

  const scopedReportData: BusinessReportData = {
    ...reportData,
    receivables: scopeReceivables,
    payables: scopePayables,
    totalReceivable,
    totalPayable,
    filterDescription,
  };

  const previewText = useMemo(
    () => generateBusinessReport({ ...scopedReportData, includedChapters }),
    [scopedReportData, includedChapters]
  );

  if (!open) return null;

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAll = () => {
    const allChecked = CHAPTERS.every((c) => checked[c.key]);
    setChecked(Object.fromEntries(CHAPTERS.map((c) => [c.key, !allChecked])));
  };

  const handleExport = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `经营摘要_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
    downloadReport(filename, previewText);
  };

  const canUseFiltered = !!activeFilter;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="glass-card rounded-2xl p-6 max-w-5xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-ice-500" /> 经营摘要预览
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-6 min-h-[400px]">
          <div className="w-56 shrink-0 space-y-2">
            <div className="mb-4 p-3 bg-white/5 rounded-xl space-y-2">
              <span className="text-sm text-gray-300 font-medium block mb-2">数据口径</span>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="scope"
                  checked={!useFilteredScope}
                  onChange={() => setUseFilteredScope(false)}
                  className="accent-ice-500"
                />
                <span className="text-xs text-gray-300">全量数据</span>
              </label>
              <label className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                !canUseFiltered ? 'opacity-40 cursor-not-allowed' : ''
              }`}>
                <input
                  type="radio"
                  name="scope"
                  checked={useFilteredScope}
                  onChange={() => canUseFiltered && setUseFilteredScope(true)}
                  disabled={!canUseFiltered}
                  className="accent-ice-500"
                />
                <span className="text-xs text-gray-300">当前筛选口径</span>
              </label>
              {useFilteredScope && activeFilter && (
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-ice-400">
                  <div>{activeFilter.label}</div>
                  <div className="text-gray-500 mt-0.5">{activeFilter.appliedAt}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-300 font-medium">选择章节</span>
              <button
                onClick={toggleAll}
                className="text-xs text-ice-400 hover:text-ice-300 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {CHAPTERS.every((c) => checked[c.key]) ? '全不选' : '全选'}
              </button>
            </div>
            {CHAPTERS.map((ch) => (
              <label
                key={ch.key}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  checked[ch.key] ? 'bg-ice-500/15 text-white' : 'bg-white/5 text-gray-500'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    checked[ch.key]
                      ? 'bg-ice-500 border-ice-500'
                      : 'border-white/20'
                  }`}
                  onClick={() => toggle(ch.key)}
                >
                  {checked[ch.key] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs font-medium">{ch.label}</span>
              </label>
            ))}
          </div>

          <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {previewText}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-white/10">
          <span className="text-xs text-gray-500 mr-auto">
            已选 {includedChapters.length} / {CHAPTERS.length} 个章节
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={includedChapters.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-ice-500 to-ice-300 hover:from-ice-600 hover:to-ice-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> 导出
          </button>
        </div>
      </div>
    </div>
  );
}
