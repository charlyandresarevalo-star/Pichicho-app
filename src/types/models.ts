export type CaseType = 'perdido' | 'encontrado' | 'visto' | 'herido';
export type CaseStatus =
  | 'visto'
  | 'en_seguimiento'
  | 'rescatado'
  | 'transito'
  | 'reunido'
  | 'adopcion'
  | 'cerrado';
export type Urgency = 'baja' | 'media' | 'alta';

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: number;
  helpsCount: number;
}

export interface CaseTags {
  size: 'chico' | 'mediano' | 'grande';
  color?: string;
  collar: boolean;
  behavior?: string;
}

export interface CaseItem {
  id: string;
  caseType: CaseType;
  status: CaseStatus;
  urgency: Urgency;
  description: string;
  tags: CaseTags;
  location: { lat: number; lng: number; geohash?: string };
  neighborhood?: string;
  createdAt: number;
  seenAt?: number;
  createdBy: string;
  currentOwner?: string;
  photos: string[];
}

export interface CommentItem {
  id: string;
  caseId: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface ActionItem {
  id: string;
  caseId: string;
  userId: string;
  type: 'voy' | 'transito' | 'traslado' | 'veterinario' | 'creo_que_es_mio';
  status: 'ofrecido' | 'confirmado' | 'cancelado';
  etaMinutes?: number;
  createdAt: number;
}

export interface ReportItem {
  id: string;
  targetType: 'case' | 'comment';
  targetId: string;
  userId: string;
  reason: string;
  createdAt: number;
}

export interface CaseFilters {
  caseType?: CaseType;
  urgencyOnly?: boolean;
  timeframe: '24h' | '7d';
}
