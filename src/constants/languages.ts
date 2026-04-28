import type { Language } from "@/types";
 
export const LANGUAGES: { value: Language; label: string; native: string; code: string }[] = [
  { value: "Auto",    label: "Auto Detect", native: "Auto Detect", code: "auto" },
  { value: "English", label: "English",     native: "English",     code: "en"   },
  { value: "Nepali",  label: "Nepali",      native: "नेपाली",      code: "ne"   },
  { value: "Tamang",  label: "Tamang",      native: "तामाङ",       code: "tmg"  },
];
 
export const LANG_CODE: Record<Language, string> = {
  Auto:    "en",   
  English: "en",
  Nepali:  "ne",
  Tamang:  "tmg",
};
// Constants for supported languages and their ISO codes.
