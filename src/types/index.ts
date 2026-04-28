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
  tmtApiUrl: string;
  tmtApiKey: string;
}
