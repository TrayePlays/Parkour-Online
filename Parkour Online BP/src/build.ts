import { BlockVolume, Player, system, world } from "@minecraft/server";
import { CustomDimension, dimensions } from "dimensions";
import { isInside, Level, loadStructure, runLoadStructure } from "utils";

const PARKOUR_CONFIG = {
    max: { x: 64, y: 128, z: 64 }
}

export function findAvailableDimension(): CustomDimension | undefined {
    checkIfUsingDimensions();
    for (const dimension of dimensions) {
        if (dimension?.using != true) return dimension;
    }
}

export function checkIfUsingDimensions() {
    for (let i = 0; i < dimensions.length; i++) {
        dimensions[i].using = false;
    }
    for (const player of world.getPlayers()) {
        const dimensionIndex = dimensions.findIndex(d => d.typeId == player.dimension.id)
        if (dimensionIndex == -1) continue;
        dimensions[dimensionIndex].using = true;
    }
}

export async function clearDimension(dim: CustomDimension) {
    const max = PARKOUR_CONFIG.max
    const dimensionIndex = dimensions.findIndex(d => d.typeId == dim.typeId);
    if (dimensionIndex == -1) return console.warn("Dimension is invalid?");
    dimensions[dimensionIndex].using = false;
    const dimension = world.getDimension(dim.typeId);
    await world.tickingAreaManager.createTickingArea(`${dim.typeId}_clear`, { dimension: dimension, from: { x: max.x / 2, y: 64, z: max.z / 2 }, to: { x: -max.x / 2, y: -64, z: -max.z / 2 } });
    for (let i = 0; i < 32; i++) {
        const buildZone = new BlockVolume({ x: max.x / 2, y: -60 + (i * 4), z: max.z / 2 }, { x: -max.x / 2, y: -64 + (i * 4), z: -max.z / 2 })
        dimension.fillBlocks(buildZone, "air");
    }
    world.tickingAreaManager.removeTickingArea(`${dim.typeId}_clear`);
}

export async function loadDimension(player: Player, dim: CustomDimension, level?: Level) {
    await clearDimension(dim);
    player.camera.fade({ fadeColor: { blue: 0, green: 0, red: 0 }, fadeTime: { holdTime: 0.25, fadeInTime: 0, fadeOutTime: 0.5 } })
    const dimensionIndex = dimensions.findIndex(d => d.typeId == dim.typeId);
    if (dimensionIndex == -1) return console.warn("Dimension is invalid?");
    dimensions[dimensionIndex].using = true;
    const dimension = world.getDimension(dim.typeId);
    await world.tickingAreaManager.createTickingArea(`${dim.typeId}_load`, { dimension: dimension, from: { x: 0, y: -64, z: 0 }, to: { x: 0, y: -64, z: 0 } });
    dimension.setBlockType({ x: 0, y: -64, z: 0 }, "bedrock");
    world.tickingAreaManager.removeTickingArea(`${dim.typeId}_load`);
    if (level && level.structure) {
        runLoadStructure(level.structure, dimension, { x: -32, y: -64, z: -32 }, () => {
            player.camera.clear()
            console.warn("on load?")
            player.teleport({ x: 0.5, y: -63, z: 0.5 }, { dimension });
            checkIfUsingDimensions();
        })
        return;
    }
    if (level && level.name) {
        player.setDynamicProperty("currentLevel", level.name)
    }
    player.teleport({ x: 0.5, y: -63, z: 0.5 }, { dimension });
    checkIfUsingDimensions();
    console.warn(JSON.stringify(dimensions));
}

world.beforeEvents.playerPlaceBlock.subscribe((data) => {
    const { player, block } = data
    if (!player.dimension.id.includes("parkour")) return;
    const max = PARKOUR_CONFIG.max;
    if (!isInside(block.location, [{ x: max.x / 2, y: 64, z: max.z / 2 }, { x: -max.x / 2, y: -64, z: -max.z / 2 }])) {
        data.cancel = true;
        system.run(() => {
            player.sendMessage("You can't place a block here!")
        })
    }
})