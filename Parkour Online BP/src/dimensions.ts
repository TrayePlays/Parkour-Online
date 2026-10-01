import { system, world } from "@minecraft/server";
import { getDimensionLevel, getLevel, getPlayerLevel, ParkourPlayer } from "utils";

export const dimensions: CustomDimension[] = [];

export interface CustomDimension {
    typeId: string;
    using: boolean;
}

world.afterEvents.playerDimensionChange.subscribe(({ toDimension, player: source }) => {
    const player = source as ParkourPlayer
    player.parkourLevel = getPlayerLevel(player);
})

system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
    for (let i = 0; i < 5; i++) {
        dimensionRegistry.registerCustomDimension(`parkour:dimension_${i}`);
        dimensions.push({ typeId: `parkour:dimension_${i}`, using: false });
    }
})
