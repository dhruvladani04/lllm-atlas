import { describe, expect, it } from "vitest";
import { capabilityLabel, languageLabel } from "@/lib/format/labels";

describe("category labels", () => {
  it("writes a capability slug as words", () => {
    expect(capabilityLabel("agentic-tool-use")).toBe("Agentic tool use");
    expect(capabilityLabel("long-context")).toBe("Long context");
    expect(capabilityLabel("safety-alignment")).toBe("Safety and alignment");
  });

  it("uses the real name where a rule would produce a wrong one", () => {
    expect(languageLabel("c-plus-plus")).toBe("C++");
    expect(languageLabel("c-sharp")).toBe("C#");
    expect(languageLabel("javascript")).toBe("JavaScript");
    expect(languageLabel("english")).toBe("English");
  });
});
