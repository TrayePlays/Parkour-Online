import { EquipmentSlot, ItemStack, MolangVariableMap, Player, system, Vector2, Vector3, world } from "@minecraft/server";
import { addDisplayOutline, addOutline, removeDisplayOutlines, setOutline, updateOutlines } from "outline";
import { } from "settings";
import { checkpointSettingsUI, deathZoneSettingsUI, settingsUI, spawnSettingsUI } from "ui";
import { ZoneType, CustomLevelData, getCenter, getDistance, getLevel, getSelectionBounds, isInside, isLocationInArea, Level, OutlineTypes, ParkourPlayer, saveLevel, getPlayerLevel } from "utils";

let specialDisplayItemsShow: ParkourPlayer[] = [];

const specialItems = ["parkour:finish", "parkour:spawn", "parkour:checkpoint", "parkour:settings", "parkour:death", "parkour:playtest", "parkour:trash"];

function checkSpecialItemDisplay(player: ParkourPlayer, itemStack?: ItemStack) {
    if (itemStack && specialItems.includes(itemStack.typeId)) {
        if (!specialDisplayItemsShow.some(f => f.id == player.id)) {
            specialDisplayItemsShow.push(player);
            player.displayOutlinesLoaded = false;
        }
    } else {
        removeDisplayOutlines(player);
        specialDisplayItemsShow = specialDisplayItemsShow.filter(f => f.id != player.id);

        player.displayOutlinesLoaded = false;
    }
}

function getSpecialBlock(player: ParkourPlayer) {
    const viewDir = player.getViewDirection();
    const { x, y, z } = player.getHeadLocation();
    const level = player.parkourLevel;
    if (level == undefined) return;

    const areas = player.displayOutlines ?? [];

    for (let i = 1; i <= 6; i += 0.5) {
        const newLocation = {
            x: (x + (viewDir.x * i)),
            y: Math.max((y + (viewDir.y * i)), -64),
            z: (z + (viewDir.z * i))
        };

        for (const area of areas) {
            const { pos1, pos2, type } = area;
            const { maxX, maxY, maxZ, minX, minY, minZ } = getSelectionBounds(pos1, pos2, 1);
            const min = { x: minX, y: minY, z: minZ };
            const max = { x: maxX, y: maxY, z: maxZ };
            if (isLocationInArea(newLocation, min, max)) {
                // console.warn(`Looking at ${type} area ${system.currentTick % 20}`);
                return area;
            }
        }
    }
}

system.run(() => {
    for (const player of world.getPlayers() as ParkourPlayer[]) {
        checkSpecialItemDisplay(player, player.getComponent("equippable")?.getEquipment(EquipmentSlot.Mainhand));
    }
})

world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({ itemStack, player }) => {
    checkSpecialItemDisplay(player, itemStack)
})

world.afterEvents.playerInventoryItemChange.subscribe(({ player, slot, itemStack }) => {
    if (slot == player.selectedSlotIndex) {
        checkSpecialItemDisplay(player, itemStack)
    }
})

world.beforeEvents.playerPlaceBlock.subscribe((data) => {
    const { block } = data
    const player = data.player as ParkourPlayer
    const item = player.getComponent("equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (item == undefined) return console.warn("how?")
    const level = getPlayerLevel(player);
    if (level == undefined) return console.warn("level unk");
    if (item.typeId == "parkour:finish") {
        saveLevel(player, level.name, { customLevelData: { endLocation: block.location, spawn: level.customLevelData.spawn, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:spawn") {
        saveLevel(player, level.name, { customLevelData: { endLocation: level.customLevelData.endLocation, spawn: { location: block.location }, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:checkpoint") {
        const cancel = _placeCheckpoint(player, level.name, level, block.location);
        data.cancel = cancel;
    }
    if (item.typeId == "parkour:death") {
        const cancel = _placeDeathZone(player, level.name, level, block.location);
        data.cancel = cancel;
    }
})

world.beforeEvents.playerBreakBlock.subscribe((data) => {
    const { block } = data
    const player = data.player as ParkourPlayer
    const level = getPlayerLevel(player);
    if (level == undefined) return console.warn("level unk");

    if (block.typeId == "parkour:checkpoint") {
        let checkpointArr = level.customLevelData.checkpoints ?? [];

        checkpointArr = checkpointArr.filter(checkpoint => {
            if (checkpoint.type == ZoneType.Point) {
                return JSON.stringify(checkpoint.location) != JSON.stringify(block.location);
            }

            return true;
        });

        saveLevel(player, level.name, { customLevelData: { checkpoints: checkpointArr } });
    }
    if (block.typeId == "parkour:death") {
        let deathZoneArr = level.customLevelData.deathZones ?? [];

        deathZoneArr = deathZoneArr.filter(deathZone => {
            if (deathZone.type == ZoneType.Point) {
                return JSON.stringify(deathZone.location) != JSON.stringify(block.location);
            }

            return true;
        });

        saveLevel(player, level.name, { customLevelData: { deathZones: deathZoneArr } });
    }
})

world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    const { block, itemStack, isFirstEvent } = data
    const player = data.player as ParkourPlayer
    if (!isFirstEvent) return;
    const level = getPlayerLevel(player);
    if (!level) return;
    if (itemStack?.typeId == "parkour:wand") {
        if (player.zonePlacement?.position1 == undefined) {
            player.zonePlacement = {
                position1: block.location
            };

            system.run(() => {
                player.sendMessage("Zone Position 1 Set");
            });

            data.cancel = true;
            return;
        }

        const pos1 = player.zonePlacement.position1;
        player.zonePlacement = undefined;

        system.run(() => {
            addDisplayOutline(player, OutlineTypes.Spawn, pos1, block.location);
        })

        data.cancel = true;
        return;
    }
    if (itemStack?.typeId == "parkour:settings") {
        if (JSON.stringify(block.above()?.location) == JSON.stringify(level.customLevelData.spawn)) {
            // console.warn("settings on spawn")
            system.run(() => spawnSettingsUI(player, level))
            return;
        }
        if (block.typeId == "parkour:checkpoint") {
            const checkpoint = level.customLevelData.checkpoints?.find(cp => cp.type == ZoneType.Point && JSON.stringify(cp.location) == JSON.stringify(block.location));
            if (!checkpoint) return;
            system.run(() => checkpointSettingsUI(player, level, checkpoint));
        }
    }
    if (itemStack?.typeId == "parkour:trash") {
        if (block.typeId == "parkour:checkpoint") {
            const checkpoint = level.customLevelData.checkpoints?.find(cp => cp.type == ZoneType.Point && JSON.stringify(cp.location) == JSON.stringify(block.location));
            if (!checkpoint) return;
            const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
            const checkpointIndex = checkpoints.indexOf(checkpoint);
            if (checkpointIndex == -1) return;
            checkpoints.splice(checkpointIndex, 1);

            system.run(() => {
                player.dimension.setBlockType(block.location, "air");
                player.playSound("mob.breeze.hurt", { pitch: 2 })

                saveLevel(player, level.name, {
                    customLevelData: {
                        checkpoints
                    }
                });
            })
        }
    }
})

world.afterEvents.itemUse.subscribe(({ itemStack, source: player }) => {
    const level = getPlayerLevel(player);
    if (!level) return;
    const area = getSpecialBlock(player);
    if (!area) return;
    if (itemStack.typeId == "parkour:settings") {
        if (area.type == OutlineTypes.Spawn) spawnSettingsUI(player, level);
        if (area.type == OutlineTypes.Checkpoint) {
            const checkpoint = level.customLevelData.checkpoints?.find(cp => cp.type == ZoneType.Area && JSON.stringify(cp.locations) == JSON.stringify([area.pos1, area.pos2]));
            if (!checkpoint) return;
            checkpointSettingsUI(player, level, checkpoint);
        }
        if (area.type == OutlineTypes.Death) {
            const deathZone = level.customLevelData.deathZones?.find(dz => dz.type == ZoneType.Area && JSON.stringify(dz.locations) == JSON.stringify([area.pos1, area.pos2]));
            if (!deathZone) return;
            deathZoneSettingsUI(player, level, deathZone);
        }
    }
    if (itemStack.typeId == "parkour:trash") {
        if (area.type == OutlineTypes.Spawn || area.type == OutlineTypes.Finish) {
            player.sendMessage(`You can't remove this!`)
            return;
        };
        player.playSound("mob.breeze.hurt", { pitch: 2 })
        if (area.type == OutlineTypes.Checkpoint) {
            const checkpoint = level.customLevelData.checkpoints?.find(cp => cp.type == ZoneType.Area && JSON.stringify(cp.locations) == JSON.stringify([area.pos1, area.pos2]));
            if (!checkpoint) return;

            const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
            const checkpointIndex = checkpoints.indexOf(checkpoint);
            if (checkpointIndex == -1) return;

            checkpoints.splice(checkpointIndex, 1);

            saveLevel(player, level.name, {
                customLevelData: {
                    checkpoints
                }
            });

            updateOutlines(player.dimension.id);
        }
    }
})

function displayItemInterval() {
    for (const player of specialDisplayItemsShow) {
        if (!player || !player.isValid) {
            specialDisplayItemsShow.splice(specialDisplayItemsShow.indexOf(player), 1);
            continue;
        };
        // const mo = new MolangVariableMap();
        // mo.setFloat("variable.bsize_x", 1);
        // mo.setFloat("variable.bsize_y", 1);
        // mo.setFloat("variable.boffset_x", 0);
        // mo.setFloat("variable.boffset_y", 0);
        // mo.setFloat("variable.boffset_z", 0);
        // player.dimension.spawnParticle("parkour:box", player.getHeadLocation(), mo);
        const level = getPlayerLevel(player);
        // maybe store level directly to the player
        if (level == undefined) return;
        const finishLocation = level.customLevelData.endLocation;
        const spawn = level.customLevelData.spawn.location;
        if (!player.displayOutlinesLoaded) {
            removeDisplayOutlines(player);
            for (const checkpoint of level.customLevelData.checkpoints ?? []) {
                if (checkpoint.type == ZoneType.Area) {
                    const [pos1, pos2] = checkpoint.locations;
                    addDisplayOutline(player, OutlineTypes.Checkpoint, pos1, pos2);
                }
                if (checkpoint.type == ZoneType.Point) {
                    // console.warn(JSON.stringify(checkpoint.location));
                    // console.warn(player.dimension.getBlock(checkpoint.location))
                    if (player.dimension.getBlock(checkpoint.location)?.isAir) player.dimension.setBlockType(checkpoint.location, "parkour:checkpoint")
                }
            }

            for (const deathZone of level.customLevelData.deathZones ?? []) {
                if (deathZone.type == ZoneType.Area) {
                    const [pos1, pos2] = deathZone.locations;
                    addDisplayOutline(player, OutlineTypes.Death, pos1, pos2);
                }
            }

            addOutline(player, OutlineTypes.Finish, finishLocation, { x: finishLocation.x + 1, y: finishLocation.y + 1, z: finishLocation.z + 1 });
            addOutline(player, OutlineTypes.Spawn, spawn, spawn);

            //death zone outlines here
            //future trigger outlines here

            player.displayOutlinesLoaded = true;
        }
        const molang = new MolangVariableMap();
        molang.setFloat("variable.index", 1);
        molang.setFloat("variable.lifetime", 0.075);
        molang.setFloat("variable.size", 0.5);
        player.spawnParticle("parkour:finish", { x: finishLocation.x + 0.5, y: finishLocation.y + 0.5, z: finishLocation.z + 0.5 }, molang);
        player.spawnParticle("parkour:spawn", { x: spawn.x + 0.5, y: spawn.y + 0.5, z: spawn.z + 0.5 }, molang);

        const deathZones = level.customLevelData.deathZones
        if (deathZones) {
            for (const deathZone of deathZones) {
                if (deathZone.type == ZoneType.Area) {
                    const [pos1, pos2] = deathZone.locations;
                    const distance = getDistance(pos1, pos2);

                    const molang = new MolangVariableMap();
                    molang.setFloat("variable.index", 1);
                    molang.setFloat("variable.lifetime", 0.065);
                    molang.setFloat("variable.size", 0.5);
                    molang.setFloat("variable.color.r", 1);
                    molang.setFloat("variable.color.g", 1);
                    molang.setFloat("variable.color.b", 1);
                    molang.setFloat("variable.color.a", 1);
                    // const { x, y, z } = checkpoint.respawnLocation
                    const { x, y, z } = getCenter(pos1, pos2);
                    player.spawnParticle("parkour:death", { x: x + 0.5, y: y + 0.5, z: z + 0.5 }, molang);
                } else {
                    molang.setFloat("variable.color.r", 1);
                    molang.setFloat("variable.color.g", 1);
                    molang.setFloat("variable.color.b", 1);
                    molang.setFloat("variable.color.a", 1);
                    const location = deathZone.location;
                    player.spawnParticle("parkour:death", { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 }, molang);
                }
            }
        }

        const checkpoints = level.customLevelData.checkpoints
        if (checkpoints) {
            for (const checkpoint of checkpoints) {
                if (checkpoint.type == ZoneType.Point) {
                    const location = checkpoint.respawnLocation;
                    player.spawnParticle("parkour:checkpoint", { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 }, molang);
                } else if (checkpoint.type == ZoneType.Area) {
                    const [pos1, pos2] = checkpoint.locations;
                    const distance = getDistance(pos1, pos2);

                    const molang = new MolangVariableMap();
                    molang.setFloat("variable.index", 1);
                    molang.setFloat("variable.lifetime", 0.065);
                    molang.setFloat("variable.size", 0.5);
                    molang.setFloat("variable.color.r", 1);
                    molang.setFloat("variable.color.g", 1);
                    molang.setFloat("variable.color.b", 1);
                    molang.setFloat("variable.color.a", 1);
                    const { x, y, z } = checkpoint.respawnLocation
                    const center = getCenter(pos1, pos2);
                    player.spawnParticle("parkour:checkpoint", { x: x + 0.5, y: y + 0.5, z: z + 0.5 }, molang);
                }
            }
        }
    }
}

function _placeDeathZone(player: ParkourPlayer, levelName: string, level: Level, location: Vector3) {
    if (player.isSneaking) {
        if (player.deathZonePlacement?.position1 == undefined) {
            player.deathZonePlacement = {
                position1: location
            };

            system.run(() => {
                player.sendMessage("Deathzone Position 1 Set");
            });

            return true;
        }
        const pos1 = player.deathZonePlacement.position1;
        player.deathZonePlacement = undefined;
        const deathZoneArr = level.customLevelData.deathZones ?? [];

        deathZoneArr.push({
            type: ZoneType.Area,
            locations: [pos1, location],
        });

        saveCustomLevelData(player, levelName, {
            deathZones: deathZoneArr
        });

        updateOutlines(player.dimension.id)

        system.run(() => {
            player.sendMessage("Area deathzone created");
        });

        return true;
    }

    for (const deathZone of level.customLevelData.deathZones?.filter(dz => dz.type == ZoneType.Area) ?? []) {
        if (isInside(location, [deathZone.locations[0], deathZone.locations[1]])) {
            const deathZoneArr = level.customLevelData.deathZones ?? [];
            const index = deathZoneArr.findIndex(cp => JSON.stringify(cp) == JSON.stringify(deathZone));

            deathZoneArr[index] = {
                type: ZoneType.Area,
                locations: deathZone.locations,
            }

            saveCustomLevelData(player, levelName, { deathZones: deathZoneArr });
            return true
        }
    }

    player.deathZonePlacement = undefined;

    const deathZoneArr = level.customLevelData.deathZones ?? [];

    deathZoneArr.push({
        type: ZoneType.Point,
        location,
    });

    saveCustomLevelData(player, levelName, {
        deathZones: deathZoneArr
    });

    return false
}

function _placeCheckpoint(player: ParkourPlayer, levelName: string, level: Level, location: Vector3) {
    if (player.isSneaking) {
        if (player.checkpointPlacement?.position1 == undefined) {
            player.checkpointPlacement = {
                position1: location
            };

            system.run(() => {
                player.sendMessage("Checkpoint Position 1 Set");
            });

            return true;
        }
        const pos1 = player.checkpointPlacement.position1;
        player.checkpointPlacement = undefined;
        const checkpointArr = level.customLevelData.checkpoints ?? [];

        checkpointArr.push({
            type: ZoneType.Area,
            locations: [pos1, location],
            respawnLocation: pos1
        });

        saveCustomLevelData(player, levelName, {
            checkpoints: checkpointArr
        });

        updateOutlines(player.dimension.id)

        system.run(() => {
            player.sendMessage("Area checkpoint created");
        });

        return true;
    }

    for (const checkpoint of level.customLevelData.checkpoints?.filter(cp => cp.type == ZoneType.Area) ?? []) {
        if (isInside(location, [checkpoint.locations[0], checkpoint.locations[1]])) {
            const checkpointArr = level.customLevelData.checkpoints ?? [];
            const index = checkpointArr.findIndex(cp => JSON.stringify(cp) == JSON.stringify(checkpoint));

            checkpointArr[index] = {
                type: checkpoint.type,
                locations: checkpoint.locations,
                respawnLocation: location,
                settings: checkpoint.settings
            }

            saveCustomLevelData(player, levelName, { checkpoints: checkpointArr });
            return true
        }
    }

    player.checkpointPlacement = undefined;

    const checkpointArr = level.customLevelData.checkpoints ?? [];

    checkpointArr.push({
        type: ZoneType.Point,
        location: location,
        respawnLocation: location
    });

    saveCustomLevelData(player, levelName, {
        checkpoints: checkpointArr
    });

    return false
}

function saveCustomLevelData(player: ParkourPlayer, levelName: string, data: Partial<CustomLevelData>) {
    const level = getLevel(levelName);
    if (level == undefined) return;

    saveLevel(player, levelName, {
        customLevelData: {
            ...level.customLevelData,
            ...data
        }
    });
}



system.runInterval(() => {
    
    displayItemInterval();
})