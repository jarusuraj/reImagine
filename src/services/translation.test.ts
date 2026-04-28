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
      json: async () => ({ 
        message_type: "SUCCESS",
        output: "नमस्ते" 
      })
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

  it("should successfully translate multiple sentences", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          message_type: "SUCCESS",
          output: "नमस्ते।" 
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          message_type: "SUCCESS",
          output: "कस्तो छ?" 
        })
      });

    const result = await translate("Hello. How are you?", "English", "Nepali");

    expect(result.translation).toBe("नमस्ते। कस्तो छ?");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should throw an error for empty text", async () => {
    await expect(translate("   ", "English", "Nepali"))
      .rejects
      .toThrow("Please enter text to translate.");
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle TMT failure messages properly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message_type: "FAIL",
        message: "Internal model error"
      })
    });

    await expect(translate("Error case", "English", "Nepali"))
      .rejects
      .toThrow("Internal model error");
  });
});
