// layout.pbt.test.ts — propriétés fast-check sur la mise en place du monde 3D.
//
// Les propriétés expresses sont dans `layout.test.ts` ; ici on vérifie
// que les invariants tiennent pour *n'importe quelle* forme de projet
// (arborescences arbitraires), pas seulement pour quelques cas figés.
//
// Invariants prouvés :
//   P1 — deux quartiers distincts ne se chevauchent jamais (planches) ;
//   P2 — chaque fichier du projet a une position (une pile) ;
//   P3 — chaque fichier est rattaché à un dossier existant ;
//   P4 — le nombre de quartiers est préservé et le projet actif est le premier.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  buildMany,
  districtOrigin,
  HUB_MIN_DIST,
  hubDistance,
  type Vec3,
} from "./layout";
import type { ProjectTree } from "./types";

/// Un dossier : chemin + parent (index ou null).
interface GenDir {
  path: string;
  parent: number | null;
}

/// Un fichier : chemin + index de dossier + lignes.
interface GenFile {
  path: string;
  dir: number;
  lines: number;
}

/// Arborescence quelconque : `dirs` dossiers (le premier est la racine),
/// `files` fichiers rattachés à un dossier existant.
function arborescence(dirs: number, files: number): fc.Arbitrary<ProjectTree> {
  const dirArb = fc
    .array(fc.nat({ max: 40 }), { minLength: dirs, maxLength: dirs })
    .map((paths) =>
      paths.map(
        (n, i): GenDir => ({
          path: i === 0 ? "root" : `d${i}`,
          parent: i === 0 ? null : (n % i),
        }),
      ),
    );
  const fileArb = fc
    .array(
      fc.record({
        name: fc.stringMatching(/^[a-z]{1,6}$/),
        dir: fc.nat({ max: Math.max(1, dirs - 1) }),
        lines: fc.nat({ max: 5000 }),
      }),
      { minLength: files, maxLength: files },
    )
    .map((list) =>
      list.map(
        (f, i): GenFile => ({
          path: `${f.name}-${i}.txt`,
          dir: dirs > 1 ? f.dir % dirs : 0,
          lines: f.lines,
        }),
      ),
    );
  return fc
    .tuple(dirArb, fileArb)
    .map(([dirsL, filesL]): ProjectTree => ({
      root: "/root",
      dirs: dirsL.map((d) => ({ path: d.path, parent: d.parent })),
      files: filesL.map((f) => ({ path: f.path, dir: f.dir, lines: f.lines })),
    }));
}

/// Deux rectangles (centre + demi-dimensions) se chevauchent-ils ?
function overlap(a: { x: number; z: number; w: number; d: number }, b: {
  x: number;
  z: number;
  w: number;
  d: number;
}): boolean {
  return (
    Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.z - b.z) < (a.d + b.d) / 2
  );
}

/// Rectangle englobant d'un quartier.
function box(origin: Vec3, w: number, d: number) {
  return { x: origin.x + w / 2, z: origin.z - d / 2, w, d };
}

describe("layout (property-based)", () => {
  it("P1 : deux quartiers ne se chevauchent jamais", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 12 }),
        fc.integer({ min: 0, max: 20 }),
        (n, extra) => {
          const origins: Vec3[] = [];
          for (let i = 0; i < n; i += 1) origins.push(districtOrigin(i));
          for (let i = 0; i < origins.length; i += 1) {
            for (let j = i + 1; j < origins.length; j += 1) {
              const a = box(origins[i], 900 + extra, 1200);
              const b = box(origins[j], 900 + extra, 1200);
              expect(
                overlap(a, b),
                `quartiers ${i} et ${j} se chevauchent (extra=${extra})`,
              ).toBe(false);
            }
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it("P2/P3 : chaque fichier a une position, rattachée à un dossier", () => {
    fc.assert(
      fc.property(arborescence(4, 12), (tree) => {
        const layout = buildMany([
          { name: "a", tree, active: true },
          { name: "b", tree, active: false },
        ]);
        // Chaque fichier du projet actif a une position.
        for (const file of tree.files) {
          expect(
            layout.files.has(file.path),
            `fichier sans position : ${file.path}`,
          ).toBe(true);
        }
        // Chaque position est rattachée à un dossier connu.
        for (const [, box] of layout.files) {
          expect(box.dir).toBeGreaterThanOrEqual(0);
          expect(box.dir).toBeLessThan(layout.dirs.length);
        }
        return true;
      }),
      { numRuns: 40 },
    );
  });

  it("P4 : le monde garde tous les quartiers, le projet actif en premier", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), arborescence(3, 6), (n, tree) => {
        const entries = Array.from({ length: n }, (_, i) => ({
          name: `p${i}`,
          tree,
          active: i === 0,
        }));
        const layout = buildMany(entries);
        expect(layout.projects).toHaveLength(n);
        expect(layout.projects[0].active).toBe(true);
        expect(layout.projects.filter((p) => p.active)).toHaveLength(1);
        return true;
      }),
      { numRuns: 30 },
    );
  });

  it("P5 : la distance du hub ne descend jamais sous le minimum", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
        const tree: ProjectTree = {
          root: "/r",
          dirs: [{ path: "root", parent: null }],
          files: [],
        };
        const layout = buildMany(
          Array.from({ length: n }, (_, i) => ({
            name: `p${i}`,
            tree,
            active: i === 0,
          })),
        );
        expect(hubDistance(layout)).toBeGreaterThanOrEqual(HUB_MIN_DIST);
        return true;
      }),
      { numRuns: 30 },
    );
  });
});
