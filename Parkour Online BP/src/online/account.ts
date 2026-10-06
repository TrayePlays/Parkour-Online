import { Player } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import { ServerResponse, ServerStatusResponse } from "api";
import { api, PARKOUR_VERSION } from "main";
import { generateLevelCode, Level, sleep } from "utils";
import { OnlineLevelData, OnlineLevelMetadata } from "./level";

export const API_KEY = "\u0041\u0049\u007A\u0061\u0053\u0079\u0043\u0051\u006C\u0036\u0032\u0041\u0078\u0061\u006E\u0042\u0036\u0069\u0052\u0052\u0032\u0063\u0078\u0054\u0051\u004E\u007A\u002D\u004D\u0073\u0074\u006B\u0066\u0069\u0045\u0030\u0046\u0045\u0051";
export const EMAIL_HEADER = "@parkouronline.local";

interface LoginData {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresAt: string;
}

interface FirebaseRefreshResponse {
    expires_in: string;
    token_type: string;
    refresh_token: string;
    id_token: string;
    user_id: string;
}

//#region Account and Session
export function checkAccount(player: Player) {
    const expiresAt = Number(player.getDynamicProperty("expiresAt"));

    if (!expiresAt) return false;
    // plus a minute so no weirdness
    return expiresAt > Date.now() + 60000;
}

export async function refreshPlayerSession(player: Player): Promise<LoginData | null> {
    const savedRefreshToken = player.getDynamicProperty("refreshToken") as string;

    if (!savedRefreshToken) {
        console.warn("No refresh token found in storage. Player must log in manually.");
        return null;
    }

    const url = `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`;

    try {
        const response = await api.sendHttpRequest(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=refresh_token&refresh_token=${savedRefreshToken}`
        });

        const data: FirebaseRefreshResponse = await response.getData();

        if (response.status == ServerStatusResponse.Success) {
            console.warn("Session successfully renewed! Token valid for 1 hour");

            const expiresAt = Date.now() + parseInt(data.expires_in, 10) * 1000;

            player.setDynamicProperty("idToken", data.id_token);
            player.setDynamicProperty("refreshToken", data.refresh_token);
            player.setDynamicProperty("expiresAt", expiresAt);
            player.setDynamicProperty("localId", data.user_id);

            return {
                idToken: data.id_token,
                refreshToken: data.refresh_token,
                localId: data.user_id,
                expiresAt: expiresAt.toString()
            };
        }

        console.warn("Refresh token has expired or is invalid. Clearing local session.");

        player.setDynamicProperty("idToken");
        player.setDynamicProperty("refreshToken");
        player.setDynamicProperty("expiresAt");
        player.setDynamicProperty("localId");

        return null;
    } catch (error) {
        console.warn("Network error attempting to refresh session:", error);
        return null;
    }
}

//#region UI
async function promptPassword(player: Player) {
    const form = new ModalFormData();

    form.title("Sign In");
    form.textField("Password", "enter your password");
    form.toggle(`Remember Me`, { defaultValue: false });

    const { canceled, formValues } = await form.show(player);

    if (canceled || formValues == undefined) return null;

    const password = formValues[0] as string;
    const rememberMe = formValues[1] as boolean;

    return {
        password,
        rememberMe
    };
}

//#region Authentication
export async function login(username: string, password: string) {
    const email = username + EMAIL_HEADER;

    const response = await api.sendHttpRequest(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true
        })
    });

    if (response.status == ServerStatusResponse.Success) {
        const data = await response.getData();

        console.warn(response.data);

        if (data.error) {
            console.warn(data.error.message);
            return;
        }

        console.warn("Logged in:", data.localId);

        return data;
    } else {
        return response.data;
    }
}

export async function createAccount(username: string, password: string): Promise<ServerResponse> {
    const email = username + EMAIL_HEADER;

    const response = await api.sendHttpRequest(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true
        })
    });

    if (response.status != ServerStatusResponse.Success) {
        return response;
    }

    const data = await response.getData();

    if (data.error) {
        console.warn(data.error.message);
        return data;
    }

    console.warn(JSON.stringify(data));
    console.warn("Created UID:", data.localId);
    console.warn("Token:", data.idToken);

    let success = false;
    let attempts = 0;

    while (!success) {
        if (attempts >= 10) break;

        const userReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/users/${data.localId}.json?auth=${data.idToken}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username
            })
        });

        if (userReq.status == ServerStatusResponse.Success) {
            success = true;
            break;
        }

        attempts++;
        await sleep(10);
    }

    return data;
}

export async function signIn(player: Player): Promise<LoginData | undefined> {
    const ping = await api.sendPingRequest();

    if (ping.status != ServerStatusResponse.Success) {
        player.sendMessage("You need to run /function connect");
        return;
    }

    if (checkAccount(player)) {
        console.warn("returned og values")
        return {
            localId: player.getDynamicProperty("localId") as string,
            idToken: player.getDynamicProperty("idToken") as string,
            refreshToken: player.getDynamicProperty("refreshToken") as string,
            expiresAt: player.getDynamicProperty("expiresAt") as string
        };
    }

    const refreshToken = player.getDynamicProperty("refreshToken") as string;

    if (refreshToken) {
        const session = await refreshPlayerSession(player);

        if (session) {
            return session;
        }
    }

    let password = player.getDynamicProperty("password") as string;
    const rememberMe = player.getDynamicProperty("rememberMe") as boolean ?? true;

    if (!password) {
        const prompt = await promptPassword(player);

        if (!prompt) return;

        password = prompt.password;
        player.setDynamicProperty("rememberMe", prompt.rememberMe);
    }

    player.sendMessage(`Logging in...`);

    const success = await login(player.name, password);

    if (success?.localId != undefined) {
        const expiresAt = Date.now() + parseInt(success.expiresIn, 10) * 1000;

        player.setDynamicProperty("localId", success.localId);
        player.setDynamicProperty("idToken", success.idToken);
        player.setDynamicProperty("refreshToken", success.refreshToken);
        player.setDynamicProperty("expiresAt", expiresAt);

        if (!rememberMe) {
            player.setDynamicProperty("password");
        }

        player.sendMessage(`Login success`);

        return {
            localId: success.localId,
            idToken: success.idToken,
            refreshToken: success.refreshToken,
            expiresAt: expiresAt.toString()
        };
    }

    player.setDynamicProperty("password");
    player.sendMessage(`Login fail: ${success}`);

    return;
}

//#region Online
export async function saveOnline(player: Player, level: Level) {
    try {
        const account = await signIn(player);

        if (!account) {
            player.sendMessage(`Failed Login`);
            return;
        }

        const levelCode = generateLevelCode();

        const now = new Date().toISOString();

        const levelMetadata: OnlineLevelMetadata = {
            creator: level.creator,
            name: level.name,
            description: level.description,

            ownerId: account.localId,

            createdAt: now,
            updatedAt: now,

            difficulty: 0,
            downloads: 0,
            likes: 0,
            dislikes: 0,

            isFeatured: false,
            isOfficial: false,

            version: PARKOUR_VERSION,
            update: 1
        };

        console.warn(JSON.stringify(levelMetadata))

        const levelData: OnlineLevelData = {
            structure: level.structure,
            ownerId: account.localId
        };

        const saveReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/levels/${levelCode}.json?auth=${account.idToken}&print=pretty`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(levelMetadata),
        });

        if (saveReq.status != ServerStatusResponse.Success) {
            console.warn(`Status: ${saveReq.status}`);
            console.warn(`Response: ${JSON.stringify(saveReq)}`);
            player.sendMessage(`Failed to save online!`);
            return;
        }

        player.sendMessage(`Saved p1!`);

        const dataSaveReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/level_data/${levelCode}.json?auth=${account.idToken}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(levelData),
        });

        if (dataSaveReq.status == ServerStatusResponse.Success) {
            player.sendMessage(`Saved done!`);
        } else {
            player.sendMessage(`Failed to save online!`);
        }
    } catch {
        player.sendMessage(`Failed to save online!`);
    }
}