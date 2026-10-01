import { world, system } from "@minecraft/server"
import { HivemindAPI, ServerStatusResponse } from "api.js";

import "./commands.js"
import "./level.js"
import "./outline.js"
import "./specialItems.js"
import "./ui.js"

export const api = new HivemindAPI("ParkourOnline", { onConnect: onConnect });
export const PARKOUR_VERSION = 0.01;

system.run(() => {
    world.sendMessage(`§8[§3Parkour Online§8] §eReloaded scripts §7(things may break)`);
})

async function onConnect() {
    const noUpdateMessage = world.getDynamicProperty("updateMessage") as boolean ?? false;
    if (noUpdateMessage == true) return;
    const updateReq = await api.sendHttpRequest("https://raw.githubusercontent.com/TrayePlays/Parkour-Online/main/version.json");

    if (updateReq.status == ServerStatusResponse.Success) {
        const data = JSON.parse(updateReq.getData()) as { version: number };
        console.warn(updateReq.data)
        if (data.version > PARKOUR_VERSION) {
            world.sendMessage(`\n§cThis version of Parkour Online is outdated, Update to play levels on the latest version! §7(/song:settings to disable message)`);
        }
    }
}

world.afterEvents.playerSpawn.subscribe(({ initialSpawn }) => {
    if (initialSpawn) world.getPlayers({ name: "TrayePlays" })[0]?.playSound("random.toast")
})

world.afterEvents.playerLeave.subscribe(() => {
    world.getPlayers({ name: "TrayePlays" })[0]?.playSound("mob.villager.no")
})