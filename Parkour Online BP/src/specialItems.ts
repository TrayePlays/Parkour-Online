import { EquipmentSlot, MolangVariableMap, Player, system, world } from "@minecraft/server";
import { getCurrentLevelName, getLevel, saveLevel } from "utils";

let specialDisplayItemsShow: Player[] = [];

const specialItems = ["parkour:finish", "parkour:spawn", "parkour:checkpoint", "parkour:settings"];

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
        saveLevel(player, levelName, { newLevelData: { endLocation: block.location, spawnLocation: level.customLevelData.spawnLocation, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:spawn") {
        saveLevel(player, levelName, { newLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: block.location, checkpoints: level.customLevelData.checkpoints } });
        data.cancel = true;
    }
    if (item.typeId == "parkour:checkpoint") {
        const checkpointArr = level.customLevelData.checkpoints ?? [];
        checkpointArr.push({locations: block.location})
        saveLevel(player, levelName, { newLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: level.customLevelData.spawnLocation, checkpoints: checkpointArr } });
        // data.cancel = true;
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
        saveLevel(player, levelName, { newLevelData: { endLocation: level.customLevelData.endLocation, spawnLocation: level.customLevelData.spawnLocation, checkpoints: checkpointArr } });
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
        }
        if (block.typeId == "parkour:checkpoint") {
            console.warn("checkpoint settings")
        }
    }
})

function displayItemInterval() {
    for (const player of specialDisplayItemsShow) {
        // ts is horrible optimized holy
        // maybe store level direclty to the player
        const levelName = getCurrentLevelName(player);
        if (levelName == undefined) return;
        const level = getLevel(levelName);
        if (level == undefined) return;
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
                }
            }
        }
    }
}

system.runInterval(() => {
    displayItemInterval();
})