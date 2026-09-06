import { system, world } from "@minecraft/server";

export const dimensions: CustomDimension[] = [];
export interface CustomDimension {
    typeId: string;
    using: boolean
}

system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
    for (let i = 0; i < 5; i++) {
        dimensionRegistry.registerCustomDimension(`parkour:dimension_${i}`);
        dimensions.push({ typeId: `parkour:dimension_${i}`, using: false });
    }
})
