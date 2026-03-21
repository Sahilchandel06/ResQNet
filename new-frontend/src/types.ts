/* ── Existing UI-only types (kept for mock data compat) ── */

export type Priority = 'Critical' | 'Moderate' | 'Low';
export type Status = 'Pending' | 'Active' | 'Resolved';

export interface SOSIncident {
  id: string;
  title: string;
  location: string;
  coordinates?: [number, number];
  timestamp: string;
  priority: Priority;
  status: Status;
  description: string;
  callerName: string;
  callerPhone: string;
  transcript?: TranscriptLine[];
  aiAnalysis?: AIAnalysis;
}

export interface TranscriptLine {
  speaker: 'Caller' | 'Operator' | 'AI';
  text: string;
  timestamp: string;
}

export interface AIAnalysis {
  type: string;
  priority: Priority;
  reasoning: string;
  suggestedAction: string;
}

export interface Volunteer {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'On-Call' | 'Offline';
  location: string;
  coordinates?: [number, number];
  rating: number;
  completedMissions: number;
  joinDate: string;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'Active' | 'Passed' | 'Failed';
  votesFor: number;
  votesAgainst: number;
  timeLeft?: string;
  author: string;
  category: string;
}

/* ── Backend-aligned types ── */

export interface MlScores {
  confidence: number | null;
  mlCategory: string;
  mlPriority: string;
  geminiCategoryHint: string;
  categoryProbability: Record<string, number>;
  priorityProbability: Record<string, number>;
}

export interface BlockchainData {
  createdLogged: boolean;
  assignedLogged: boolean;
  volunteerReportedLogged: boolean;
  completedLogged: boolean;
  createdTxHash: string;
  assignedTxHash: string;
  volunteerReportedTxHash: string;
  completedTxHash: string;
  contractAddress: string;
  createBlockNumber: number | null;
  assignBlockNumber: number | null;
  volunteerReportedBlockNumber: number | null;
  completeBlockNumber: number | null;
  chainId: number | null;
  lastError: string;
}

export interface AssignedVolunteer {
  name: string;
  wallet: string;
}

export interface VerificationStatus {
  status: string;
  note?: string;
}

export interface SOSRequest {
  _id: string;
  sequenceId: number;
  name: string;
  message: string;
  type: string;
  location: string;
  priority: string;
  suspicious: boolean;
  analysisSummary: string;
  keywords: string[];
  mlScores: MlScores | null;
  status: string;
  role: string;
  finalStatus: string;
  assignedVolunteer?: AssignedVolunteer;
  volunteerVerification?: VerificationStatus;
  adminVerification?: VerificationStatus;
  blockchain?: BlockchainData;
  createdAt: string;
  updatedAt: string;
}

export interface HealthData {
  app: string;
  message: string;
  database: {
    connected: boolean;
    readyState: number;
    name: string | null;
  };
  blockchain: {
    configured: boolean;
    contractAddress: string | null;
  };
  timestamp: string;
}

export interface Web3Status {
  configured: boolean;
  contractAddress: string;
  rewardAmountWei: string | null;
  rpcUrl: string;
}

export interface OnChainSOS {
  reporterName: string;
  reporterWallet: string;
  message: string;
  emergencyType: string;
  priority: string;
  suspicious: boolean;
  status: string;
  volunteerName: string;
  volunteerWallet: string;
  assignedBy: string;
  volunteerReportedStatus: string;
  volunteerNote: string;
  finalizedBy: string;
  adminNote: string;
  createdAt: string;
  assignedAt: string;
  volunteerReportedAt: string;
  completedAt: string;
  rewardPaidWei: string;
  rewardPaidAt: string;
}

export interface OnChainProof {
  sos: OnChainSOS | null;
  message: string;
}

export interface ReputationData {
  available: boolean;
  reputation: string;
  rewardAmountWei: string | null;
  message: string;
}

export type Role = 'user' | 'admin' | 'volunteer';

export interface Session {
  role: Role;
  name: string;
  wallet: string;
}
