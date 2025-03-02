
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'vi', name: 'Vietnamese' },
];

// Use Supabase edge functions instead of external API endpoints
export const API_ENDPOINTS = {
  UPLOAD: '/api/upload-video',
  TRANSLATE: '/api/process-video',
};

export const STAGES = {
  UPLOAD: 'upload',
  TRANSCRIBING: 'transcribing',
  TRANSLATING: 'translating',
  GENERATING_AUDIO: 'generating_audio',
  PROCESSING_VIDEO: 'processing_video',
  COMPLETED: 'completed',
};

export const STAGE_INFO = {
  [STAGES.UPLOAD]: {
    title: 'Upload Video',
    description: 'Select a video file to upload and translate',
  },
  [STAGES.TRANSCRIBING]: {
    title: 'Transcribing',
    description: 'Converting speech to text using AI...',
  },
  [STAGES.TRANSLATING]: {
    title: 'Translating',
    description: 'Translating the text to your selected language...',
  },
  [STAGES.GENERATING_AUDIO]: {
    title: 'Generating Audio',
    description: 'Converting translated text to speech...',
  },
  [STAGES.PROCESSING_VIDEO]: {
    title: 'Processing Video',
    description: 'Synchronizing the translated audio with the video...',
  },
  [STAGES.COMPLETED]: {
    title: 'Translation Complete',
    description: 'Your video is ready to play with translated audio',
  },
};

export const ACCEPTED_FILE_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
