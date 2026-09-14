import { EquipmentSlot, ItemStack, MolangVariableMap, Player, system, Vector2, Vector3, world } from "@minecraft/server";
import { } from "settings";
import { settingsUI } from "ui";
import { getCenter, getCurrentLevelName, getDistance, getLevel, isInside, ParkourPlayer, saveLevel } from "utils";

let specialDisplayItemsShow: ParkourPlayer[] = [];

const specialItems = ["parkour:finish", "parkour:spawn", "parkour:checkpoint", "parkour:settings"];

function checkSpecialItemDisplay(player: ParkourPlayer, itemStack?: ItemStack) {
    if (itemStack && specialItems.includes(itemStack.typeId)) {
        specialDisplayItemsShow.push(player);
    } else {
        specialDisplayItemsShow = specialDisplayItemsShow.filter(f => f.id != player.id);
    }
}

function getSpecialBlock(player: ParkourPlayer) {
    const viewDir = player.getViewDirection();
    const { x, y, z } = player.getHeadLocation()
    for (let i = 0; i < 8; i++) {
        const newLocation = {x: Math.round(x + (viewDir.x * i)), y: Math.max(Math.round(y + (viewDir.y * i)), -64), z: Math.round(z + (viewDir.z * i))};
        // const block = player.dimension.getBlock(newLocation);
        player.spawnParticle("minecraft:endrod", newLocation);
    }
}

system.run(() => {
    for (const player of world.getPlayers()) {
        checkSpecialItemDisplay(player, player.getComponent("equippable")?.getEquipment(EquipmentSlot.Mainhand));
    }
})

world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({ itemStack, player }) => {
    if (itemStack && specialItems.includes(itemStack.typeId)) {
        specialDisplayItemsShow.push(player);
    } else {
        specialDisplayItemsShow = specialDisplayItemsShow.filter(f => f.id != player.id);
    }
})

world.afterEvents.playerInventoryItemChange.subscribe(({ player, slot, itemStack }) => {
    if (slot == player.selectedSlotIndex) {
        if (itemStack && specialItems.includes(itemStack.typeId)) {
            specialDisplayItemsShow.push(player);
        } else {
            specialDisplayItemsShow = specialDisplayItemsShow.filter(f => f.id != player.id);
        }
    }
})

world.beforeEvents.playerPlaceBlock.subscribe((data) => {
    const { player, block } = data
    const item = player.getComponent("equippable")?.getEquipment(EquipmentSlot.Mainhand);
    if (item == undefined) return console.warn("how?")
    const levelName = getCurrentLevelName(player)
    if (levelName == undefined) return console.warn("level name undef");
    const level = getLevel(levelName);
    if (level == undefined) return console.warn("level unk");
    if (item.typeId == "parkour:finish") {
        saveLevel(player, levelName, { customLevelData: { endLocation: block.location, spawnLocation: level.customLevelData.spawnLocation, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:spawn") {
        saveLevel(player, levelName, { customLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: block.location, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:checkpoint") {
        if (player.isSneaking) {
            const pos1 = player.getDynamicProperty("checkpointPos1") as Vector3 ?? undefined
            data.cancel = true;
            if (pos1 == undefined) {
                player.setDynamicProperty("checkpointPos1", block.location)
                system.run(() => {
                    player.sendMessage("Checkpoint Position 1 Set")
                })
            } else {
                player.setDynamicProperty("checkpointPos1")
                const checkpointArr = level.customLevelData.checkpoints ?? [];
                checkpointArr.push({ locations: [pos1, block.location] })
                saveLevel(player, levelName, { customLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: level.customLevelData.spawnLocation, checkpoints: checkpointArr } });
            }
        } else {
            player.setDynamicProperty("checkpointPos1")
            const checkpointArr = level.customLevelData.checkpoints ?? [];
            checkpointArr.push({ locations: block.location })
            saveLevel(player, levelName, { customLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: level.customLevelData.spawnLocation, checkpoints: checkpointArr } });
            // data.cancel = true;
        }
    }
})

world.beforeEvents.playerBreakBlock.subscribe((data) => {
    const { block, player } = data
    const levelName = getCurrentLevelName(player)
    if (levelName == undefined) return console.warn("level name undef");
    const level = getLevel(levelName);
    if (level == undefined) return console.warn("level unk");
    if (block.typeId == "parkour:checkpoint") {
        let checkpointArr = level.customLevelData.checkpoints ?? [];
        checkpointArr = checkpointArr.filter(l => JSON.stringify(l.locations) != JSON.stringify(block.location));
        saveLevel(player, levelName, { customLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: level.customLevelData.spawnLocation, checkpoints: checkpointArr } });
    }
})

world.beforeEvents.playerInteractWithBlock.subscribe((data) => {
    const { block, itemStack, player, isFirstEvent } = data
    if (!isFirstEvent) return;
    const levelName = getCurrentLevelName(player)
    if (levelName == undefined) return console.warn("level name undef");
    const level = getLevel(levelName);
    if (level == undefined) return console.warn("level unk");
    if (itemStack?.typeId == "parkour:settings") {
        if (JSON.stringify(block.above()?.location) == JSON.stringify(level.customLevelData.spawnLocation)) {
            console.warn("settings on spawnlocation")
            system.run(() => settingsUI(player, {
                sliders: [
                    {
                        name: "X",
                        default: level.customLevelData.spawnLocation.x,
                        max: 32,
                        min: -32,
                        cb(value) {
                            saveLevel(player, level.name, { customLevelData: { spawnLocation: { x: value } } })
                        },
                    },
                    {
                        name: "Y",
                        default: level.customLevelData.spawnLocation.y,
                        max: 64,
                        min: -64,
                        cb(value) {
                            saveLevel(player, level.name, { customLevelData: { spawnLocation: { y: value } } })
                        },
                    },
                    {
                        name: "Z",
                        default: level.customLevelData.spawnLocation.z,
                        max: 32,
                        min: -32,
                        cb(value) {
                            saveLevel(player, level.name, { customLevelData: { spawnLocation: { z: value } } })
                        },
                    },
                ],
                toggles: [
                    {
                        name: "test 1",
                        description: "this is a test of my system",
                        cb(toggled) {
                            console.warn("test 1 value", toggled);
                        },
                    },
                    {
                        name: "test 2",
                        cb(toggled) {
                            console.warn("what does test2 do?")
                        },
                    }
                ]
            }))
            return;
        }
        console.warn(JSON.stringify(level.customLevelData.checkpoints))
        for (const checkpoint of level.customLevelData.checkpoints?.filter(cp => Array.isArray(cp)) || []) {
            console.warn("checking checkpoint?")
            if (isInside(block.above()!.location, [checkpoint[0], checkpoint[1]])) {
                return console.warn("checkpoint big settings")
            }
        }
        if (block.typeId == "parkour:checkpoint") {
            console.warn("checkpoint settings")
        }
    }
})

function displayItemInterval() {
    for (const player of specialDisplayItemsShow) {
        let level;
        // ts is horrible optimized holy
        // maybe store level direclty to the player
        const levelName = getCurrentLevelName(player);
        if (levelName == undefined) return;
        if (player.parkourLevel == undefined) level = getLevel(levelName);
        else level = player.parkourLevel;
        if (level == undefined) return;
        if (system.currentTick % 20 == 0) getSpecialBlock(player);
        const finishLocation = level.customLevelData.endLocation;
        const spawnLocation = level.customLevelData.spawnLocation;
        const checkpoints = level.customLevelData.checkpoints
        const molang = new MolangVariableMap();
        molang.setFloat("variable.index", 1);
        molang.setFloat("variable.lifetime", 0.075);
        molang.setFloat("variable.size", 0.5);
        player.spawnParticle("parkour:finish", { x: finishLocation.x + 0.5, y: finishLocation.y + 0.5, z: finishLocation.z + 0.5 }, molang);
        player.spawnParticle("parkour:spawn", { x: spawnLocation.x + 0.5, y: spawnLocation.y + 0.5, z: spawnLocation.z + 0.5 }, molang);
        if (checkpoints) {
            for (const checkpoint of checkpoints) {
                if (!Array.isArray(checkpoint.locations)) {
                    const location = checkpoint.locations
                    player.spawnParticle("parkour:checkpoint", { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 }, molang)
                } else {
                    const [pos1, pos2] = checkpoint.locations;
                    const distance = getDistance(pos1, pos2);
                    const molang = new MolangVariableMap();
                    molang.setFloat("variable.index", 1);
                    molang.setFloat("variable.lifetime", 0.065);
                    molang.setFloat("variable.size", (distance / 2));
                    molang.setFloat("variable.color.r", 1)
                    molang.setFloat("variable.color.g", 1)
                    molang.setFloat("variable.color.b", 1)
                    molang.setFloat("variable.color.a", 1)
                    const center = getCenter(pos1, pos2);
                    player.spawnParticle("parkour:checkpoint", { x: center.x, y: center.y, z: center.z }, molang);
                }
            }
        }
    }
}

system.runInterval(() => {
    displayItemInterval();
})