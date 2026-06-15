export type ReceivableStatus = 'pending' | 'partial' | 'received' | 'overdue';
export type PayableStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type RiskLevel = 'A' | 'B' | 'C' | 'D';
export type Scenario = 'optimistic' | 'neutral' | 'pessimistic';
export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red';
export type AlertType = 'funding_gap' | 'customer_overdue' | 'supplier_pressure' | 'anomaly';

export interface Receivable {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string;
  status: ReceivableStatus;
  collectionProbability: number;
  riskLevel: RiskLevel;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface Payable {
  id: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  status: PayableStatus;
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
  scenario: Scenario;
}

export interface ActualResult {
  month: string;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  notes: string[];
  relatedEntityId?: string;
  relatedEntityType?: 'receivable' | 'payable' | 'prediction';
}

export interface PredictionVersion {
  id: string;
  name: string;
  lockedAt: string;
  predictions: CashFlowPrediction[];
  actuals: ActualResult[];
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

export interface PersistedState {
  receivables: Receivable[];
  payables: Payable[];
  predictions: CashFlowPrediction[];
  alerts: Alert[];
  predictionVersions: PredictionVersion[];
  safetyBalance: SafetyBalance;
  scenarioSimulations: ScenarioSimulation[];
  currentBalance: number;
}
