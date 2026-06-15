import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore, detectAnomalies } from '@/store/useStore';
import { mockReceivables, mockPayables, formatAmountFull, getRiskColor, getRiskBg } from '@/data/mockData';
import type { Receivable, Payable } from '@/types';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, RotateCcw, RefreshCw, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待回款', color: 'bg-ice-500/20 text-ice-400' },
  partial: { label: '部分回款', color: 'bg-amber-500/20 text-amber-400' },
  received: { label: '已回款', color: 'bg-emerald-400/20 text-emerald-400' },
  overdue: { label: '已逾期', color: 'bg-coral-500/20 text-coral-400' },
  paid: { label: '已付款', color: 'bg-emerald-400/20 text-emerald-400' },
};

const FIELD_KEYS = {
  customer: ['customerName', '客户名称', '客户', 'customer', 'Customer', '公司名称'],
  supplier: ['supplierName', '供应商名称', '供应商', 'supplier', 'Supplier', '供货商'],
  amount: ['amount', '金额', 'Amount', 'price', '价格', '应收账款金额', '应付账款金额'],
  date: ['dueDate', '到期日', '日期', 'date', 'Date', '应付款日期', '应收款日期'],
  status: ['status', '状态'],
};

function findValue(row: any, keys: string[]): any {
  for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  return '';
}

function parseAmount(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = parseFloat(val.replace(/[¥$,，\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function parseDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  const m = s.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : s;
}

function parseStatus(val: any): string {
  if (!val) return '';
  const s = String(val).toLowerCase();
  if (s.includes('逾期') || s === 'overdue') return 'overdue';
  if (s.includes('已回款') || s === 'received') return 'received';
  if (s.includes('已付款') || s === 'paid') return 'paid';
  if (s.includes('部分') || s === 'partial') return 'partial';
  if (s.includes('待') || s === 'pending') return 'pending';
  return '';
}

interface ParsedData { receivables: Receivable[]; payables: Payable[]; anomalies: number; }

function parseRows(rows: any[], sheetName: string): ParsedData {
  const receivables: Receivable[] = [];
  const payables: Payable[] = [];
  let anomalies = 0;
  const hasCust = rows.some((r: any) => FIELD_KEYS.customer.some((k) => r[k] !== undefined && r[k] !== ''));
  const hasSup = rows.some((r: any) => FIELD_KEYS.supplier.some((k) => r[k] !== undefined && r[k] !== ''));
  const forceR = sheetName.includes('应收');
  const forceP = sheetName.includes('应付');

  rows.forEach((row, idx) => {
    const cv = findValue(row, FIELD_KEYS.customer);
    const sv = findValue(row, FIELD_KEYS.supplier);
    const amount = parseAmount(findValue(row, FIELD_KEYS.amount));
    const dueDate = parseDate(findValue(row, FIELD_KEYS.date));
    const status = parseStatus(findValue(row, FIELD_KEYS.status));
    if (amount <= 0 && !dueDate && !cv && !sv) return;
    const id = 'imp-' + Date.now().toString(36) + '-' + idx;
    let isR = forceR || (!forceP && (hasCust || !!cv));
    let isP = forceP || (!forceR && (hasSup || !!sv));
    if (!isR && !isP) { if (cv) isR = true; else if (sv) isP = true; else isR = true; }
    if (isR && cv) {
      receivables.push({ id, customerName: String(cv), amount, dueDate, status: (status as Receivable['status']) || 'pending', collectionProbability: 80, riskLevel: 'B', isAnomaly: false });
    } else if (isP && sv) {
      payables.push({ id, supplierName: String(sv), amount, dueDate, status: (status as Payable['status']) || 'pending', paymentPressure: 50, priority: 1 });
    } else {
      anomalies++;
    }
  });
  const enriched = detectAnomalies(receivables);
  anomalies += enriched.filter((r) => r.isAnomaly).length;
  return { receivables: enriched, payables, anomalies };
}

export default function DataImport() {
  const { receivables, payables, importData, refreshAlerts } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'receivable' | 'payable'>('receivable');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmData, setConfirmData] = useState<ParsedData | null>(null);

  const data = tab === 'receivable' ? receivables : payables;
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paged = data.slice((page - 1) * pageSize, page * pageSize);
  const anomalies = receivables.filter((r) => r.isAnomaly);
  const anomalyTypeCount = anomalies.reduce<Record<string, number>>((acc, r) => {
    const reason = r.anomalyReason || '未知';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setProgress(10);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setProgress(40);
        const wb = XLSX.read(ev.target?.result, { type: 'binary', cellDates: true });
        let allR: Receivable[] = [], allP: Payable[] = [], allA = 0;
        wb.SheetNames.forEach((name, i) => {
          const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[name], { defval: '', raw: false });
          const p = parseRows(rows, name);
          allR = allR.concat(p.receivables);
          allP = allP.concat(p.payables);
          allA += p.anomalies;
          setProgress(40 + Math.floor(((i + 1) / wb.SheetNames.length) * 40));
        });
        setProgress(90);
        const finalR = detectAnomalies(allR);
        allA = finalR.filter((r) => r.isAnomaly).length + allP.filter((p) => p.status === 'overdue' || p.paymentPressure >= 90).length;
        setProgress(100);
        setConfirmData({ receivables: finalR, payables: allP, anomalies: allA });
      } catch {
        alert('文件解析失败，请检查格式');
      } finally {
        setParsing(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.onerror = () => { setParsing(false); alert('文件读取失败'); };
    reader.readAsBinaryString(file);
  };

  const handleConfirm = async () => {
    if (!confirmData) return;
    setImporting(true);
    setProgress(0);
    for (let i = 0; i <= 100; i += 10) { await new Promise((r) => setTimeout(r, 80)); setProgress(i); }
    importData(confirmData.receivables, confirmData.payables);
    setImporting(false);
    setConfirmData(null);
    setProgress(0);
  };

  const renderStatusBadge = (s: string) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusMap[s]?.color}`}>{statusMap[s]?.label}</span>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">数据接入</h1>
          <p className="text-sm text-gray-400 mt-1">导入应收应付数据，AI自动识别异常记录</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refreshAlerts()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-navy-700 text-gray-300 hover:bg-navy-600 transition-all">
            <RefreshCw className="w-4 h-4" /> 刷新预警
          </button>
          <button onClick={() => { if (confirm('确认重置为示例数据？当前数据将被覆盖。')) importData([...mockReceivables], [...mockPayables]); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-navy-700 text-gray-300 hover:bg-navy-600 transition-all">
            <RotateCcw className="w-4 h-4" /> 重置为示例数据
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
        <div onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${parsing ? 'border-ice-500/50 bg-ice-500/5' : 'border-gray-600 hover:border-ice-500/30 hover:bg-navy-700/30'}`}>
          {parsing ? (
            <>
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-ice-400 animate-pulse" />
              <p className="text-ice-400 mb-1">正在解析文件... {progress}%</p>
              <div className="w-48 mx-auto h-1.5 bg-navy-700 rounded-full overflow-hidden mt-3"><div className="h-full bg-ice-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} /></div>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-300 mb-1">拖拽上传或点击选择文件</p>
              <p className="text-xs text-gray-500">支持 CSV、Excel (.xlsx, .xls) 格式</p>
            </>
          )}
        </div>
      </div>

      {confirmData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl p-6 max-w-md w-full animate-fade-in-up">
            <h3 className="text-lg font-medium text-gray-100 mb-4 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-ice-400" /> 导入确认</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between bg-navy-700/50 rounded-lg p-3"><span className="text-gray-300 text-sm">应收账款</span><span className="text-ice-400 font-mono font-medium">{confirmData.receivables.length} 条</span></div>
              <div className="flex items-center justify-between bg-navy-700/50 rounded-lg p-3"><span className="text-gray-300 text-sm">应付账款</span><span className="text-amber-400 font-mono font-medium">{confirmData.payables.length} 条</span></div>
              <div className="flex items-center justify-between bg-navy-700/50 rounded-lg p-3"><span className="text-gray-300 text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-coral-400" /> 异常记录</span><span className="text-coral-400 font-mono font-medium">{confirmData.anomalies} 条</span></div>
              {importing && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1"><span>导入中...</span><span>{progress}%</span></div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden"><div className="h-full bg-ice-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} /></div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmData(null)} disabled={importing} className="px-4 py-2 rounded-lg text-sm bg-navy-700 text-gray-300 hover:bg-navy-600 disabled:opacity-50 transition-all">取消</button>
              <button onClick={handleConfirm} disabled={importing} className="px-4 py-2 rounded-lg text-sm font-medium bg-ice-500 text-navy-900 hover:bg-ice-400 disabled:opacity-50 transition-all flex items-center gap-1.5">
                {importing ? '导入中...' : (<><CheckCircle className="w-4 h-4" /> 确认导入</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-1 mb-4 bg-navy-800 rounded-lg p-1 w-fit">
          <button onClick={() => { setTab('receivable'); setPage(1); }} className={`px-4 py-1.5 rounded-md text-sm transition-all ${tab === 'receivable' ? 'bg-ice-500/20 text-ice-400' : 'text-gray-400 hover:text-gray-300'}`}>应收</button>
          <button onClick={() => { setTab('payable'); setPage(1); }} className={`px-4 py-1.5 rounded-md text-sm transition-all ${tab === 'payable' ? 'bg-ice-500/20 text-ice-400' : 'text-gray-400 hover:text-gray-300'}`}>应付</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-navy-600">
                {tab === 'receivable' ? (
                  <><th className="text-left py-3 px-2">客户名称</th><th className="text-right py-3 px-2">金额</th><th className="text-left py-3 px-2">到期日</th><th className="text-center py-3 px-2">状态</th><th className="text-center py-3 px-2">回款概率</th><th className="text-center py-3 px-2">风险等级</th><th className="text-center py-3 px-2">异常标记</th></>
                ) : (
                  <><th className="text-left py-3 px-2">供应商名称</th><th className="text-right py-3 px-2">金额</th><th className="text-left py-3 px-2">到期日</th><th className="text-center py-3 px-2">状态</th><th className="text-center py-3 px-2">付款压力</th><th className="text-center py-3 px-2">优先级</th></>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={tab === 'receivable' ? 7 : 6} className="py-8 text-center text-gray-500">暂无数据，请导入文件或重置为示例数据</td></tr>
              ) : paged.map((item) => {
                const isAnom = 'isAnomaly' in item && item.isAnomaly;
                return (
                  <tr key={item.id} className={`border-b border-navy-700/50 transition-colors hover:bg-navy-600/30 ${isAnom ? 'bg-coral-500/10 border-l-2 border-l-coral-500' : ''}`}>
                    {tab === 'receivable' ? (
                      <>
                        <td className="py-3 px-2 text-gray-200">{(item as Receivable).customerName}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-200">{formatAmountFull(item.amount)}</td>
                        <td className="py-3 px-2 text-gray-300">{item.dueDate}</td>
                        <td className="py-3 px-2 text-center">{renderStatusBadge(item.status)}</td>
                        <td className="py-3 px-2 text-center"><span className={`font-mono ${(item as Receivable).collectionProbability >= 70 ? 'text-emerald-400' : (item as Receivable).collectionProbability >= 40 ? 'text-amber-500' : 'text-coral-500'}`}>{(item as Receivable).collectionProbability}%</span></td>
                        <td className="py-3 px-2 text-center"><span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${getRiskBg((item as Receivable).riskLevel)} ${getRiskColor((item as Receivable).riskLevel)}`}>{(item as Receivable).riskLevel}</span></td>
                        <td className="py-3 px-2 text-center">
                          {isAnom ? (
                            <div className="relative group inline-block">
                              <AlertTriangle className="w-4 h-4 text-coral-500 mx-auto" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy-800 border border-navy-600 rounded-lg text-xs text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">{(item as Receivable).anomalyReason}</div>
                            </div>
                          ) : <CheckCircle className="w-4 h-4 text-emerald-400/40 mx-auto" />}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-2 text-gray-200">{(item as Payable).supplierName}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-200">{formatAmountFull(item.amount)}</td>
                        <td className="py-3 px-2 text-gray-300">{item.dueDate}</td>
                        <td className="py-3 px-2 text-center">{renderStatusBadge(item.status)}</td>
                        <td className="py-3 px-2 text-center"><span className={`font-mono ${(item as Payable).paymentPressure >= 80 ? 'text-coral-500' : (item as Payable).paymentPressure >= 50 ? 'text-amber-500' : 'text-emerald-400'}`}>{(item as Payable).paymentPressure}%</span></td>
                        <td className="py-3 px-2 text-center"><span className="inline-block px-2 py-0.5 rounded border text-xs font-medium bg-ice-500/10 border-ice-500/30 text-ice-500">P{(item as Payable).priority}</span></td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-700">
          <span className="text-xs text-gray-500">显示 {total === 0 ? 0 : ((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} 共 {total} 条</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded text-xs bg-navy-700 text-gray-300 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> 上一页</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded text-xs bg-navy-700 text-gray-300 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">下一页 <ChevronRight className="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2"><Filter className="w-4 h-4 text-coral-500" /> 异常统计</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(anomalyTypeCount).map(([reason, count]) => (
            <div key={reason} className="bg-navy-800/60 rounded-lg p-3 border border-coral-500/20">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-coral-500" /><span className="text-xs text-coral-400 font-medium">{count} 条</span></div>
              <p className="text-xs text-gray-400">{reason}</p>
            </div>
          ))}
          {Object.keys(anomalyTypeCount).length === 0 && <p className="text-xs text-gray-500">暂无异常记录</p>}
        </div>
      </div>
    </div>
  );
}
