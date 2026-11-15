// node-fs.d.ts — déclaration minimale de `node:fs` pour les tests de
// contrat CSS. Évite d'ajouter `@types/node` au projet (le dépôt n'a que
// les types du DOM) : seul `readFileSync` est utilisé.
declare module "node:fs" {
  export function readFileSync(
    path: string | URL,
    encoding: "utf8",
  ): string;
}
