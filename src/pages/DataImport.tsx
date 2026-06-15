import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatAmountFull, getRiskColor, getRiskBg } from '@/data/mockData';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待回款', color: 'bg-ice-500/20 text-ice-400' },
  partial: { label: '部分回款', color: 'bg-amber-500/20 text-amber-400' },
  received: { label: '已回款', color: 'bg-emerald-400/20 text-emerald-400' },
  overdue: { label: '已逾期', color: 'bg-coral-500/20 text-coral-400' },
  paid: { label: '已付款', color: 'bg-emerald-400/20 text-emerald-400' },
};

export default function DataImport() {
  const { receivables, payables } = useStore();
  const [tab, setTab] = useState<'receivable' | 'payable'>('receivable');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const data = tab === 'receivable' ? receivables : payables;
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged = data.slice((page - 1) * pageSize, page * pageSize);

  const anomalies = receivables.filter((r) => r.isAnomaly);
  const anomalyTypeCount = anomalies.reduce<Record<string, number>>((acc, r) => {
    const reason = r.anomalyReason || '未知';
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImported(true);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold gradient-text">数据接入</h1>
        <p className="text-sm text-gray-400 mt-1">导入应收应付数据，AI自动识别异常记录</p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            importing ? 'border-ice-500/50 bg-ice-500/5' : 'border-gray-600 hover:border-ice-500/30'
          }`}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${importing ? 'text-ice-400 animate-bounce' : 'text-gray-500'}`} />
          <p className="text-gray-300 mb-1">拖拽上传或点击选择文件</p>
          <p className="text-xs text-gray-500">支持 CSV、Excel (.xlsx) 格式</p>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={importing}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              importing
                ? 'bg-ice-500/20 text-ice-400 cursor-wait'
                : 'bg-ice-500 text-navy-900 hover:bg-ice-400'
            }`}
          >
            {importing ? '导入中...' : '开始导入'}
          </button>
          {imported && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm animate-fade-in-up">
              <CheckCircle className="w-4 h-4" /> 导入完成
            </span>
          )}
          {importing && (
            <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
              <div className="h-full bg-ice-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-1 mb-4 bg-navy-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => { setTab('receivable'); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm transition-all ${
              tab === 'receivable' ? 'bg-ice-500/20 text-ice-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            应收
          </button>
          <button
            onClick={() => { setTab('payable'); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm transition-all ${
              tab === 'payable' ? 'bg-ice-500/20 text-ice-400' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            应付
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-navy-600">
                {tab === 'receivable' ? (
                  <>
                    <th className="text-left py-3 px-2">客户名称</th>
                    <th className="text-right py-3 px-2">金额</th>
                    <th className="text-left py-3 px-2">到期日</th>
                    <th className="text-center py-3 px-2">状态</th>
                    <th className="text-center py-3 px-2">回款概率</th>
                    <th className="text-center py-3 px-2">风险等级</th>
                    <th className="text-center py-3 px-2">异常标记</th>
                  </>
                ) : (
                  <>
                    <th className="text-left py-3 px-2">供应商名称</th>
                    <th className="text-right py-3 px-2">金额</th>
                    <th className="text-left py-3 px-2">到期日</th>
                    <th className="text-center py-3 px-2">状态</th>
                    <th className="text-center py-3 px-2">付款压力</th>
                    <th className="text-center py-3 px-2">优先级</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const isAnom = 'isAnomaly' in item && item.isAnomaly;
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-navy-700/50 transition-colors hover:bg-navy-600/30 ${
                      isAnom ? 'bg-coral-500/10 border-l-2 border-l-coral-500' : ''
                    }`}
                  >
                    {tab === 'receivable' ? (
                      <>
                        <td className="py-3 px-2 text-gray-200">{(item as typeof receivables[0]).customerName}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-200">{formatAmountFull(item.amount)}</td>
                        <td className="py-3 px-2 text-gray-300">{item.dueDate}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusMap[item.status]?.color}`}>
                            {statusMap[item.status]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono ${(item as typeof receivables[0]).collectionProbability >= 70 ? 'text-emerald-400' : (item as typeof receivables[0]).collectionProbability >= 40 ? 'text-amber-500' : 'text-coral-500'}`}>
                            {(item as typeof receivables[0]).collectionProbability}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${getRiskBg((item as typeof receivables[0]).riskLevel)} ${getRiskColor((item as typeof receivables[0]).riskLevel)}`}>
                            {(item as typeof receivables[0]).riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {isAnom ? (
                            <div className="relative group inline-block">
                              <AlertTriangle className="w-4 h-4 text-coral-500 mx-auto" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy-800 border border-navy-600 rounded-lg text-xs text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {(item as typeof receivables[0]).anomalyReason}
                              </div>
                            </div>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400/40 mx-auto" />
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-2 text-gray-200">{(item as typeof payables[0]).supplierName}</td>
                        <td className="py-3 px-2 text-right font-mono text-gray-200">{formatAmountFull(item.amount)}</td>
                        <td className="py-3 px-2 text-gray-300">{item.dueDate}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${statusMap[item.status]?.color}`}>
                            {statusMap[item.status]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`font-mono ${(item as typeof payables[0]).paymentPressure >= 80 ? 'text-coral-500' : (item as typeof payables[0]).paymentPressure >= 50 ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {(item as typeof payables[0]).paymentPressure}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="inline-block px-2 py-0.5 rounded border text-xs font-medium bg-ice-500/10 border-ice-500/30 text-ice-500">
                            P{(item as typeof payables[0]).priority}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-700">
          <span className="text-xs text-gray-500">
            显示 {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} 共 {total} 条
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded text-xs bg-navy-700 text-gray-300 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >上一页</button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded text-xs bg-navy-700 text-gray-300 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >下一页</button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Filter className="w-4 h-4 text-coral-500" /> 异常统计
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(anomalyTypeCount).map(([reason, count]) => (
            <div key={reason} className="bg-navy-800/60 rounded-lg p-3 border border-coral-500/20">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-coral-500" />
                <span className="text-xs text-coral-400 font-medium">{count} 条</span>
              </div>
              <p className="text-xs text-gray-400">{reason}</p>
            </div>
          ))}
          {Object.keys(anomalyTypeCount).length === 0 && (
            <p className="text-xs text-gray-500">暂无异常记录</p>
          )}
        </div>
      </div>
    </div>
  );
}
