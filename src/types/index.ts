export type Language = "Auto" | "English" | "Nepali" | "Tamang";

export interface TranslationResult {
  sourceLang:  Language;
  targetLang:  Language;
  sourceText:  string;
  translation: string;
}

export interface HistoryEntry extends TranslationResult {
  id:        string;
  timestamp: number;
}

export interface Settings {
  reImagineApiUrl: string;
  reImagineApiKey: string;
}
// TypeScript interfaces and types used throughout the application.
