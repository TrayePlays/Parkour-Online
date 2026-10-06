import { Block, BlockPermutation, BlockVolume, Dimension, EnchantmentType, Entity, EquipmentSlot, GameMode, ItemLockMode, ItemStack, Player, system, Vector2, Vector3, world } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { ServerResponse, ServerStatusResponse } from "api";
import { CustomDimension, dimensions } from "dimensions";
import { api } from "main";

export let overworld: Dimension;
export const DATABASE = "https://parkour-online-db-default-rtdb.firebaseio.com/"

world.afterEvents.worldLoad.subscribe(() => {
    overworld = world.getDimension("overworld")
})

export async function sleep(ticks: number) {
    await system.waitTicks(ticks);
    return;
}

export interface SpecialItemPlacement {
    position1?: Vector3;
}

export enum OutlineTypes {
    Checkpoint = "checkpoint",
    Death = "death",
    Finish = "finish",
    Spawn = "spawn",
}

export interface DisplayOutline {
    entity?: Entity;
    pos1: Vector3;
    pos2: Vector3;
    type: OutlineTypes;
}

export class ParkourPlayer extends Player {
    checkpoint?: Vector3;
    loggedIn?: boolean;
    displayOutlinesLoaded?: boolean;
    displayOutlines?: DisplayOutline[];
    isPlaytesting?: boolean
    startTime?: number;
    zonePlacement?: SpecialItemPlacement;
    deathZonePlacement?: SpecialItemPlacement
    checkpointPlacement?: SpecialItemPlacement;
    parkourLevel?: Level;
    userId?: string;
}

export interface FirebaseResponse {
    kind: string,
    idToken: string,
    email: string,
    refreshToken: string,
    expiresIn: string,
    localId: string
    error?: { code: number, message: string, errors: { message: string, domain: string, reason: string }[] }
}

export interface LevelMetadata {
    id: string; // level code
    creator: string;
    description: string;
    name: string;
    ownerId: string;
}

export interface SpawnSettings {
    defaultRotation: Vector2
}

export interface CheckpointSettings {
    enterMessage?: string;
}

export enum ZoneType {
    Point = "point",
    Area = "area"
}

export interface PointCheckpoint {
    type: ZoneType.Point;
    location: Vector3;
    respawnLocation: Vector3;
    settings?: CheckpointSettings;
}

export interface AreaCheckpoint {
    type: ZoneType.Area;
    locations: [Vector3, Vector3];
    respawnLocation: Vector3;
    settings?: CheckpointSettings;
}

export type Checkpoint = PointCheckpoint | AreaCheckpoint;

export interface PointDeathZone {
    type: ZoneType.Point;
    location: Vector3;
}

export interface AreaDeathZone {
    type: ZoneType.Area;
    locations: [Vector3, Vector3];
}

export type DeathZone = PointDeathZone | AreaDeathZone;

export interface LocationRotation {
    location: Vector3;
    rotation: Vector2;
}

export interface CustomLevelData {
    spawn: LocationRotation;
    endLocation: Vector3;
    checkpoints?: Checkpoint[];
    deathZones?: DeathZone[]
}

export interface Level extends BaseLevel {
    structure: SavedStructure;
    verified: boolean;
}

export interface BaseLevel {
    creator: string;
    name: string;
    customLevelData: CustomLevelData
    description?: string;
}

export interface SavedStructure {
    size: Vector3;
    palette: string[];
    blocks: number[];
}

export const LEVEL_DIFFICULTIES = [
    "Not Rated",
    "Very Easy",
    "Easy",
    "Normal",
    "Hard",
    "Very Hard",
    "Insane",
    "Impossible"
]

export function formatTypeId(typeId: string) {
    if (typeId.includes("minecraft:")) {
        let formattedString = typeId.split("minecraft:")[1].split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
    if (typeId.includes("traye:")) {
        let formattedString = typeId.split("traye:")[1].split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
    else {
        let formattedString = typeId.split("_").map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
        return formattedString;
    }
}

export function getSelectionBounds(pos1: Vector3, pos2: Vector3, add = 0) {
    return {
        minX: Math.min(pos1.x, pos2.x),
        maxX: Math.max(pos1.x, pos2.x) + add,

        minY: Math.min(pos1.y, pos2.y),
        maxY: Math.max(pos1.y, pos2.y) + add,

        minZ: Math.min(pos1.z, pos2.z),
        maxZ: Math.max(pos1.z, pos2.z) + add,
    };
}

export function getSelectionBoundsMaxMin(pos1: Vector3, pos2: Vector3, add = 0) {
    return [
        { x: Math.min(pos1.x, pos2.x), y: Math.min(pos1.y, pos2.y), z: Math.min(pos1.z, pos2.z) },
        { x: Math.max(pos1.x, pos2.x) + add, y: Math.max(pos1.y, pos2.y) + add, z: Math.max(pos1.z, pos2.z) + add }
    ]
}

export function isLocationInArea(location: Vector3, pos1: Vector3, pos2: Vector3) {
    const { minX, minY, minZ, maxX, maxY, maxZ } = getSelectionBounds(pos1, pos2, 0);

    return location.x >= minX &&
        location.x <= maxX &&
        location.y >= minY &&
        location.y <= maxY &&
        location.z >= minZ &&
        location.z <= maxZ;
}

export function isInside(locationChecking: Vector3, locations: Vector3[]) {
    const blockVolume = new BlockVolume(locations[0], locations[1])
    return blockVolume.isInside(locationChecking)
}

export function errorFunction(player: Player, message: string, sound: boolean = true, soundName: string = "note.bass", color: string = "§c") {
    player.sendMessage(`§8[§dServer§8] ${color}${message}`)
    if (sound) player.playSound(soundName)
}

export function workedFunction(player: Player, message: string, sound: boolean = true, soundName: string = "note.bell", color: string = "§a") {
    player.sendMessage(`§8[§dServer§8] ${color}${message}`)
    if (sound) player.playSound(soundName)
}

export function addItem(player: Player, itemId: string, amount: number = 1, itemSlot?: number, nameTag?: string, lore?: string[], lockMode: ItemLockMode = ItemLockMode.none, destroyBlocks?: string[], equipmentSlot?: EquipmentSlot, enchantments?: { type: string, level: number }) {
    const item = new ItemStack(itemId, amount)
    if (enchantments?.type != undefined) item.getComponent("enchantable")?.addEnchantment({ type: new EnchantmentType(enchantments.type), level: enchantments.level })
    item.lockMode = lockMode
    item.nameTag = nameTag
    item.setLore(lore)
    item.setCanDestroy(destroyBlocks)
    if (equipmentSlot == undefined && itemSlot == undefined) player.getComponent("inventory")!.container.addItem(item)
    else if (itemSlot != undefined) player.getComponent("inventory")!.container.setItem(itemSlot, item)
    else if (equipmentSlot != undefined) player.getComponent("equippable")!.setEquipment(equipmentSlot, item)
}

export function splitBytes(str: string, maxBytes = 32767): string[] {
    const chunks: string[] = [];
    let currentChunk = "";
    let currentByteCount = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const code = char.charCodeAt(0);

        let byteLength = 1;
        if (code > 0x7f && code <= 0x7ff) byteLength = 2;
        else if (code > 0x7ff && code <= 0xffff) byteLength = 3;
        else if (code > 0xffff) byteLength = 4;
        if (currentByteCount + byteLength > maxBytes) {
            chunks.push(currentChunk);
            currentChunk = "";
            currentByteCount = 0;
        }

        currentChunk += char;
        currentByteCount += byteLength;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

export function compressLZW(str: string): string {
    const dict: Record<string, number> = {};
    for (let i = 0; i < 256; i++) dict[String.fromCharCode(i)] = i;

    let phrase = str[0] || "";
    let dictSize = 256;
    let result = "";

    for (let i = 1; i < str.length; i++) {
        const currChar = str[i];
        const phraseAndChar = phrase + currChar;
        if (dict[phraseAndChar] !== undefined) {
            phrase = phraseAndChar;
        } else {
            result += String.fromCharCode(dict[phrase]);
            dict[phraseAndChar] = dictSize++;
            phrase = currChar;
        }
    }
    if (phrase !== "") result += String.fromCharCode(dict[phrase]);
    return result;
}

export function decompressLZW(compressed: string): string {
    const dict: Record<number, string> = {};
    for (let i = 0; i < 256; i++) dict[i] = String.fromCharCode(i);

    let currChar = compressed[0] || "";
    let oldPhrase = currChar;
    let result = currChar;
    let dictSize = 256;

    for (let i = 1; i < compressed.length; i++) {
        const code = compressed.charCodeAt(i);
        let phrase = dict[code] !== undefined ? dict[code] : oldPhrase + currChar;

        result += phrase;
        currChar = phrase[0];
        dict[dictSize++] = oldPhrase + currChar;
        oldPhrase = phrase;
    }
    return result;
}

export function getPlayerLevel(player: ParkourPlayer) {
    const levelName = dimensions.find((d) => d.typeId == player.dimension.id);
    if (levelName) {
        return getDimensionLevel(levelName)
    }
    return;
}

export function getDimensionLevel(dim: CustomDimension) {
    const levelName = world.getDynamicProperty(`parkourDimension|${dim.typeId}`) as string;
    if (levelName == undefined) return undefined;

    return getLevel(levelName);
}

// export function getCurrentLevelName(player: ParkourPlayer): string | undefined {
//     const currentLevel = player.getDynamicProperty("currentLevel") as string ?? undefined
//     if (currentLevel && player.parkourLevel?.name != currentLevel) player.parkourLevel = getLevel(currentLevel);
//     return player.getDynamicProperty("currentLevel") as string ?? undefined;
// }

export function createLevel(player: ParkourPlayer, name: string, description?: string) {
    const levelData: BaseLevel = {
        customLevelData: {
            spawn: { location: { x: 0, y: -63, z: 0 }, rotation: { x: 0, y: 0 } },
            endLocation: { x: 10, y: -63, z: 0 }
        },
        creator: player.name,
        name,
        description
    }
    // idk abt this system maybe make things like name and desc difficulty stuff in meta
    const lzw = compressLZW(JSON.stringify(levelData));
    const chunks = splitBytes(lzw);
    chunks.forEach((chunk, i) => {
        world.setDynamicProperty(`parkourLevel|${name}|${i}`, chunk)
    })
    world.setDynamicProperty(`parkourLevel|${name}|meta`, chunks.length);

    return levelData;
}

type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface CustomLevelDataUpdates {
    spawn?: DeepPartial<LocationRotation>;
    endLocation?: Partial<Vector3>;
    checkpoints?: Checkpoint[];
    deathZones?: DeathZone[];
}

interface LevelUpdates {
    name?: string;
    description?: string;
    structure?: SavedStructure;
    customLevelData?: CustomLevelDataUpdates;
}

export function verifyLevel(player: ParkourPlayer, level: Level) {
    level.verified = true;

    const lzw = compressLZW(JSON.stringify(level));
    const chunks = splitBytes(lzw);

    chunks.forEach((chunk, i) => {
        world.setDynamicProperty(`parkourLevel|${level.name}|${i}`, chunk);
    });

    world.setDynamicProperty(`parkourLevel|${level.name}|meta`, chunks.length);

    updateLevel(player.dimension.id, level);
}

export function saveLevel(player: ParkourPlayer, name: string, updates: LevelUpdates) {
    const oldLevelData = getLevel(name);
    if (!oldLevelData) return;

    const levelName = updates.name ?? oldLevelData.name;

    const levelData: Level = {
        ...oldLevelData,
        name: levelName,
        description: updates.description ?? oldLevelData.description,
        structure: updates.structure ?? oldLevelData.structure,
        verified: false,
        customLevelData: {
            ...oldLevelData.customLevelData,
            ...updates.customLevelData,
            spawn: {
                ...(oldLevelData.customLevelData.spawn ?? {}),
                ...(updates.customLevelData?.spawn ?? {}),
                location: {
                    ...(oldLevelData.customLevelData.spawn?.location ?? {}),
                    ...(updates.customLevelData?.spawn?.location ?? {}),
                },
                rotation: {
                    ...(oldLevelData.customLevelData.spawn?.rotation ?? {}),
                    ...(updates.customLevelData?.spawn?.rotation ?? {}),
                },
            },

            endLocation: {
                ...oldLevelData.customLevelData.endLocation,
                ...updates.customLevelData?.endLocation,
            },
        },
    };

    if (levelName !== name) {
        deleteLevel(name);
    }

    const lzw = compressLZW(JSON.stringify(levelData));
    const chunks = splitBytes(lzw);

    chunks.forEach((chunk, i) => {
        world.setDynamicProperty(`parkourLevel|${levelName}|${i}`, chunk);
    });

    world.setDynamicProperty(`parkourLevel|${levelName}|meta`, chunks.length);

    updateLevel(player.dimension.id, levelData);

    return levelData;
}

export function updateLevel(dimension: string, level: Level) {
    for (const player of (world.getPlayers().filter(p => p.dimension.id == dimension) as ParkourPlayer[])) {
        player.parkourLevel = level
    }
}

export function getDistance(location1: Vector3, location2: Vector3) {
    return Math.sqrt(Math.pow(location1.x - location2.x, 2) + Math.pow(location1.y - location2.y, 2) + Math.pow(location1.z - location2.z, 2));
}

export function getCenter(location1: Vector3, location2: Vector3): Vector3 {
    const minX = Math.min(location1.x, location2.x);
    const minY = Math.min(location1.y, location2.y);
    const minZ = Math.min(location1.z, location2.z);

    const halfX = Math.abs(location1.x - location2.x) / 2;
    const halfY = Math.abs(location1.y - location2.y) / 2;
    const halfZ = Math.abs(location1.z - location2.z) / 2;

    return { x: minX + halfX, y: minY + halfY, z: minZ + halfZ };
}

export function deleteLevel(name: string) {
    const meta = world.getDynamicProperty(`parkourLevel|${name}|meta`) as number
    if (meta == undefined) return false;
    for (let i = 0; i < meta; i++) {
        world.setDynamicProperty(`parkourLevel|${name}|${i}`);
    }
    world.setDynamicProperty(`parkourLevel|${name}|meta`);
    return true;
}

export function isInsideLevelArea(player: Player) {
    return dimensions.map(d => d.typeId).includes(player.dimension.id);
}

export function getLevelNames(): string[] {
    return world.getDynamicPropertyIds()
        .filter(
            dp => dp.startsWith("parkourLevel") && dp.endsWith("meta")
        ).map(
            dp => dp.split("parkourLevel|")[1].split("|meta")[0]
        )
        .sort();
}

export function migrateLevel(level: Level): Level {
    const data = level.customLevelData as any;

    if (data == undefined) return level;

    if (data.spawnLocation != undefined && data.spawn == undefined) {
        data.spawn = {
            location: data.spawnLocation,
            rotation: { x: 0, y: 0 }
        };
    }

    delete data.spawnLocation;

    return level;
}

export function getLevel(name: string, player?: ParkourPlayer): Level | undefined {
    const levelMeta = world.getDynamicProperty(`parkourLevel|${name}|meta`) as number
    if (levelMeta == undefined) return;
    let levelDataRaw = "";
    for (let i = 0; i < levelMeta; i++) {
        levelDataRaw += world.getDynamicProperty(`parkourLevel|${name}|${i}`);
    }
    const levelDataDecompressed = decompressLZW(levelDataRaw);
    try {
        const level = JSON.parse(levelDataDecompressed) as Level
        if (player) player.parkourLevel = level
        return migrateLevel(level);
    } catch { };
}

export function getBlockKey(block: Block): string {
    const states = block.permutation.getAllStates();
    // const otherStates: Record<string, string | boolean | number> = { waterLogged: block.isWaterlogged }
    // const all: Record<string, string | boolean | number> = {
    //     ...states,
    //     ...otherStates
    // }
    const stateEntries = Object.entries(states).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join(",");

    return `${block.typeId}{${stateEntries}}`;
}

export function runSaveStructure(dimension: Dimension, pos1: Vector3, pos2: Vector3, onProgress?: (count: number, total: number) => void, onDone?: (structure: SavedStructure) => void) {
    system.runJob(saveStructure(dimension, pos1, pos2, onProgress, onDone))
}

interface ItemData {
    typeId: string;
    props: {
        amount: number,
        keepOnDeath: boolean,
        lockMode: ItemLockMode,
        nameTag?: string
    };
    lore?: string[]
    components: {
        enchantable?: { type: string, level: number }[]
        durability?: number
    }
}

function saveInventory(player: ParkourPlayer) {
    let { container, inventorySize } = player.getComponent("inventory")!;
    const invName = player.id;
    const items = [];
    const listOfEquipmentSlots = [EquipmentSlot.Head, EquipmentSlot.Body, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
    let wornArmor = [];
    for (let i = 0; i < listOfEquipmentSlots.length; i++) {
        const equipment = player.getComponent("equippable")!.getEquipment(listOfEquipmentSlots[i]);
        if (!equipment) {
            wornArmor.push(null);
            continue;
        }
        const data: ItemData = {
            typeId: equipment.typeId,
            props: {
                amount: equipment.amount,
                keepOnDeath: equipment.keepOnDeath,
                lockMode: equipment.lockMode
            },
            lore: equipment.getLore(),
            components: {}
        };
        if (equipment.nameTag) data.props.nameTag = equipment.nameTag;
        if (equipment.getComponent("enchantable")?.isValid) {
            data.components.enchantable = equipment.getComponent("enchantable")!.getEnchantments().map(e => ({ type: e.type.id, level: e.level }));
        }
        if (equipment.getComponent("durability")?.isValid) {
            data.components.durability = equipment.getComponent("durability")!.damage;
        }
        wornArmor.push(data);
    }
    player.setDynamicProperty(`armor:${invName}`, JSON.stringify(wornArmor));

    for (let i = 0; i < inventorySize; i++) {
        const item = container.getItem(i);
        if (!item) {
            items.push(null);
            continue;
        }
        const data: ItemData = {
            typeId: item.typeId,
            props: {
                amount: item.amount,
                keepOnDeath: item.keepOnDeath,
                lockMode: item.lockMode
            },
            lore: item.getLore(),
            components: {}
        };
        if (item.nameTag) data.props.nameTag = item.nameTag;
        if (item.getComponent("enchantable")?.isValid) {
            data.components.enchantable = item.getComponent("enchantable")!.getEnchantments().map(e => ({ type: e.type.id, level: e.level }));
        }
        if (item.getComponent("durability")?.isValid) {
            data.components.durability = item.getComponent("durability")!.damage;
        }
        items.push(data);
    }
    player.setDynamicProperty(`inventory:${invName}`, JSON.stringify(items));
    return { items, wornArmor };
}

function loadInventory(player: ParkourPlayer) {
    let { container, inventorySize } = player.getComponent("inventory")!;
    const invName = player.id;
    const items = JSON.parse(player.getDynamicProperty(`inventory:${invName}`) as string ?? "[]") as ItemData[];
    const wornArmor = JSON.parse(player.getDynamicProperty(`armor:${invName}`) as string ?? "[]") as ItemData[];
    const listOfEquipmentSlots = [EquipmentSlot.Head, EquipmentSlot.Body, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand];
    for (let i = 0; i < listOfEquipmentSlots.length; i++) {
        const equipment = player.getComponent("equippable")!
        const data = wornArmor[i];
        if (!data) {
            container.setItem(i, undefined);
        } else {
            const item = new ItemStack(data.typeId);
            for (const key in data.props) {
                // @ts-ignore
                item[key] = data.props[key];
            }
            item.setLore(data.lore);
            if (data.components.enchantable) {
                item.getComponent("enchantable")!.addEnchantments(data.components.enchantable.map(e => ({ ...e, type: new EnchantmentType(e.type) })));
            }
            if (data.components.durability) {
                item.getComponent("durability")!.damage = data.components.durability;
            }
            equipment.setEquipment(listOfEquipmentSlots[i], item);
        }
    }
    for (let i = 0; i < inventorySize; i++) {
        const data = items[i];
        if (!data) {
            container.setItem(i, undefined);
        } else {
            const item = new ItemStack(data.typeId);
            for (const key in data.props) {
                // @ts-ignore
                item[key] = data.props[key];
            }
            item.setLore(data.lore);
            if (data.components.enchantable) {
                item.getComponent("enchantable")!.addEnchantments(data.components.enchantable.map(e => ({ ...e, type: new EnchantmentType(e.type) })));
            }
            if (data.components.durability) {
                item.getComponent("durability")!.damage = data.components.durability;
            }
            container.setItem(i, item);
        }
    }
}

export function _playLevel(player: ParkourPlayer, level: Level) {
    player.camera.fade({ fadeTime: { fadeInTime: 0, fadeOutTime: 0.1, holdTime: 0 } });
    player.setDynamicProperty("oldLocation", player.location);
    player.setDynamicProperty("oldRotation", { x: player.getRotation().x, y: player.getRotation().y, z: 0 });
    saveInventory(player);
    player.checkpoint = undefined;
    player.startTime = system.currentTick;
    player.isPlaytesting = false;
    player.runCommand("clear");
    player.runCommand("effect @s clear");
    player.clearVelocity();
    addItem(player, "parkour:stop", 1, 8, undefined, undefined, ItemLockMode.inventory);
    const { x, y, z } = level.customLevelData.spawn.location
    player.teleport({ x: x + 0.5, y: y, z: z + 0.5 }, { rotation: level.customLevelData.spawn.rotation });
    player.setGameMode(GameMode.Adventure);
}

export function playtestLevel(player: ParkourPlayer, level: Level) {
    player.camera.fade({ fadeTime: { fadeInTime: 0, fadeOutTime: 0.1, holdTime: 0 } });
    player.setDynamicProperty("oldLocation", player.location);
    player.setDynamicProperty("oldRotation", { x: player.getRotation().x, y: player.getRotation().y, z: 0 });
    // save inv and stuff
    saveInventory(player);
    player.checkpoint = undefined;
    player.startTime = system.currentTick;
    player.isPlaytesting = true;
    player.runCommand("clear");
    player.runCommand("effect @s clear")
    player.clearVelocity();
    addItem(player, "parkour:stop", 1, 8, undefined, undefined, ItemLockMode.inventory);
    const { x, y, z } = level.customLevelData.spawn.location
    player.teleport({ x: x + 0.5, y: y, z: z + 0.5 }, { rotation: level.customLevelData.spawn.rotation });
    player.setGameMode(GameMode.Adventure);
}

export function returnToEditor(player: ParkourPlayer, level: Level) {
    if (!player.isPlaytesting) return;
    const loc = player.getDynamicProperty("oldLocation") as Vector3
    player.camera.fade({ fadeTime: { fadeInTime: 0, fadeOutTime: 0.1, holdTime: 0 } });
    player.isPlaytesting = false;
    if (!player.isFlying && (player.dimension.getTopmostBlock(loc) ?? { y: -1000 }).y + 1 != Math.floor(loc.y)) {
        const removeSlowFallingOnMovement = system.runInterval(() => {
            player.applyKnockback({ x: 0, z: 0 }, 0.034);
            if ((JSON.stringify(player.inputInfo.getMovementVector()) != JSON.stringify({ x: 0, y: 0 })) || player.isJumping || player.isSneaking) {
                system.clearRun(removeSlowFallingOnMovement)
            }
        })

        system.runTimeout(() => {
            system.clearRun(removeSlowFallingOnMovement)
        }, 500);
    }
    player.runCommand("clear");
    loadInventory(player);
    player.teleport(loc, { rotation: player.getDynamicProperty("oldRotation") as Vector2 });
    player.setGameMode(GameMode.Creative);
}

export function* saveStructure(dimension: Dimension, pos1: Vector3, pos2: Vector3, onProgress?: (count: number, total: number) => void, onDone?: (structure: SavedStructure) => void): Generator<void, void, void> {
    const { maxX, maxY, maxZ, minX, minY, minZ } = getSelectionBounds(pos1, pos2)
    const tickingAreaName = `${dimension.id}_structureSave_${Date.now()}`
    if (world.tickingAreaManager.getTickingArea(tickingAreaName)) {
        world.tickingAreaManager.removeTickingArea(tickingAreaName)
    }

    const palette: string[] = [];
    const blocks: number[] = [];

    let x = minX;
    let y = minY;
    let z = minZ;

    const max = (Math.abs(maxX - minX) + 1) * (Math.abs(maxY - minY) + 1) * (Math.abs(maxZ - minZ) + 1);

    let waitingForChunk = false;

    let lastIndex = -1;
    let runCount = 0;
    let totalProcessed = 0;

    while (y <= maxY) {
        while (z <= maxZ) {
            while (x <= maxX) {
                if (!dimension.isChunkLoaded({ x, y, z })) {
                    waitingForChunk = true;
                    try {
                        world.tickingAreaManager.createTickingArea(tickingAreaName, { dimension, from: { x: minX, y: minY, z: minZ }, to: { x: maxX, y: maxY, z: maxZ } }).then(() => {
                            waitingForChunk = false;
                        });
                    } catch { };

                    continue;
                }

                const block = dimension.getBlock({ x, y, z });
                let index = 0;

                if (!block) {
                    index = 0;
                } else {
                    const key = getBlockKey(block);

                    index = palette.indexOf(key);

                    if (index === -1) {
                        palette.push(key);
                        index = palette.length - 1;
                    }
                }

                if (totalProcessed === 0) {
                    lastIndex = index;
                    runCount = 1;
                } else if (index === lastIndex) {
                    runCount++;
                } else {
                    blocks.push(runCount, lastIndex);
                    lastIndex = index;
                    runCount = 1;
                }

                x++;
                totalProcessed++;

                if (totalProcessed % 5000 === 0) {
                    if (onProgress) onProgress(totalProcessed, max);
                    yield;
                }
            }
            x = minX;
            z++;
        }
        z = minZ;
        y++;
    }

    if (runCount > 0) {
        blocks.push(runCount, lastIndex);
    }

    const result: SavedStructure = {
        size: {
            x: maxX - minX + 1,
            y: maxY - minY + 1,
            z: maxZ - minZ + 1
        },
        palette,
        blocks
    };

    if (world.tickingAreaManager.getTickingArea(tickingAreaName)) {
        world.tickingAreaManager.removeTickingArea(tickingAreaName)
    }

    if (onDone) onDone(result);
}

function parseBlockKey(key: string): { id: string, states: Record<string, any> } {
    const match = key.match(/^(.*?)\{(.*)\}$/);

    if (!match) {
        return { id: key, states: {} };
    }

    const [, id, stateString] = match;

    const states: Record<string, any> = {};

    if (stateString.trim().length > 0) {
        stateString.split(",").forEach(pair => {
            const [k, v] = pair.split("=");

            let value: any = v;
            if (v === "true") value = true;
            else if (v === "false") value = false;
            else if (!isNaN(Number(v))) value = Number(v);

            states[k] = value;
        });
    }

    return { id, states };
}

export function runLoadStructure(structure: SavedStructure, dimension: Dimension, location: Vector3, onDone?: () => void) {
    system.runJob(loadStructure(structure, dimension, location, onDone))
}

export function* loadStructure(structure: SavedStructure, dimension: Dimension, location: Vector3, onDone?: () => void) {
    const tickingAreaName = `${dimension.id}_structureLoad_${Date.now()}`
    if (world.tickingAreaManager.getTickingArea(tickingAreaName)) {
        world.tickingAreaManager.removeTickingArea(tickingAreaName)
    }
    let i = 0;

    const minX = location.x;
    const minY = location.y;
    const minZ = location.z;

    const maxX = location.x + structure.size.x;
    const maxY = location.y + structure.size.y;
    const maxZ = location.z + structure.size.z;

    let tickingAreaCreated = false;

    let rleIndex = 0;
    let currentRunCount = 0;
    let paletteIndex = 0;

    const sizeX = structure.size.x;
    const sizeZ = structure.size.z;

    for (let y = 0; y < structure.size.y; y++) {
        for (let z = 0; z < structure.size.z; z++) {
            for (let x = 0; x < structure.size.x; x++) {

                if (currentRunCount === 0) {
                    if (rleIndex >= structure.blocks.length) break;
                    currentRunCount = structure.blocks[rleIndex++];
                    paletteIndex = structure.blocks[rleIndex++];
                }

                const key = structure.palette[paletteIndex];
                const { id, states } = parseBlockKey(key);

                if (!key || id == "minecraft:air") {
                    let currentFlatIndex = x + (z * sizeX) + (y * sizeX * sizeZ);

                    currentFlatIndex += currentRunCount;
                    i += currentRunCount;
                    currentRunCount = 0;

                    x = currentFlatIndex % sizeX;
                    const remainingZ = Math.floor(currentFlatIndex / sizeX);
                    z = remainingZ % sizeZ;
                    y = Math.floor(remainingZ / sizeZ);
                    x--;

                    if (i % 5000 === 0) {
                        yield;
                    }
                    continue;
                }

                const worldX = location.x + x;
                const worldY = location.y + y;
                const worldZ = location.z + z;

                if (!dimension.isChunkLoaded({ x: worldX, y: worldY, z: worldZ })) {

                    if (!tickingAreaCreated) {
                        try {
                            world.tickingAreaManager.createTickingArea(tickingAreaName, { dimension, from: { x: minX, y: minY, z: minZ }, to: { x: maxX, y: maxY, z: maxZ } }).then(() => {
                                tickingAreaCreated = true;
                            });
                        } catch { }
                    }

                    while (!dimension.isChunkLoaded({ x: worldX, y: worldY, z: worldZ })) {
                        yield;
                    }
                }

                currentRunCount--;

                const block = dimension.getBlock({ x: worldX, y: worldY, z: worldZ });

                if (!block) {
                    i++;
                    if (i % 5000 === 0) {
                        yield;
                    }
                    continue;
                }

                const perm = BlockPermutation.resolve(id, states)

                block.setType(id);
                block.setPermutation(perm);

                i++;
                if (i % 5000 === 0) {
                    yield;
                }
            }
        }
    }
    if (world.tickingAreaManager.getTickingArea(tickingAreaName)) {
        world.tickingAreaManager.removeTickingArea(tickingAreaName)
    }

    if (onDone) onDone()
}

export function generateLevelCode(): string {
    const allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codeLength = 8;
    let code = "";

    for (let i = 0; i < codeLength; i++) {
        const randomIndex = Math.floor(Math.random() * allowedChars.length);
        code += allowedChars[randomIndex];
    }

    return code;
}

export function metadataToArray(firebaseData: Record<string, any>): LevelMetadata[] {
    if (!firebaseData) return [];

    return Object.entries(firebaseData).map(([code, details]) => {
        return {
            id: code,
            creator: details.creator,
            description: details.description,
            name: details.name,
            ownerId: details.ownerId
        };
    });
}