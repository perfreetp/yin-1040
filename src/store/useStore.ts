import { create } from 'zustand';
import type { Receivable, Payable, CashFlowPrediction, Alert, PredictionVersion, SafetyBalance, ScenarioSimulation } from '@/types';
import { mockReceivables, mockPayables, mockPredictions, mockAlerts, mockPredictionVersions } from '@/data/mockData';

interface CashFlowStore {
  receivables: Receivable[];
  payables: Payable[];
  predictions: CashFlowPrediction[];
  alerts: Alert[];
  predictionVersions: PredictionVersion[];
  safetyBalance: SafetyBalance;
  scenarioSimulations: ScenarioSimulation[];
  currentBalance: number;

  addReceivable: (r: Receivable) => void;
  addPayable: (p: Payable) => void;
  setSafetyBalance: (amount: number) => void;
  markAlertRead: (id: string) => void;
  addAlertNote: (alertId: string, note: string) => void;
  lockPredictionVersion: (name: string) => void;
  addScenarioSimulation: (sim: ScenarioSimulation) => void;
  removeScenarioSimulation: (id: string) => void;
  toggleAnomaly: (receivableId: string) => void;
  importData: (receivables: Receivable[], payables: Payable[]) => void;
}

export const useStore = create<CashFlowStore>((set) => ({
  receivables: mockReceivables,
  payables: mockPayables,
  predictions: mockPredictions,
  alerts: mockAlerts,
  predictionVersions: mockPredictionVersions,
  safetyBalance: { amount: 5000000, updatedAt: '2026-06-15' },
  scenarioSimulations: [],
  currentBalance: 12600000,

  addReceivable: (r) => set((s) => ({ receivables: [...s.receivables, r] })),
  addPayable: (p) => set((s) => ({ payables: [...s.payables, p] })),
  setSafetyBalance: (amount) => set({ safetyBalance: { amount, updatedAt: new Date().toISOString().slice(0, 10) } }),
  markAlertRead: (id) => set((s) => ({
    alerts: s.alerts.map((a) => a.id === id ? { ...a, isRead: true } : a),
  })),
  addAlertNote: (alertId, note) => set((s) => ({
    alerts: s.alerts.map((a) => a.id === alertId ? { ...a, notes: [...a.notes, note] } : a),
  })),
  lockPredictionVersion: (name) => set((s) => ({
    predictionVersions: [...s.predictionVersions, {
      id: 'v' + Date.now(),
      name,
      lockedAt: new Date().toLocaleString('zh-CN'),
      predictions: s.predictions.filter((p) => p.scenario === 'neutral'),
      actuals: [],
    }],
  })),
  addScenarioSimulation: (sim) => set((s) => ({
    scenarioSimulations: [...s.scenarioSimulations, sim],
  })),
  removeScenarioSimulation: (id) => set((s) => ({
    scenarioSimulations: s.scenarioSimulations.filter((sim) => sim.id !== id),
  })),
  toggleAnomaly: (receivableId) => set((s) => ({
    receivables: s.receivables.map((r) =>
      r.id === receivableId ? { ...r, isAnomaly: !r.isAnomaly, anomalyReason: r.isAnomaly ? undefined : '人工标记' } : r
    ),
  })),
  importData: (receivables, payables) => set({ receivables, payables }),
}));
