import { GameMode, system, world } from "@minecraft/server";
import { dimensions } from "dimensions";
import { ZoneType, getSelectionBoundsMaxMin, isInside, isLocationInArea, Level, ParkourPlayer, getPlayerLevel, returnToEditor } from "utils";

system.run(() => {
    initialGetLevel();
})

export function initialGetLevel() {
    for (const player of (world.getPlayers() as ParkourPlayer[])) {
        const level = getPlayerLevel(player);
        player.parkourLevel = level;
    }
}

function levelTick() {
    for (const player of (world.getPlayers() as ParkourPlayer[]).filter(p => p.parkourLevel != undefined)) {
        if (!player.parkourLevel) continue;
        if (player.getGameMode() != GameMode.Adventure) continue;

        const level = player.parkourLevel;
        const location = player.location
        //respawnLocationing system
        if (player.location.y < -66) {
            respawnLocationPlayer(player, level)
            continue;
        }

        player.getComponent("player.hunger")?.setCurrentValue(20);

        const finish = level.customLevelData.endLocation;

        if (isInside(location, getSelectionBoundsMaxMin(finish, finish, 1))) {
            console.warn("finished level");
        }

        const checkpoints = level.customLevelData.checkpoints ?? [];
        const deathZones = level.customLevelData.deathZones ?? [];

        for (const deathZone of deathZones) {
            if (deathZone.type == ZoneType.Area) {
                const [pos1, pos2] = deathZone.locations;
                if (isInside(location, getSelectionBoundsMaxMin(pos1, pos2))) {
                    respawnLocationPlayer(player, level);
                    break;
                }
            } else {
                if (isInside(location, getSelectionBoundsMaxMin(deathZone.location, deathZone.location, 1))) {
                    respawnLocationPlayer(player, level);
                    break;
                }
            }
        }

        for (let i = 0; i < checkpoints.length; i++) {
            const checkpoint = checkpoints[i];

            if (checkpoint.respawnLocation == player.checkpoint && player.checkpoint != undefined) continue;

            if (checkpoint.type == ZoneType.Point) {
                if (isInside(location, getSelectionBoundsMaxMin(checkpoint.location, checkpoint.location, 1))) {
                    console.warn(`${player.name} entered checkpoint ${i}`);
                    if (checkpoint.settings?.enterMessage) {
                        player.sendMessage(checkpoint.settings.enterMessage);
                    }
                    player.checkpoint = checkpoint.respawnLocation;
                    break;
                    //set current checkpoint
                }
            }

            if (checkpoint.type == ZoneType.Area) {
                const [pos1, pos2] = checkpoint.locations;
                const [max, min] = getSelectionBoundsMaxMin(pos1, pos2, 1);
                if (isLocationInArea(location, min, max)) {
                    console.warn(`${player.name} entered checkpoint ${i}`);
                    if (checkpoint.settings?.enterMessage) {
                        player.sendMessage(checkpoint.settings.enterMessage);
                    }
                    player.checkpoint = checkpoint.respawnLocation;
                    break;
                    //set current checkpoint
                }
            }

        }

        // check if player is in custom zones (death, checkpoint, finish)

        // outline
    }
}

world.afterEvents.playerGameModeChange.subscribe(({ player: source, toGameMode }) => {
    const player = source as ParkourPlayer;
    if (player.isPlaytesting && toGameMode != GameMode.Adventure && dimensions.some(d => d.typeId == player.dimension.id)) {
        returnToEditor(player, player.parkourLevel!);
    }
})

function respawnLocationPlayer(player: ParkourPlayer, level: Level) {
    if (player.checkpoint) {
        const { x, y, z } = player.checkpoint;
        player.teleport({ x: x + 0.5, y: y, z: z + 0.5 });
    } else {
        const { x, y, z } = level.customLevelData.spawn.location
        player.teleport({ x: x + 0.5, y: y, z: z + 0.5 }, { rotation: level.customLevelData.spawn.rotation });
    }
}

system.runInterval(() => {
    // let i = 0;
    // for (const outline of world.getDimension("parkour:dimension_0").getEntities({ type: "parkour:outline" })) {
    //     const size =
    //     (((Math.sin(system.currentTick / 10) + 1) / 2) * 10) + 1
    //     outline.setProperty("parkour:size_x", size)
    //     outline.setProperty("parkour:size_y", size)
    //     outline.setProperty("parkour:size_z", size)
    //     const sinWave = ((Math.sin(system.currentTick / 40) + 1) / 2) * 255 / 255
    //     outline.setProperty("parkour:red", sinWave)
    //     outline.setProperty("parkour:green", (1 + sinWave) / 255)
    //     outline.setProperty("parkour:blue", (1 + sinWave) / 255)
    //     const molang = new MolangVariableMap();
    //     molang.setFloat("variable.index", 1);
    //     molang.setFloat("variable.lifetime", 0.065);
    //     molang.setFloat("variable.size", size / 2);
    //     molang.setFloat("variable.color.r", 1)
    //     molang.setFloat("variable.color.g", 1)
    //     molang.setFloat("variable.color.b", 1)
    //     molang.setFloat("variable.color.a", 1)
    //     const {x,y,z} = outline.location
    //     const center = getCenter(outline.location, {x: x + size - 1, y: y + size, z: z - size + 1})
    //     outline.dimension.spawnParticle("parkour:finish", {x: center.x, y: center.y, z: center.z}, molang);
    //     outline.setProperty("parkour:alpha", 0.15);
    //     i++
    // }

    levelTick();
})