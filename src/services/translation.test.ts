import { describe, it, expect, vi, beforeEach } from "vitest";
import { translate } from "./translation";

vi.stubGlobal("import.meta", {
  env: {
    TMT_API_URL: process.env.TMT_API_URL,
    TMT_API_KEY: process.env.TMT_API_KEY
  }
});

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("navigator", { onLine: true });

describe("Translation Service (Unit Test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully translate valid text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translated_text: "नमस्ते" })
    });

    const result = await translate("Hello", "English", "Nepali");

    expect(result).toEqual({
      sourceLang: "English",
      targetLang: "Nepali",
      sourceText: "Hello",
      translation: "नमस्ते"
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should throw an error for empty text", async () => {
    await expect(translate("   ", "English", "Nepali"))
      .rejects
      .toThrow("Please enter text to translate.");
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle 429 Rate Limit responses properly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({})
    });

    await expect(translate("Too fast", "English", "Nepali"))
      .rejects
      .toThrow("Rate limit exceeded. Please wait a moment.");
  });
});
