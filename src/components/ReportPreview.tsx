import { useState, useMemo } from 'react';
import { X, FileText, Download, Check, CheckCheck } from 'lucide-react';
import { generateBusinessReport, downloadReport } from '@/utils/report';
import type { BusinessReportData } from '@/utils/report';

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
}

export default function ReportPreview({ open, onClose, reportData }: ReportPreviewProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(CHAPTERS.map((c) => [c.key, c.defaultChecked]))
  );

  const includedChapters = useMemo(
    () => CHAPTERS.filter((c) => checked[c.key]).map((c) => c.key),
    [checked]
  );

  const previewText = useMemo(
    () => generateBusinessReport({ ...reportData, includedChapters }),
    [reportData, includedChapters]
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
