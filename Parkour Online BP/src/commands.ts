import { CustomCommandParamType, CommandPermissionLevel, system, world, CustomCommand, CustomCommandOrigin, Entity, Player, CustomCommandResult, CustomCommandStatus, GameMode } from "@minecraft/server"
import { SimulatedPlayer } from "@minecraft/server-gametest"

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    const dpCheck: CustomCommand = {
        name: "traye:dps",
        description: "checks dps",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Selector", type: CustomCommandParamType.EntitySelector },
            { name: "traye:option2", type: CustomCommandParamType.Enum }
        ],
        optionalParameters: [
            { name: "Name", type: CustomCommandParamType.String },
            { name: "Value", type: CustomCommandParamType.String }
        ]
    }
    const property: CustomCommand = {
        name: "traye:property",
        description: "checks properties",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Selector", type: CustomCommandParamType.EntitySelector },
            { name: "traye:option2", type: CustomCommandParamType.Enum }
        ],
        optionalParameters: [
            { name: "Name", type: CustomCommandParamType.String },
            { name: "Value", type: CustomCommandParamType.String }
        ]
    }
    const worlddpCheck: CustomCommand = {
        name: "traye:dpsworld",
        description: "checks dps",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "traye:option2", type: CustomCommandParamType.Enum }
        ],
        optionalParameters: [
            { name: "Name", type: CustomCommandParamType.String },
            { name: "Value", type: CustomCommandParamType.String }
        ]
    }
    const resetPlayer: CustomCommand = {
        name: "traye:reset",
        description: "resets player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Name", type: CustomCommandParamType.PlayerSelector },
        ]
    }
    const spawnPlayer: CustomCommand = {
        name: "traye:bot",
        description: "spawn bots",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Bot Option", type: CustomCommandParamType.Enum, enumName: "traye:bot_options" },
            { name: "Bot Name", type: CustomCommandParamType.String },
            { name: "Bot Count", type: CustomCommandParamType.Integer }
        ],
        optionalParameters: [
            { name: "Gamemode?", type: CustomCommandParamType.Enum, enumName: "traye:gamemode" }
        ]
    }
    const muteList: CustomCommand = {
        name: "traye:mutelist",
        description: "gets mutelist",
        permissionLevel: CommandPermissionLevel.GameDirectors
    }
    const banList: CustomCommand = {
        name: "traye:banlist",
        description: "gets banlist",
        permissionLevel: CommandPermissionLevel.GameDirectors
    }
    const tags: CustomCommand = {
        name: "traye:tags",
        description: "gets tags",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Player", type: CustomCommandParamType.PlayerSelector }
        ]
    }
    const kickPlayer: CustomCommand = {
        name: "traye:kick",
        description: "kick a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Player", type: CustomCommandParamType.PlayerSelector }
        ]
    }
    const banPlayer: CustomCommand = {
        name: "traye:ban",
        description: "bans a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            { name: "Name", type: CustomCommandParamType.PlayerSelector },
            { name: "Reason", type: CustomCommandParamType.String }
        ]
    }
    const test: CustomCommand = {
        name: "traye:test",
        description: "testing",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            { name: "arg1", type: CustomCommandParamType.String },
            { name: "arg2", type: CustomCommandParamType.String },
            { name: "arg3", type: CustomCommandParamType.String },
            { name: "arg4", type: CustomCommandParamType.String },
            { name: "arg5", type: CustomCommandParamType.String },
        ]
    }

    customCommandRegistry.registerEnum("traye:option2", ["set", "get"])
    customCommandRegistry.registerEnum("traye:gamemode", [GameMode.Adventure, GameMode.Creative, GameMode.Spectator, GameMode.Survival])
    customCommandRegistry.registerEnum("traye:bot_options", ["spawn", "remove"])
    customCommandRegistry.registerCommand(test, testCMD)
    customCommandRegistry.registerCommand(property, checkProperty)
    customCommandRegistry.registerCommand(worlddpCheck, worldCheckDP)
    customCommandRegistry.registerCommand(dpCheck, checkDP)
    customCommandRegistry.registerCommand(resetPlayer, reset)
    customCommandRegistry.registerCommand(kickPlayer, kick)
    customCommandRegistry.registerCommand(tags, getTags)
})

export enum BotOptions {
    Spawn = "spawn",
    Remove = "remove"
}

export let bots: SimulatedPlayer[] = []

function testCMD(origin: CustomCommandOrigin, arg1: string, arg2: string, arg3: string, arg4: string, arg5: string): CustomCommandResult {
    system.run(() => {
        //use instead of scriptevent
    })
    return {
        status: CustomCommandStatus.Success
    };
}

function getTags(origin: CustomCommandOrigin, players: Player[]): CustomCommandResult {
    system.run(() => {
        for (const player of players) {
            console.warn(`§6${player.name}§f has §a${player.getTags().length}§f tags: §a${JSON.stringify(player.getTags())}`)
        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}

function kick(origin: CustomCommandOrigin, players: Player[]): CustomCommandResult {
    system.run(() => {
        for (const player of players) {
            player.triggerEvent("traye:kick")
        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}

function determineType(input: any) {
    if (!isNaN(input)) {
        return Number(input);
    }
    else if (input.toLowerCase() === "true" || input.toLowerCase() === "false") {
        return input.toLowerCase() === "true";
    }
    else if (input.toLowerCase() == "undefined") {
        return undefined
    }
    else {
        return input
    }
}

function worldCheckDP(orgin: CustomCommandOrigin, option: string, dp: string, value: any): CustomCommandResult {
    system.run(() => {
        if (option == "get") {
            if (dp == "" || dp == undefined) {
                for (const dp of world.getDynamicPropertyIds()) {
                    console.warn(`${dp}: ${world.getDynamicProperty(dp)}`)
                }
            }
            else console.warn(`${dp}: ${world.getDynamicProperty(dp)}`)
        }
        if (option == "set") {
            console.warn(`set dp: ${dp} to ${value}`)
            world.setDynamicProperty(dp, determineType(value))
        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}

/** @param {Entity[]} entities  */
function checkProperty(orgin: CustomCommandOrigin, entities: Entity[], option: string, dp: "string", value: any): CustomCommandResult {
    system.run(() => {
        for (const entity of entities) {
            if (option == "get") {
                console.warn(`${dp}: ${entity.getProperty(dp)}`)
            }
            if (option == "set") {
                entity.setProperty(dp, determineType(value))
            }
        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}

function checkDP(orgin: CustomCommandOrigin, entities: Entity[], option: string, dp: string, value: any): CustomCommandResult {
    system.run(() => {
        for (const entity of entities) {
            if (option == "get") {
                if (dp == "" || dp == undefined) {
                    for (const dp of entity.getDynamicPropertyIds()) {
                        console.warn(`${dp}: ${entity.getDynamicProperty(dp)}`)
                    }
                }
                else console.warn(`${dp}: ${entity.getDynamicProperty(dp)}`)
            }
            if (option == "set") {
                console.warn(`set dp: ${dp} to ${value}`)
                entity.setDynamicProperty(dp, determineType(value))
            }
        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}

function reset(orgin: CustomCommandOrigin, players: Player[]) {
    system.run(() => {
        for (const player of players) {

        }
    })
    return {
        status: CustomCommandStatus.Success
    };
}