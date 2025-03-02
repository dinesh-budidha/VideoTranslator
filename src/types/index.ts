
export interface Language {
  code: string;
  name: string;
}

export interface TranslationState {
  sourceLanguage: Language | null;
  targetLanguage: Language | null;
  videoFile: File | null;
  stage: string;
  progress: number;
  transcription: string | null;
  translation: string | null;
  translatedVideoUrl: string | null;
  error: string | null;
}

export interface StageInfo {
  title: string;
  description: string;
}

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
}
