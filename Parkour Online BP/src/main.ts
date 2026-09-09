import { world, system } from "@minecraft/server"
import { HivemindAPI } from "api.js";

import "./commands.js"
import "./level.js"
import "./specialItems.js"
import "./ui.js"

export const api = new HivemindAPI("ParkourOnline", { onConnect: onConnect });
export const VERSION = 0.1;

system.run(() => {
    world.sendMessage(`§8[§3Parkour Online§8] §eReloaded scripts §7(things may break)`);
})

function onConnect() {
    console.warn("On connection!");
}

world.afterEvents.playerSpawn.subscribe(({ initialSpawn }) => {
    if (initialSpawn) world.getPlayers({ name: "TrayePlays" })[0]?.playSound("random.toast")
})

world.afterEvents.playerLeave.subscribe(() => {
    world.getPlayers({ name: "TrayePlays" })[0]?.playSound("mob.villager.no")
})