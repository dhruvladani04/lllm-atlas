import { describe, expect, it } from "vitest";
import { distinctDisplayNames, primaryCreator } from "@/lib/format/display-name";

describe("distinctDisplayNames", () => {
  it("leaves a unique name exactly as the registry has it", () => {
    const names = distinctDisplayNames([
      { model_id: "a/x", display_name: "Model X", released_at: "2026-01-02" },
    ]);
    expect(names.get("a/x")).toBe("Model X");
  });

  it("tells two models with one name apart by release month", () => {
    const names = distinctDisplayNames([
      {
        model_id: "openai/gpt-4o-2024-05-13",
        display_name: "GPT-4o",
        released_at: "2024-05-13",
      },
      {
        model_id: "openai/gpt-4o-2024-11-20",
        display_name: "GPT-4o",
        released_at: "2024-11-20",
      },
    ]);
    expect(names.get("openai/gpt-4o-2024-05-13")).toBe("GPT-4o (May 2024)");
    expect(names.get("openai/gpt-4o-2024-11-20")).toBe("GPT-4o (Nov 2024)");
  });

  it("falls back to the id when the month is shared or unknown", () => {
    const names = distinctDisplayNames([
      { model_id: "openai/gpt-4-0314", display_name: "GPT-4", released_at: "2023-03-14" },
      {
        model_id: "openai/gpt-4-32k-0314",
        display_name: "GPT-4",
        released_at: "2023-03-14",
      },
      { model_id: "openai/gpt-4-0613", display_name: "GPT-4", released_at: "2023-06-13" },
      { model_id: "openai/gpt-4-x", display_name: "GPT-4", released_at: null },
    ]);
    expect(names.get("openai/gpt-4-0314")).toBe("GPT-4 (gpt-4-0314)");
    expect(names.get("openai/gpt-4-32k-0314")).toBe("GPT-4 (gpt-4-32k-0314)");
    expect(names.get("openai/gpt-4-0613")).toBe("GPT-4 (Jun 2023)");
    expect(names.get("openai/gpt-4-x")).toBe("GPT-4 (gpt-4-x)");
  });
});

describe("primaryCreator", () => {
  it("takes the first organisation of a joint release", () => {
    expect(primaryCreator("DeepSeek,Peking University")).toBe("DeepSeek");
    expect(primaryCreator("OpenAI")).toBe("OpenAI");
  });
});
