import { Player, world } from "@minecraft/server";
import { api, PARKOUR_VERSION } from "main";
import { compressLZW, DATABASE, splitBytes } from "utils";
import { signIn } from "./account";
import { OnlineLevelData, OnlineLevelMetadata } from "./level";
import { ServerStatusResponse } from "api";

export async function downloadLevel(player: Player, levelMeta: OnlineLevelMetadata, onProgress: (chunks: number, totalChunks: number) => void, onError: (error: string) => void) {
    if (levelMeta.version != PARKOUR_VERSION) return onError("version");
    const login = await signIn(player);
    if (!levelMeta.id) return onError("noId");
    if (!login) return onError("login");

    const levelReq = await api.sendHttpRequest(DATABASE + `levels/${levelMeta.id}.json?auth=${login.idToken}`, undefined, undefined, undefined, onProgress);
    if (levelReq.status == ServerStatusResponse.Failure) return onError("online");
    const levelData = levelReq.getData() as OnlineLevelData;

    // const levelData: OnlineLevel = {
    //     customLevelData: {
    //         spawn: { location: { x: 0, y: -63, z: 0 }, rotation: { x: 0, y: 0 } },
    //         endLocation: { x: 10, y: -63, z: 0 }
    //     },
    //     creator: player.name,
    //     name,
    //     description
    // }
    // idk abt this system maybe make things like name and desc difficulty stuff in meta
    // const lzw = compressLZW(JSON.stringify(levelData));
    // const chunks = splitBytes(lzw);
    // chunks.forEach((chunk, i) => {
    //     world.setDynamicProperty(`onlineLevel|${name}|${i}`, chunk)
    // })
    // world.setDynamicProperty(`onlineLevel|${name}|meta`, chunks.length);
} 