import { system, world } from "@minecraft/server";

function levelTick() {

}

system.runInterval(() => {
    let i = 0;
    for (const outline of world.getDimension("parkour:dimension_0").getEntities({ type: "parkour:outline" })) {
        if (i == 0) {
            outline.setProperty("parkour:size_x", 1)
            outline.setProperty("parkour:size_y", 1)
            outline.setProperty("parkour:size_z", 1)
        }
        outline.setProperty("parkour:red", 1)
        outline.setProperty("parkour:alpha",
             ((Math.sin(system.currentTick / 10) + 1) / 2) / 2
        );
        // console.warn("a")
        i++
    }
})