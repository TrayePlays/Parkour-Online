import { MolangVariableMap, system, world } from "@minecraft/server";
import { getCenter } from "utils";

function levelTick() {

}

system.runInterval(() => {
    let i = 0;
    for (const outline of world.getDimension("parkour:dimension_0").getEntities({ type: "parkour:outline" })) {
        const size =
        (((Math.sin(system.currentTick / 10) + 1) / 2) * 10) + 1
        outline.setProperty("parkour:size_x", size)
        outline.setProperty("parkour:size_y", size)
        outline.setProperty("parkour:size_z", size)
        const sinWave = ((Math.sin(system.currentTick / 40) + 1) / 2) * 255 / 255
        outline.setProperty("parkour:red", sinWave)
        outline.setProperty("parkour:green", (1 + sinWave) / 255)
        outline.setProperty("parkour:blue", (1 + sinWave) / 255)
        const molang = new MolangVariableMap();
        molang.setFloat("variable.index", 1);
        molang.setFloat("variable.lifetime", 0.065);
        molang.setFloat("variable.size", size / 2);
        molang.setFloat("variable.color.r", 1)
        molang.setFloat("variable.color.g", 1)
        molang.setFloat("variable.color.b", 1)
        molang.setFloat("variable.color.a", 1)
        const {x,y,z} = outline.location
        const center = getCenter(outline.location, {x: x + size - 1, y: y + size, z: z - size + 1})
        outline.dimension.spawnParticle("parkour:finish", {x: center.x, y: center.y, z: center.z}, molang);
        outline.setProperty("parkour:alpha", 0.15);
        i++
    }
})