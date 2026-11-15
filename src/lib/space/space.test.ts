// space.test.ts — contrat CSS du mode 3D : la bulle de l'utilisateur est
// claire (fond blanc), son texte doit rester sombre. Le style scoped de
// `ChatView` impose `--cry-bone` (clair) : sans la règle ci-dessous, le
// texte de l'utilisateur est illisible sur la bulle blanche.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./space.css", import.meta.url), "utf8");

describe("space.css", () => {
  it("force un texte sombre dans la bulle utilisateur du mode 3D", () => {
    const regle =
      /:root\[data-space="on"\][^{]*\.msg\.role-user \.body\s*\{[^}]*color:\s*#050505/;
    expect(css).toMatch(regle);
  });

  it("garde la bulle utilisateur claire", () => {
    const regle = /:root\[data-space="on"\][^{]*\.msg\.role-user\s*\{[^}]*background:\s*var\(--space-fg\)/;
    expect(css).toMatch(regle);
  });
});
