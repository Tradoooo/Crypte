//! Propriétés du scan (`space/scan.rs`) — property-based testing.
//!
//! Les cas figés sont dans `scan.rs::tests` ; ici on prouve que les
//! invariants tiennent pour **n'importe quelle** arborescence générée :
//!
//! - chaque fichier est rattaché à un dossier existant (`dir` valide) ;
//! - les chemins de fichiers sont uniques et relatifs ;
//! - chaque dossier non racine a un parent existant ;
//! - le scan est déterministe : deux passages donnent le même arbre.

use std::fs;
use std::path::{Path, PathBuf};

use proptest::prelude::*;

use super::scan::scan_tree;

/// Dossier temporaire unique par run (jamais réutilisé entre runs).
fn temp_root(tag: &str, run: u32) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("crypte-pbt-{tag}-{}-{run}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).expect("temp dir");
    dir
}

/// Crée l'arborescence décrite sur le disque (fichiers texte).
fn write_tree(root: &Path, dirs: &[(String, usize)], files: &[(String, usize, String)]) {
    fs::create_dir_all(root).unwrap();
    for (path, _) in dirs {
        fs::create_dir_all(root.join(path)).unwrap();
    }
    for (path, _, body) in files {
        let full = root.join(path);
        fs::create_dir_all(full.parent().unwrap()).unwrap();
        fs::write(full, body).unwrap();
    }
}

/// Stratégie : 1 à 3 dossiers (la racine plus 0 à 2) et 0 à 6 fichiers
/// répartis dans ces dossiers.
/// Dossier du modèle : chemin + index de parent (inutilisé par le scan).
type GenDir = (String, usize);
/// Fichier du modèle : chemin relatif + dossier + corps.
type GenFile = (String, usize, String);

fn arborescence() -> impl Strategy<Value = (Vec<GenDir>, Vec<GenFile>)> {
    let n_dirs = 1usize..4usize;
    let dirs = n_dirs.prop_flat_map(move |n| {
        let names: Vec<String> = (0..n)
            .map(|i| {
                if i == 0 {
                    String::new()
                } else {
                    format!("d{i}")
                }
            })
            .collect();
        Just(names)
    });
    let files = (1usize..4usize).prop_flat_map(|n| {
        proptest::collection::vec(("[a-z]{1,5}", 0..n, "[a-z\n ]{0,20}"), 0..=6)
    });
    (dirs, files).prop_map(|(names, raw)| {
        let dirs: Vec<GenDir> = names.iter().map(|name| (name.clone(), 0)).collect();
        let files: Vec<GenFile> = raw
            .into_iter()
            .enumerate()
            .map(|(k, (stem, dir, body))| {
                let parent = &names[dir.min(names.len() - 1)];
                let rel = if parent.is_empty() {
                    format!("{stem}-{k}.txt")
                } else {
                    format!("{parent}/{stem}-{k}.txt")
                };
                (rel, dir, format!("{body}\n"))
            })
            .collect();
        (dirs, files)
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(24))]

    #[test]
    fn scan_invariants_ne_cassent_jamais(
        run in any::<u32>().no_shrink(),
        (dirs, files) in arborescence(),
    ) {
        let root = temp_root("scan", run);
        write_tree(&root, &dirs, &files);
        let tree = scan_tree(&root).expect("scan");

        // P1 : chaque fichier est rattaché à un dossier existant.
        for file in &tree.files {
            prop_assert!(file.dir < tree.dirs.len(), "dir {} hors arbre", file.dir);
        }

        // P2 : chemins de fichiers uniques et relatifs.
        let mut vus = std::collections::BTreeSet::new();
        for file in &tree.files {
            prop_assert!(vus.insert(file.path.clone()), "doublon {:?}", file.path);
            prop_assert!(file.path.is_relative(), "chemin absolu {:?}", file.path);
        }

        // P3 : tout dossier non racine a un parent existant.
        for (i, dir) in tree.dirs.iter().enumerate() {
            if i == 0 {
                prop_assert!(dir.parent.is_none(), "la racine n'a pas de parent");
            } else {
                let p = dir.parent.expect("parent");
                prop_assert!(p < tree.dirs.len(), "parent {} hors arbre", p);
            }
        }

        // P4 : le scan est déterministe (deux passages = même arbre).
        let again = scan_tree(&root).expect("rescan");
        prop_assert_eq!(&tree, &again);

        let _ = fs::remove_dir_all(&root);
    }
}
