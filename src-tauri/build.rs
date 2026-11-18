fn main() {
    // Windows : le binaire de test importe `comctl32!TaskDialogIndirect`
    // (apporté par Tauri). Le `comctl32.dll` du système est la v5 : cet
    // export n'existe que dans l'assembly side-by-side v6, chargée d'après
    // le manifeste Common-Controls v6. Le binaire de l'application a ce
    // manifeste (tauri-build) ; le harnais de test, non -> il meurt avec
    // STATUS_ENTRYPOINT_NOT_FOUND avant le premier test. On charge donc
    // comctl32 en différé : le manifeste v6 s'applique toujours au
    // chargement, et les tests n'ouvrent aucune boîte de dialogue.
    #[cfg(target_os = "windows")]
    {
        println!("cargo:rustc-link-arg=/DELAYLOAD:comctl32.dll");
        println!("cargo:rustc-link-lib=delayimp");
    }
    tauri_build::build()
}
