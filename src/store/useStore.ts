import { create } from 'zustand';
import type {
  Receivable, Payable, CashFlowPrediction, Alert, PredictionVersion,
  SafetyBalance, ScenarioSimulation, ActualResult, AlertLevel, RiskLevel, Scenario,
  FilterScope, AlertHandlingStatus,
} from '@/types';
import { mockReceivables, mockPayables, mockPredictions, mockAlerts, mockPredictionVersions } from '@/data/mockData';

const STORAGE_KEY = 'cashflow-ai-store-v1';

const defaultSafetyBalance: SafetyBalance = { amount: 5000000, updatedAt: '2026-06-15' };

function loadFromStorage(): Partial<{
  receivables: Receivable[];
  payables: Payable[];
  predictions: CashFlowPrediction[];
  alerts: Alert[];
  predictionVersions: PredictionVersion[];
  safetyBalance: SafetyBalance;
  scenarioSimulations: ScenarioSimulation[];
  currentBalance: number;
}> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(state: any) {
  try {
    const toSave = {
      receivables: state.receivables,
      payables: state.payables,
      predictions: state.predictions,
      alerts: state.alerts,
      predictionVersions: state.predictionVersions,
      safetyBalance: state.safetyBalance,
      scenarioSimulations: state.scenarioSimulations,
      currentBalance: state.currentBalance,
      activeFilter: state.activeFilter,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

function uuid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d1 - d2) / 86400000);
}

function detectAnomalies(receivables: Receivable[]): Receivable[] {
  if (receivables.length === 0) return [];
  const amounts = receivables.map((r) => r.amount).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)] || 0;
  const today = new Date().toISOString().slice(0, 10);
  const seen: Record<string, number> = {};
  receivables.forEach((r) => {
    const key = r.customerName + '|' + r.amount + '|' + r.dueDate;
    seen[key] = (seen[key] || 0) + 1;
  });
  return receivables.map((r) => {
    let isAnomaly = false;
    let reason: string | undefined;
    if (r.status === 'overdue') {
      const days = daysBetween(today, r.dueDate);
      if (days > 0) {
        isAnomaly = true;
        reason = `已逾期${days}天未回款`;
      }
    }
    if (median > 0 && r.amount > median * 2.5) {
      isAnomaly = true;
      reason = `金额异常：超出中位数250%`;
    }
    if (median > 0 && r.amount < median * 0.05 && r.amount > 0) {
      isAnomaly = true;
      reason = `金额异常：远低于均值`;
    }
    const key = r.customerName + '|' + r.amount + '|' + r.dueDate;
    if ((seen[key] || 0) > 1) {
      isAnomaly = true;
      reason = '疑似重复记录';
    }
    const d = new Date(r.dueDate);
    if (isNaN(d.getTime())) {
      isAnomaly = true;
      reason = '日期格式异常';
    }
    return { ...r, isAnomaly, anomalyReason: reason };
  });
}

function computeRiskLevel(amount: number, overdueDays: number, historicalPayment: number): RiskLevel {
  if (overdueDays > 30 || historicalPayment < 40) return 'D';
  if (overdueDays > 10 || historicalPayment < 60) return 'C';
  if (overdueDays > 0 || historicalPayment < 80) return 'B';
  return 'A';
}

function computeCollectionProbability(riskLevel: RiskLevel, overdueDays: number): number {
  const base: Record<RiskLevel, number> = { A: 92, B: 72, C: 50, D: 30 };
  return Math.max(5, Math.min(98, base[riskLevel] - Math.floor(overdueDays / 5) * 3));
}

function computePaymentPressure(amount: number, totalOutflow: number, dueDays: number): number {
  const share = totalOutflow > 0 ? (amount / totalOutflow) * 100 : 0;
  const urgency = dueDays < 0 ? 40 : Math.max(0, 30 - dueDays);
  return Math.round(Math.min(100, share * 0.6 + urgency * 1.5));
}

function generatePredictions(receivables: Receivable[], payables: Payable[]): CashFlowPrediction[] {
  const today = new Date();
  const results: CashFlowPrediction[] = [];
  const baseMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const scenarios: Scenario[] = ['optimistic', 'neutral', 'pessimistic'];
  const scenarioMultipliers: Record<Scenario, { inflow: number; outflow: number }> = {
    optimistic: { inflow: 1.15, outflow: 0.95 },
    neutral: { inflow: 1.0, outflow: 1.0 },
    pessimistic: { inflow: 0.78, outflow: 1.08 },
  };

  scenarios.forEach((scenario) => {
    for (let i = 0; i < 6; i++) {
      const d = new Date(baseMonth);
      d.setMonth(d.getMonth() + i);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      let rawInflow = 0;
      receivables.forEach((r) => {
        if (r.status === 'received') return;
        const due = new Date(r.dueDate);
        if (due >= monthStart && due <= monthEnd) {
          rawInflow += r.amount * (r.collectionProbability / 100);
        }
      });

      let rawOutflow = 0;
      payables.forEach((p) => {
        if (p.status === 'paid') return;
        const due = new Date(p.dueDate);
        if (due >= monthStart && due <= monthEnd) {
          rawOutflow += p.amount;
        }
      });

      const mult = scenarioMultipliers[scenario];
      const inflow = Math.round(rawInflow * mult.inflow);
      const outflow = Math.round(rawOutflow * mult.outflow);
      const netFlow = inflow - outflow;
      results.push({
        id: `cf-${scenario}-${i}`,
        month: monthStr,
        inflow,
        outflow,
        netFlow,
        gap: netFlow < 0 ? -netFlow : 0,
        scenario,
      });
    }
  });

  return results;
}

function generateAlerts(
  receivables: Receivable[],
  payables: Payable[],
  predictions: CashFlowPrediction[],
  safetyAmount: number,
  existingAlerts: Alert[],
  currentBalance: number
): Alert[] {
  const existingMap: Record<string, Alert> = {};
  existingAlerts.forEach((a) => {
    existingMap[`${a.type}|${a.relatedEntityId || ''}|${a.title}`] = a;
  });

  const alerts: Alert[] = existingAlerts.filter(
    (a) => a.type !== 'balance_safety' && !a.archived
  ).map((a) => ({ ...a }));
  const today = new Date().toISOString().slice(0, 10);
  const ts = today + ' ' + new Date().toTimeString().slice(0, 5);

  const pushOrUpdate = (key: string, newAlert: Alert) => {
    const existing = existingMap[key];
    if (existing) {
      alerts.push(existing);
    } else {
      alerts.push({ ...newAlert, handlingStatus: 'unhandled', archived: false });
    }
  };

  if (currentBalance < safetyAmount) {
    const deficit = safetyAmount - currentBalance;
    const pct = ((deficit / safetyAmount) * 100).toFixed(1);
    const level: AlertLevel = deficit >= safetyAmount * 0.5 ? 'red' : deficit >= safetyAmount * 0.2 ? 'orange' : 'yellow';
    const key = 'balance_safety||当前资金低于安全余额';
    pushOrUpdate(key, {
      id: 'alert-balance-safety',
      type: 'balance_safety',
      level,
      title: '当前资金低于安全余额',
      description: `当前可用资金¥${(currentBalance / 10000).toFixed(1)}万，低于安全余额线¥${(safetyAmount / 10000).toFixed(1)}万，缺口${pct}%，请尽快安排资金`,
      createdAt: ts,
      isRead: false,
      notes: [],
      handlingStatus: 'unhandled',
      archived: false,
    });
  }

  predictions.filter((p) => p.scenario === 'neutral').forEach((p) => {
    if (p.gap > 0) {
      const level: AlertLevel = p.gap >= safetyAmount * 0.5 ? 'red' : p.gap >= safetyAmount * 0.2 ? 'orange' : 'yellow';
      const key = `funding_gap|${p.id}|${p.month}资金缺口`;
      pushOrUpdate(key, {
        id: uuid(),
        type: 'funding_gap',
        level,
        title: `${p.month.slice(5)}月资金缺口预警`,
        description: `预计缺口¥${(p.gap / 10000).toFixed(1)}万，${p.gap >= safetyAmount ? '已超过安全余额线' : '接近安全余额线'}，请提前安排资金调度`,
        createdAt: ts,
        isRead: false,
        notes: [],
        handlingStatus: 'unhandled',
        archived: false,
        relatedEntityId: p.id,
        relatedEntityType: 'prediction',
      });
    }
  });

  receivables.forEach((r) => {
    if (r.status === 'overdue' || r.isAnomaly) {
      const overdueDays = Math.max(0, daysBetween(today, r.dueDate));
      const level: AlertLevel = overdueDays > 30 ? 'red' : overdueDays > 10 ? 'orange' : 'yellow';
      const key = `customer_overdue|${r.id}|${r.customerName}`;
      pushOrUpdate(key, {
        id: uuid(),
        type: 'customer_overdue',
        level,
        title: `${r.customerName} 回款风险`,
        description: `应收¥${(r.amount / 10000).toFixed(1)}万，${overdueDays > 0 ? `已逾期${overdueDays}天，` : ''}回款概率${r.collectionProbability}%，风险等级${r.riskLevel}`,
        createdAt: ts,
        isRead: false,
        notes: [],
        handlingStatus: 'unhandled',
        archived: false,
        relatedEntityId: r.id,
        relatedEntityType: 'receivable',
      });
    }
  });

  payables.forEach((p) => {
    if (p.paymentPressure >= 70 || p.status === 'overdue') {
      const level: AlertLevel = p.paymentPressure >= 90 || p.status === 'overdue' ? 'orange' : 'yellow';
      const key = `supplier_pressure|${p.id}|${p.supplierName}`;
      pushOrUpdate(key, {
        id: uuid(),
        type: 'supplier_pressure',
        level,
        title: `${p.supplierName} 付款压力高`,
        description: `应付¥${(p.amount / 10000).toFixed(1)}万，付款压力指数${p.paymentPressure}%${p.status === 'overdue' ? '，已逾期' : ''}，建议优先安排`,
        createdAt: ts,
        isRead: false,
        notes: [],
        handlingStatus: 'unhandled',
        archived: false,
        relatedEntityId: p.id,
        relatedEntityType: 'payable',
      });
    }
  });

  return alerts.slice(0, 50);
}

interface CashFlowStore {
  receivables: Receivable[];
  payables: Payable[];
  predictions: CashFlowPrediction[];
  alerts: Alert[];
  predictionVersions: PredictionVersion[];
  safetyBalance: SafetyBalance;
  scenarioSimulations: ScenarioSimulation[];
  currentBalance: number;
  activeFilter: FilterScope | null;
  initialized: boolean;

  addReceivable: (r: Receivable) => void;
  addPayable: (p: Payable) => void;
  setSafetyBalance: (amount: number) => void;
  markAlertRead: (id: string, read?: boolean) => void;
  markAllAlertsRead: () => void;
  addAlertNote: (alertId: string, note: string) => void;
  lockPredictionVersion: (name: string) => void;
  addScenarioSimulation: (sim: ScenarioSimulation) => void;
  removeScenarioSimulation: (id: string) => void;
  toggleAnomaly: (receivableId: string) => void;
  importData: (receivables: Receivable[], payables: Payable[]) => void;
  setActualForVersion: (versionId: string, actual: ActualResult) => void;
  refreshAlerts: () => void;
  regeneratePredictions: () => void;
  setCurrentBalance: (amount: number) => void;
  setActiveFilter: (filter: FilterScope | null) => void;
  clearActiveFilter: () => void;
  setAlertHandlingStatus: (id: string, status: AlertHandlingStatus) => void;
  archiveAlert: (id: string) => void;
  unarchiveAlert: (id: string) => void;
  resolveAlert: (id: string) => void;
}

const persisted = loadFromStorage();

const initialReceivables = persisted?.receivables ?? mockReceivables;
const initialPayables = persisted?.payables ?? mockPayables;
const initialPredictions = persisted?.predictions ?? mockPredictions;
const initialAlerts = persisted?.alerts ?? mockAlerts.map((a) => ({
  ...a,
  handlingStatus: a.isRead ? 'read' : 'unhandled',
  archived: false,
  archivedAt: undefined,
}) as Alert);

export const useStore = create<CashFlowStore>((set, get) => ({
  receivables: initialReceivables,
  payables: initialPayables,
  predictions: initialPredictions,
  alerts: initialAlerts,
  predictionVersions: persisted?.predictionVersions ?? mockPredictionVersions,
  safetyBalance: persisted?.safetyBalance ?? defaultSafetyBalance,
  scenarioSimulations: persisted?.scenarioSimulations ?? [],
  currentBalance: persisted?.currentBalance ?? 12600000,
  activeFilter: (persisted as any)?.activeFilter ?? null,
  initialized: true,

  addReceivable: (r) => {
    set((s) => {
      const newReceivables = detectAnomalies([...s.receivables, r]);
      const newPredictions = generatePredictions(newReceivables, s.payables);
      const newAlerts = generateAlerts(newReceivables, s.payables, newPredictions, s.safetyBalance.amount, s.alerts, s.currentBalance);
      const next = { ...s, receivables: newReceivables, predictions: newPredictions, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  addPayable: (p) => {
    set((s) => {
      const totalOutflow = s.payables.reduce((sum, x) => sum + x.amount, 0) + p.amount;
      const today = new Date().toISOString().slice(0, 10);
      const pWithPressure = {
        ...p,
        paymentPressure: computePaymentPressure(p.amount, totalOutflow, daysBetween(p.dueDate, today)),
      };
      const newPayables = [...s.payables, pWithPressure].sort((a, b) => a.priority - b.priority);
      const newPredictions = generatePredictions(s.receivables, newPayables);
      const newAlerts = generateAlerts(s.receivables, newPayables, newPredictions, s.safetyBalance.amount, s.alerts, s.currentBalance);
      const next = { ...s, payables: newPayables, predictions: newPredictions, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  setSafetyBalance: (amount) => {
    set((s) => {
      const safety = { amount, updatedAt: new Date().toISOString().slice(0, 10) };
      const newAlerts = generateAlerts(s.receivables, s.payables, s.predictions, amount, s.alerts, s.currentBalance);
      const next = { ...s, safetyBalance: safety, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  markAlertRead: (id, read = true) => {
    set((s) => {
      const next = {
        ...s,
        alerts: s.alerts.map((a) => {
          if (a.id !== id) return a;
          const hs: AlertHandlingStatus = read
            ? a.notes.length ? 'noted' : 'read'
            : 'unhandled';
          return { ...a, isRead: read, handlingStatus: hs };
        }),
      };
      saveToStorage(next);
      return next;
    });
  },

  markAllAlertsRead: () => {
    set((s) => {
      const next = {
        ...s,
        alerts: s.alerts.map((a) => {
          if (a.isRead) return a;
          const hs: AlertHandlingStatus = a.notes.length ? 'noted' : 'read';
          return { ...a, isRead: true, handlingStatus: hs };
        }),
      };
      saveToStorage(next);
      return next;
    });
  },

  addAlertNote: (alertId, note) => {
    set((s) => {
      const hs: AlertHandlingStatus = 'noted';
      const next = {
        ...s,
        alerts: s.alerts.map((a) => a.id === alertId ? {
          ...a, notes: [...a.notes, note], handlingStatus: hs,
        } : a),
      };
      saveToStorage(next);
      return next;
    });
  },

  lockPredictionVersion: (name) => {
    set((s) => {
      const next = {
        ...s,
        predictionVersions: [...s.predictionVersions, {
          id: uuid(),
          name,
          lockedAt: new Date().toLocaleString('zh-CN'),
          predictions: s.predictions.filter((p) => p.scenario === 'neutral'),
          actuals: [],
        }],
      };
      saveToStorage(next);
      return next;
    });
  },

  addScenarioSimulation: (sim) => {
    set((s) => {
      const next = { ...s, scenarioSimulations: [...s.scenarioSimulations, sim] };
      saveToStorage(next);
      return next;
    });
  },

  removeScenarioSimulation: (id) => {
    set((s) => {
      const next = { ...s, scenarioSimulations: s.scenarioSimulations.filter((sim) => sim.id !== id) };
      saveToStorage(next);
      return next;
    });
  },

  toggleAnomaly: (receivableId) => {
    set((s) => {
      const newReceivables = s.receivables.map((r) =>
        r.id === receivableId ? { ...r, isAnomaly: !r.isAnomaly, anomalyReason: r.isAnomaly ? undefined : '人工标记' } : r
      );
      const newAlerts = generateAlerts(newReceivables, s.payables, s.predictions, s.safetyBalance.amount, s.alerts, s.currentBalance);
      const next = { ...s, receivables: newReceivables, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  importData: (receivablesInput, payablesInput) => {
    set((s) => {
      const today = new Date().toISOString().slice(0, 10);
      const enrichedReceivables = detectAnomalies(
        receivablesInput.map((r) => {
          const overdueDays = Math.max(0, daysBetween(today, r.dueDate));
          const risk = r.riskLevel || computeRiskLevel(r.amount, overdueDays, r.collectionProbability || 80);
          return {
            ...r,
            id: r.id || uuid(),
            riskLevel: risk,
            collectionProbability: r.collectionProbability || computeCollectionProbability(risk, overdueDays),
            status: r.status || (overdueDays > 0 ? 'overdue' : 'pending'),
          };
        })
      );

      const totalOutflow = payablesInput.reduce((sum, x) => sum + x.amount, 0);
      const enrichedPayables = payablesInput
        .map((p, idx) => {
          const dueDays = daysBetween(p.dueDate, today);
          const overdueDays = Math.max(0, -dueDays);
          return {
            ...p,
            id: p.id || uuid(),
            paymentPressure: p.paymentPressure || computePaymentPressure(p.amount, totalOutflow, dueDays),
            priority: p.priority || (idx + 1),
            status: p.status || (overdueDays > 0 ? 'overdue' : 'pending'),
          };
        })
        .sort((a, b) => {
          if (a.status === 'overdue' && b.status !== 'overdue') return -1;
          if (b.status === 'overdue' && a.status !== 'overdue') return 1;
          return a.priority - b.priority;
        });

      const newPredictions = generatePredictions(enrichedReceivables, enrichedPayables);
      const newAlerts = generateAlerts(enrichedReceivables, enrichedPayables, newPredictions, s.safetyBalance.amount, [], s.currentBalance);
      const next = {
        ...s,
        receivables: enrichedReceivables,
        payables: enrichedPayables,
        predictions: newPredictions,
        alerts: newAlerts,
      };
      saveToStorage(next);
      return next;
    });
  },

  setActualForVersion: (versionId, actual) => {
    set((s) => {
      const next = {
        ...s,
        predictionVersions: s.predictionVersions.map((v) => {
          if (v.id !== versionId) return v;
          const existing = v.actuals.findIndex((a) => a.month === actual.month);
          const newActuals = existing >= 0
            ? v.actuals.map((a, i) => i === existing ? actual : a)
            : [...v.actuals, actual];
          return { ...v, actuals: newActuals };
        }),
      };
      saveToStorage(next);
      return next;
    });
  },

  refreshAlerts: () => {
    set((s) => {
      const next = { ...s, alerts: generateAlerts(s.receivables, s.payables, s.predictions, s.safetyBalance.amount, s.alerts, s.currentBalance) };
      saveToStorage(next);
      return next;
    });
  },

  regeneratePredictions: () => {
    set((s) => {
      const newPredictions = generatePredictions(s.receivables, s.payables);
      const newAlerts = generateAlerts(s.receivables, s.payables, newPredictions, s.safetyBalance.amount, s.alerts, s.currentBalance);
      const next = { ...s, predictions: newPredictions, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  setCurrentBalance: (amount) => {
    set((s) => {
      const newAlerts = generateAlerts(s.receivables, s.payables, s.predictions, s.safetyBalance.amount, s.alerts, amount);
      const next = { ...s, currentBalance: amount, alerts: newAlerts };
      saveToStorage(next);
      return next;
    });
  },

  setActiveFilter: (filter) => {
    set((s) => { const next = { ...s, activeFilter: filter }; saveToStorage(next); return next; });
  },

  clearActiveFilter: () => {
    set((s) => { const next = { ...s, activeFilter: null }; saveToStorage(next); return next; });
  },

  setAlertHandlingStatus: (id, status) => {
    set((s) => {
      const next = { ...s, alerts: s.alerts.map((a) => a.id === id ? { ...a, handlingStatus: status, isRead: status !== 'unhandled' } : a) };
      saveToStorage(next);
      return next;
    });
  },

  archiveAlert: (id) => {
    set((s) => {
      const ts = new Date().toLocaleString('zh-CN');
      const hs: AlertHandlingStatus = 'archived';
      const next = {
        ...s,
        alerts: s.alerts.map((a) => a.id === id
          ? { ...a, archived: true, archivedAt: ts, handlingStatus: hs }
          : a),
      };
      saveToStorage(next);
      return next;
    });
  },

  unarchiveAlert: (id) => {
    set((s) => {
      const hs: AlertHandlingStatus = 'read';
      const next = {
        ...s,
        alerts: s.alerts.map((a) => a.id === id
          ? { ...a, archived: false, archivedAt: undefined, handlingStatus: hs }
          : a),
      };
      saveToStorage(next);
      return next;
    });
  },

  resolveAlert: (id) => {
    set((s) => {
      const hs: AlertHandlingStatus = 'resolved';
      const next = { ...s, alerts: s.alerts.map((a) => a.id === id ? { ...a, handlingStatus: hs, isRead: true } : a) };
      saveToStorage(next);
      return next;
    });
  },
}));

export { detectAnomalies, generatePredictions, generateAlerts, computeRiskLevel, computeCollectionProbability, computePaymentPressure };
