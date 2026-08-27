export type DocType = 'paper' | 'patent';

export interface ResearchDocument {
  id: string;
  title: string;
  authors: string;
  year: string;
  summary: string;
  keywords: string[];
  type: DocType;
  fileUrl: string;
  folderPath: string;
  createdAt: string;
  citationCount?: number;
  doi?: string;
  journal?: string;
}

export interface FolderConfig {
  path: string;
  name: string;
  description: string;
}

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  { 
    id: 'gemini-3.7-flash', 
    name: 'Gemini 3.7 Flash', 
    description: '최신 범용 고성능 모델 · 빠르고 정확한 학술 분석',
    badge: '권장'
  },
  { 
    id: 'gemini-3.1-flash-lite', 
    name: 'Gemini 3.1 Flash Lite', 
    description: '초고속 경량화 모델 · 실시간 빠른 추출',
    badge: '초고속'
  },
  { 
    id: 'gemini-3.1-pro-preview', 
    name: 'Gemini 3.1 Pro Preview', 
    description: '심층 복합 추론 · 고난도 STEM 및 특허 청구항 정밀 분석',
    badge: '고성능'
  },
  { 
    id: 'custom', 
    name: '직접 모델명 입력 (Custom)', 
    description: '사용자가 특정 Gemini 모델 ID를 직접 입력하여 호출',
    badge: '사용자 지정'
  }
];
