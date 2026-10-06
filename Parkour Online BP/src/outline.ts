import { Entity, RGBA, system, Vector3, world } from "@minecraft/server";
import { initialGetLevel } from "level";
import { getSelectionBounds, OutlineTypes, ParkourPlayer } from "utils";

export function setOutline(outline: Entity, pos1: Vector3, pos2: Vector3, color: RGBA = { red: 0.5, green: 0.5, blue: 0.5, alpha: 0.075 }) {
    const { minX, minY, maxZ } = getSelectionBounds(pos1, pos2);
    const sizeX = Math.abs(pos2.x - pos1.x) + 1.1;
    const sizeY = Math.abs(pos2.y - pos1.y) + 1.1;
    const sizeZ = Math.abs(pos2.z - pos1.z) + 1.1;

    outline.setProperty("parkour:size_x", sizeX);
    outline.setProperty("parkour:size_y", sizeY);
    outline.setProperty("parkour:size_z", sizeZ);
    if (color) {
        outline.setProperty("parkour:red", color.red);
        outline.setProperty("parkour:green", color.green);
        outline.setProperty("parkour:blue", color.blue);
        outline.setProperty("parkour:alpha", color.alpha);
    }
    outline.teleport({ x: minX + 0.45, y: minY, z: maxZ + 0.55 });
}

export function updateOutlines(dimension: string) {
    for (const player of (world.getPlayers().filter(p => p.dimension.id == dimension) as ParkourPlayer[])) {
        player.displayOutlinesLoaded = false;
    }
}

export function addDisplayOutline(player: ParkourPlayer, type: OutlineTypes, pos1: Vector3, pos2: Vector3) {
    const outline = player.dimension.spawnEntity("parkour:outline", pos1);
    const alpha = 0.075
    let color: RGBA = { red: 0.5, green: 0.5, blue: 0.5, alpha };

    switch (type) {
        case OutlineTypes.Checkpoint:
            color = { red: 0.28, green: 0.8, blue: 0.01, alpha }
            break;
        case OutlineTypes.Death:
            color = { red: 0.8, green: 0, blue: 0, alpha }
            break;
    }

    setOutline(outline, pos1, pos2, color);

    (player.displayOutlines ?? []).push({
        entity: outline,
        type,
        pos1,
        pos2
    });

    player.setPropertyOverrideForEntity(outline, "parkour:visible", true);

    return outline;
}

// for not shown selection boxes
export function addOutline(player: ParkourPlayer, type: OutlineTypes, pos1: Vector3, pos2: Vector3) {
    (player.displayOutlines ?? []).push({
        type,
        pos1,
        pos2
    });
}

export function removeDisplayOutlines(player: ParkourPlayer) {
    for (const outline of (player.displayOutlines ?? [])) {
        try {
            if (outline.entity && outline.entity?.isValid) {
                outline.entity?.remove();
            }
        } catch { }
    }
    player.displayOutlines = [];
}

function resetAllOutlines() {
    for (const dimension of world.getPlayers().map(p => p.dimension)) {
        for (const outline of dimension.getEntities({ type: "parkour:outline" })) {
            outline.remove();
        }
    }
}

function getAllOutlines() {
    const outlines = [];
    for (const player of world.getPlayers()) {
        for (const outline of player.dimension.getEntities({ type: "parkour:outline" })) {
            outlines.push(outline)
        }
    }
    return outlines;
}

world.afterEvents.playerSpawn.subscribe(({ initialSpawn }) => {
    if (initialSpawn) {
        if (world.getPlayers().length == 1) resetAllOutlines();
        initialGetLevel();
    }
})

system.run(() => {
    resetAllOutlines();
})