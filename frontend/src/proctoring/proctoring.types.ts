export type ProctoringEventType =
  | 'CAMERA_INTERRUPTED'
  | 'MIC_INTERRUPTED'
  | 'TAB_HIDDEN'
  | 'SECONDARY_CAMERA_DISCONNECTED';

export interface ProctoringEventPayload {
  event_type: ProctoringEventType;
  timestamp: string;
  description: string;
  duration_seconds?: number;
}

export interface SecondaryPairingInfo {
  pairing_url: string;
  expires_at: string;
  token: string;
}

export type PairingStatus = 'idle' | 'waiting' | 'connected' | 'disconnected' | 'error';
