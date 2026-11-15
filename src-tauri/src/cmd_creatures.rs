//! Commandes créatures §7 (partiel, `commands.md`) : get par slug.
//!
//! `apparition_state`/`spook` (tranche fun, `apparition.rs`/`fx.rs`) ne
//! sont pas ici.

use crate::core::Core;
use crate::creatures;
use crate::dto::CreatureDto;

impl Core {
    /// `creature_get` : créature par slug (créatures + Kiro), grille 32×32.
    pub fn creature_get(&self, slug: String) -> Result<CreatureDto, String> {
        creatures::find(slug.trim())
            .map(dto_of)
            .ok_or_else(|| format!("unknown creature: {slug}"))
    }
}

/// DTO complet d'une créature.
fn dto_of(creature: &creatures::Creature) -> CreatureDto {
    CreatureDto {
        slug: creature.slug.to_string(),
        name: creature.name.to_string(),
        lore: creature.lore.to_string(),
        grid: creature.grid(),
    }
}

#[cfg(test)]
mod tests {
    use crate::core::tests::test_core;

    #[test]
    fn get_par_slug() {
        let (core, _channels, dir) = test_core("creatures");
        let kiro = core.creature_get(String::from("fantome")).unwrap();
        assert_eq!(kiro.name, "Kiro");
        assert_eq!(kiro.grid.len(), 32);
        assert!(core.creature_get(String::from("unicorn")).is_err());
        // Kiro hors catalogue trouvable par get.
        assert!(core.creature_get(String::from("kiro-ko")).is_ok());
        std::fs::remove_dir_all(dir).ok();
    }
}
