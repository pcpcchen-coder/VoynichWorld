local ReplicatedStorage = game:GetService("ReplicatedStorage")

local GameConfig = require(ReplicatedStorage.Shared.Config.GameConfig)

print(string.format(
    "[VoynichWorld] client bootstrap | startRegion=%s",
    GameConfig.StartingRegionId
))

-- Controllers are intentionally deferred.
-- RBLX-004 will introduce the cross-device interaction controller.
