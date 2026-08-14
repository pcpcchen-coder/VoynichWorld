local GameConfig = {
    ExperienceId = "voynich_world",
    CurrentChapterId = "chapter_01",
    StartingRegionId = "herbal_wilds",
    ProfileVersion = 1,

    ContentIds = {
        Hub = "rosette_hub",
        FirstFolio = "folio_botany_01",
        FirstDiagnosis = "diag_hw_001",
        FirstNetworkPuzzle = "net_hw_001",
        FirstIntervention = "int_hw_001",
    },
}

return table.freeze(GameConfig)
