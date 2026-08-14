local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage.Shared.Config.GameConfig)

print(string.format(
    "[VoynichWorld] server bootstrap | chapter=%s | profileVersion=%d",
    GameConfig.CurrentChapterId,
    GameConfig.ProfileVersion
))

-- Services are intentionally not instantiated here yet.
-- RBLX-003 will introduce PlayerDataService and the server service lifecycle.
