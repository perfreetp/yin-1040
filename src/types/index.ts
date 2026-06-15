export interface Receivable {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'received' | 'overdue';
  collectionProbability: number;
  riskLevel: 'A' | 'B' | 'C' | 'D';
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface Payable {
  id: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  paymentPressure: number;
  priority: number;
}

export interface CashFlowPrediction {
  id: string;
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  gap: number;
  scenario: 'optimistic' | 'neutral' | 'pessimistic';
}

export interface Alert {
  id: string;
  level: 'green' | 'yellow' | 'orange' | 'red';
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  notes: string[];
  relatedEntityId?: string;
}

export interface PredictionVersion {
  id: string;
  name: string;
  lockedAt: string;
  predictions: CashFlowPrediction[];
  actuals: CashFlowPrediction[];
}

export interface SafetyBalance {
  amount: number;
  updatedAt: string;
}

export interface ScenarioSimulation {
  id: string;
  name: string;
  collectionDelayDays: number;
  earlyPurchaseAmount: number;
  adjustedPredictions: CashFlowPrediction[];
}
