import { system } from "@minecraft/server";
export const dimensions = [];
system.beforeEvents.startup.subscribe(({ dimensionRegistry }) => {
    for (let i = 0; i < 5; i++) {
        dimensionRegistry.registerCustomDimension(`parkour:dimension_${i}`);
        dimensions.push({ typeId: `parkour:dimension_${i}`, using: false });
    }
});
