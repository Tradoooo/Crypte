//! Commandes Tauri du monde 3D : `space_scan`, `space_projects`.
//!
//! Données DESIGN project-space §9 : le projet actif est le dossier où
//! Crypt est lancé ; les autres projets viennent d'une liste configurable
//! de dossiers de travail (`workspaces`, ex. `~/code`), chaque
//! sous-dossier avec `.git` comptant comme projet. Erreurs en
//! `Result<T, String>` sans secret (convention du dépôt).

use std::path::PathBuf;

use crate::space::scan::{self, ProjectTree};

/// `space_scan` : arbre (dossiers + fichiers + lignes) du projet à
/// dessiner — le dépôt où Crypt tourne, sinon le premier dépôt des
/// `workspaces` (repli si aucun n'est lisible).
#[tauri::command]
pub fn space_scan(workspaces: Vec<String>) -> Result<ProjectTree, String> {
    let root = scan_root(&workspace_paths(&workspaces));
    scan::scan_tree(&root).map_err(|e| format!("space_scan {}: {e}", root.display()))
}

/// `space_projects` : projets connus, l'actif d'abord (DESIGN §9).
/// `active` vide = dossier où Crypt tourne.
#[tauri::command]
pub fn space_projects(active: String, workspaces: Vec<String>) -> Result<Vec<String>, String> {
    let active = if active.trim().is_empty() {
        std::env::current_dir().map_err(|e| format!("space_projects: cwd: {e}"))?
    } else {
        expand_tilde(&active)
    };
    Ok(scan::list_projects(&workspace_paths(&workspaces), &active)
        .iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect())
}

/// Nombre maximal de quartiers dessinés (le projet actif compris).
const MAX_DISTRICTS: usize = 12;

/// `space_districts` : les arbres des projets voisins, l'actif d'abord.
///
/// Sert la vue F7 (« tous vos projets dans une crypte ») : le dépôt où
/// Crypt tourne, puis les dépôts des workspaces (`~/code` par défaut).
/// Chaque quartier est un arbre `ProjectTree` comme `space_scan` ; le
/// nom du projet est son dernier dossier.
#[tauri::command]
pub fn space_districts(workspaces: Vec<String>) -> Result<Vec<ProjectTree>, String> {
    let ws = workspace_paths(&workspaces);
    let active = scan_root(&ws);
    let mut out = Vec::new();
    if let Ok(tree) = scan::scan_tree(&active) {
        out.push(tree);
    }
    for path in scan::list_projects(&ws, &active)
        .into_iter()
        .skip(1)
        .take(MAX_DISTRICTS - 1)
    {
        if let Ok(tree) = scan::scan_tree(&path) {
            out.push(tree);
        }
    }
    Ok(out)
}

/// Dossiers de travail : la liste reçue, sinon `KH_SPACE_WORKSPACES`
/// (séparés par `:`), sinon `~/code` (comme le TUI).
fn workspace_paths(list: &[String]) -> Vec<PathBuf> {
    if !list.is_empty() {
        return paths_of(list);
    }
    if let Ok(v) = std::env::var("KH_SPACE_WORKSPACES") {
        let parts: Vec<PathBuf> = v
            .split(':')
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .collect();
        if !parts.is_empty() {
            return parts;
        }
    }
    home_dir().map(|h| vec![h.join("code")]).unwrap_or_default()
}

/// Dossier personnel (`HOME`, sinon `USERPROFILE` sous Windows).
fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

/// Dossier à scanner : le dépôt où Crypt tourne, sinon le premier dépôt
/// des workspaces (repli : le dossier courant, même sans dépôt git).
fn scan_root(workspaces: &[PathBuf]) -> PathBuf {
    std::env::current_dir()
        .ok()
        .filter(|dir: &PathBuf| dir.is_dir())
        .filter(|dir: &PathBuf| scan::is_project_dir(dir))
        .or_else(|| first_workspace_repo(workspaces))
        .or_else(|| std::env::current_dir().ok().filter(|d| d.is_dir()))
        .unwrap_or_default()
}
/// Premier dépôt git trouvé sous les workspaces (le workspace lui-même
/// compte s'il est un dépôt).
fn first_workspace_repo(workspaces: &[PathBuf]) -> Option<PathBuf> {
    workspaces
        .iter()
        .flat_map(|ws| scan::list_projects(std::slice::from_ref(ws), ws))
        .find(|p| scan::is_project_dir(p))
}

/// `Vec<String>` → `Vec<PathBuf>` (tilde développé).
fn paths_of(list: &[String]) -> Vec<PathBuf> {
    list.iter().map(|s| expand_tilde(s)).collect()
}

/// Développe un `~` ou `~/…` initial en `$HOME` (inchangé sinon).
fn expand_tilde(path: &str) -> PathBuf {
    let rest = match path.strip_prefix('~') {
        Some(rest) => rest.strip_prefix('/').unwrap_or(rest),
        None => return PathBuf::from(path),
    };
    match home_dir() {
        Some(home) => home.join(rest),
        None => PathBuf::from(path),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Répertoire temporaire jetable (unique par nom de test).
    fn temp_root(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("crypte-space-cmds-{name}-{}", std::process::id()));
        std::fs::remove_dir_all(&dir).ok();
        std::fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    #[test]
    fn projects_lists_active_first_then_repos() {
        let ws = temp_root("ws");
        std::fs::create_dir_all(ws.join("alpha/.git")).unwrap();
        std::fs::create_dir_all(ws.join("beta/.git")).unwrap();
        std::fs::create_dir_all(ws.join("pas-un-repo")).unwrap();
        let active = ws.join("alpha");
        let out = space_projects(
            active.to_string_lossy().into_owned(),
            vec![ws.to_string_lossy().into_owned()],
        )
        .expect("space_projects");
        assert_eq!(out.len(), 2);
        assert_eq!(out[0], active.to_string_lossy());
        assert!(out[1].ends_with("beta"));
    }

    #[test]
    fn paths_keep_absolute_and_expand_tilde() {
        assert_eq!(
            paths_of(&["/abs/ws".to_string()]),
            vec![PathBuf::from("/abs/ws")]
        );
        if let Some(home) = std::env::var_os("HOME") {
            let want = PathBuf::from(home).join("code");
            assert_eq!(paths_of(&["~/code".to_string()]), vec![want]);
        }
    }

    #[test]
    fn scan_of_missing_root_fails_cleanly() {
        // `scan_root` ne renvoie jamais de chemin fantôme : si le cwd est
        // un dépôt on scanne le dépôt courant, sinon erreur explicite.
        let root = scan_root(&[]);
        if root.as_os_str().is_empty() {
            assert!(scan::scan_tree(&root).is_err());
        } else {
            assert!(root.is_dir());
        }
    }

    #[test]
    fn districts_active_first_then_workspace_repos() {
        let ws = temp_root("districts-ws");
        for slug in ["alpha", "beta", "gamma"] {
            std::fs::create_dir_all(ws.join(slug).join(".git")).unwrap();
            std::fs::write(ws.join(slug).join("README.md"), "hi\n").unwrap();
        }
        let out = space_districts(vec![ws.to_string_lossy().into_owned()]).expect("districts");
        // L'actif est le premier dépôt du workspace (repli), puis les voisins.
        assert!(out.len() >= 2);
        for tree in out.iter().take(2) {
            assert!(tree.files.iter().any(|f| f.path.ends_with("README.md")));
        }
        // Borne : 12 quartiers au plus (active compris).
        assert!(out.len() <= MAX_DISTRICTS);
    }

    #[test]
    fn workspaces_keep_the_list() {
        let given = vec!["/tmp/a".to_string(), "~/code".to_string()];
        assert_eq!(
            workspace_paths(&given),
            vec![
                PathBuf::from("/tmp/a"),
                home_dir().unwrap_or_default().join("code")
            ]
        );
    }

    #[test]
    fn workspaces_fall_back_without_env() {
        // Sans `KH_SPACE_WORKSPACES` : `~/code` (ou liste vide sans
        // dossier personnel : ni `HOME` ni `USERPROFILE`).
        if std::env::var("KH_SPACE_WORKSPACES").is_ok() {
            return;
        }
        let got = workspace_paths(&[]);
        match home_dir() {
            Some(home) => assert_eq!(got, vec![home.join("code")]),
            None => assert!(got.is_empty()),
        }
    }
}

/// Branche le journal du monde 3D sur l'app (appelé par le frontend au F8).
/// Avant cet appel, `SpaceLog` est désactivé : zéro émission.
#[tauri::command]
pub fn space_attach(
    app: tauri::AppHandle,
    tools: tauri::State<'_, std::sync::Mutex<crate::state::ToolsBackend>>,
) {
    if let Ok(mut t) = tools.lock() {
        t.space = super::events::SpaceLog::from_app(app);
    }
}

/// Coupe le journal (F8 vers l'arrêt).
#[tauri::command]
pub fn space_detach(tools: tauri::State<'_, std::sync::Mutex<crate::state::ToolsBackend>>) {
    if let Ok(mut t) = tools.lock() {
        t.space = super::events::SpaceLog::disabled();
    }
}
