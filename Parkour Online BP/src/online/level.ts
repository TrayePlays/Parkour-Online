import { api } from "main";
import { signIn } from "./account";
import { Player } from "@minecraft/server";
import { Level, SavedStructure } from "utils";

export interface OnlineLevel extends Level {
    id: string;
    version: number;
    update: number;
}

export interface OnlineLevelMetadata {
    creator: string;
    name: string;
    id?: string;
    description?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    difficulty: number;
    downloads: number;
    likes: number;
    dislikes: number;
    version: number;
    isOfficial: boolean;
    isFeatured: boolean;
    update: number;
}

export interface OnlineLevelData {
    structure: SavedStructure;
    ownerId: string;
}

export enum OnlineLevelSearchOption {
    Recent = "recent",
    Featured = "featured",
    Downloaded = "downloaded",
    Search = "search"
}

export async function getOnlineLevels(player: Player, option: OnlineLevelSearchOption = OnlineLevelSearchOption.Recent, text?: string): Promise<OnlineLevelMetadata[] | undefined> {
    const login = await signIn(player);
    if (!login) return;

    let query = `https://parkour-online-db-default-rtdb.firebaseio.com/levels.json?auth=${login?.idToken}`;

    if (option == OnlineLevelSearchOption.Recent) {
        query += `&orderBy="createdAt"&limitToLast=10`;
    } else if (option == OnlineLevelSearchOption.Featured) {
        query += `&orderBy="isFeatured"&equalTo=true`;
    } else if (option == OnlineLevelSearchOption.Search && text) {
        const search = encodeURIComponent(text);
        const end = encodeURIComponent(text + "\uf8ff");
        query += `&orderBy="name"&startAt="${search}"&endAt="${end}"`;
    }

    const levels = await api.sendHttpRequest(query);
    const data = levels.getData() as Record<string, OnlineLevelMetadata>;

    return Object.entries(data).map(([id, level]) => ({
        id,
        ...level
    }));
}

export function getUserId(username: string) {
    // const userData = 
}