import { BlockPermutation, MolangVariableMap, Player, system, world } from "@minecraft/server";
import { ActionFormData, CustomForm, ObservableBoolean, ObservableNumber, ObservableString } from "@minecraft/server-ui"
import { createAccount, login, saveOnline, signIn } from "online/account";
import { ServerStatusResponse } from "api";
import { findAvailableDimension, loadDimension } from "build";
import { dimensions } from "dimensions";
import { Button, ButtonPanel } from "lib/elements/button";
import { Grid } from "lib/elements/grid";
import { Image } from "lib/elements/image";
import { Label } from "lib/elements/label";
import { PlayerRenderer } from "lib/elements/playerRenderer";
import { ScrollingPanel } from "lib/elements/singles/scrollingPanel";
import { Stacker } from "lib/elements/stacker";
import { DynamicActionUI } from "lib/ui";
import { api } from "main";
import { updateOutlines } from "outline";
import { BlockSettings, SettingsElementType } from "settings";
import { Checkpoint, createLevel, DeathZone, deleteLevel, FirebaseResponse, generateLevelCode, getLevel, getLevelNames, getPlayerLevel, isInsideLevelArea, Level, LEVEL_DIFFICULTIES, LevelMetadata, ParkourPlayer, playtestLevel, returnToEditor, runSaveStructure, saveLevel, sleep, ZoneType } from "utils";
import { getOnlineLevels, OnlineLevelMetadata, OnlineLevelSearchOption } from "online/level";

async function signUpUI(player: Player) {
    if (player.persistentId == "") return player.sendMessage(`You have to sign in to sign in.`);
    const form = new CustomForm(player, "Sign Up");
    let oldPassword = ""
    let realChange = true
    const password = new ObservableString("", { clientWritable: true })
    const passwordVis = new ObservableBoolean(true)
    const rememberMe = new ObservableBoolean(false, { clientWritable: true })
    const rememberMeVis = new ObservableBoolean(true);
    const label1 = new ObservableString("")
    const label1Vis = new ObservableBoolean(false)
    const button = new ObservableString("Sign Up")
    const buttonDisabled = new ObservableBoolean(true)
    const passwordCallback = (str: string) => {
        // console.warn(oldPassword.length, str.length)
        // if (!realChange) return realChange = true;
        // if (oldPassword.length < str.length) {
        //     realChange = false;
        //     password.setData("●".repeat(str.length));
        //     oldPassword = "●".repeat(str.length);
        // } else {
        //     oldPassword = "●".repeat(str.length)
        // }
        const isntValid = str.length < 6
        buttonDisabled.setData(isntValid)
        if (isntValid && str.length != 0) {
            label1.setData("§cPlease type a password with 6+ characters")
            label1Vis.setData(true);
        } else {
            label1Vis.setData(false)
        }
    }

    let passwordNoEncrypt = "";

    password.subscribe(passwordCallback);

    async function signUp() {
        let dotData = { up: true, dots: 0 };
        buttonDisabled.setData(true);
        password.unsubscribe(passwordCallback);
        const pass = password.getData();
        if (rememberMe.getData()) player.setDynamicProperty(`password`, pass);
        label1.setData(`§7Creating your account`);
        const interval = system.runInterval(() => {
            if (dotData.up) {
                dotData.dots++;
                if (dotData.dots >= 3) dotData.up = false
            } else {
                dotData.dots--;
                if (dotData.dots <= 0) dotData.up = true;
            }
            label1.setData(`§7Creating your account${".".repeat(dotData.dots)}`)
        }, 10);
        label1Vis.setData(true);
        const success = await createAccount(player.name, pass)

        system.clearRun(interval);

        if (success.status == ServerStatusResponse.Success) {
            const userData = success.getData();
            const userReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/users/${userData.localId}.json?auth=${userData.idToken}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: player.name
                })
            })
            if (userReq.status == ServerStatusResponse.Success) {
                label1.setData(`§aCreated account successfully!`)
            } else {
                label1.setData(`§cError occured when creating account!`)
            }
        } else {
            let realErr = ""
            try {
                console.warn(JSON.stringify(success))
                if (success.message == "Timed out") realErr = `You aren't connected to the server! §7(/function connect)`
                else {
                    const errData = JSON.parse(success.data)?.error as FirebaseResponse['error']
                    const errMsg = errData?.message;
                    if (errMsg == "EMAIL_EXISTS") realErr = `This account already exists! §7(You have an account)`
                }
            } catch { }
            label1.setData(`§c${realErr}`);
            button.setData(`Retry`);
            buttonDisabled.setData(false);
        }
    }

    function retry() {
        password.subscribe(passwordCallback);
        label1.setData("")
        label1Vis.setData(false);
        password.setData("");
        passwordVis.setData(true);
        rememberMeVis.setData(true);
        button.setData("Sign Up");
    }

    function invisTextAndToggle() {
        passwordVis.setData(false);
        rememberMeVis.setData(false);
    }

    form.spacer({ visible: label1Vis });
    form.label(label1, { visible: label1Vis })
    form.spacer({ visible: label1Vis });
    form.textField("Password", password, { visible: passwordVis })

    form.toggle(`Remember Me`, rememberMe, { visible: rememberMeVis });

    form.spacer();
    form.button(button, () => {
        if (button.getData() == "Sign Up") {
            signUp();
            invisTextAndToggle();
        }
        if (button.getData() == "Retry") {
            retry();
        }
    }, { disabled: buttonDisabled })

    form.show();
}

function levelMainUI(player: ParkourPlayer, levelName?: string) {
    const maxLevels = 4
    const form = new CustomForm(player, "Levels");
    const initLabel1 = "Create a level or Play others levels online!"
    const label1 = { title: new ObservableString(initLabel1), visible: new ObservableBoolean(true), spacer1: new ObservableBoolean(true), spacer2: new ObservableBoolean(true), spacer3: new ObservableBoolean(false) };
    const textField1 = { title: new ObservableString("Level Name"), text: new ObservableString("My Level", { clientWritable: true }), vis: new ObservableBoolean(false), disabled: new ObservableBoolean(false), description: new ObservableString("") }
    const textField2 = { title: new ObservableString("Level Description (Optional)"), text: new ObservableString("", { clientWritable: true }), vis: new ObservableBoolean(false), disabled: new ObservableBoolean(false), description: new ObservableString("") }
    const buttonData: { title: ObservableString, cb: () => void, vis: ObservableBoolean, disabled: ObservableBoolean, spacerVis: ObservableBoolean, dividerVis: ObservableBoolean, tooltip: ObservableString }[] = [];
    const toggle1 = { title: new ObservableString("Remember Me"), toggled: new ObservableBoolean(false, { clientWritable: true }), vis: new ObservableBoolean(false), disabled: new ObservableBoolean(false), description: new ObservableString("") }
    let insideLevelsForm = false;
    let onlineLevels: OnlineLevelMetadata[] = [];
    let activeLevels = getLevelNames();

    const findTextCB = (newText: string) => {
        const levels = getLevelNames();
        if (levels.length == 0) return;
        if (newText != "") {
            const newLevels = levels.filter(l => l.toLowerCase().includes(newText.toLowerCase()));
            if (newLevels.length == 0) {
                textField1.description.setData(`Nothing found for ${newText}`);
                return;
            }
            textField1.description.setData(`Finding ${newText}`);
            activeLevels = newLevels;
        } else {
            textField1.description.setData(``);
            activeLevels = levels
        }
        page = 0;
        myLevelsForm();
        label1.title.setData(`Page ${0 + 1} / ${Math.ceil(activeLevels.length / maxLevels)}`)
    }

    let page = 0;

    form.spacer({ visible: label1.spacer1 });
    form.label(label1.title, { visible: label1.visible });
    form.spacer({ visible: label1.spacer2 })
    form.textField(textField1.title, textField1.text, { disabled: textField1.disabled, visible: textField1.vis, description: textField1.description });
    form.textField(textField2.title, textField2.text, { disabled: textField2.disabled, visible: textField2.vis, description: textField2.description });
    form.toggle(toggle1.title, toggle1.toggled, { disabled: toggle1.disabled, visible: toggle1.vis, description: toggle1.description })

    for (let i = 0; i < 9; i++) {
        const title = new ObservableString("")
        const cb = () => {
            console.warn("not updated cb")
        }
        const tooltip = new ObservableString("")
        const vis = new ObservableBoolean(false)
        const disabled = new ObservableBoolean(false)
        const spacerVis = new ObservableBoolean(false);
        const dividerVis = new ObservableBoolean(false);
        form.button(title, () => buttonData[i].cb(), { visible: vis, disabled, tooltip })
        form.divider({ visible: dividerVis });
        form.spacer({ visible: spacerVis })
        buttonData.push({ title, cb, vis, disabled, spacerVis, dividerVis, tooltip });
    }

    function allButtonSet(data: { title?: string, cb?: () => void, vis?: boolean, disabled?: boolean, spacerVis?: boolean, dividerVis?: boolean }) {
        for (const button of buttonData) {
            if (data.title != undefined) button.title.setData(data.title);
            if (data.cb != undefined) button.cb = data.cb;
            if (data.vis != undefined) button.vis.setData(data.vis);
            if (data.disabled != undefined) button.disabled.setData(data.disabled);
            if (data.spacerVis != undefined) button.spacerVis.setData(data.spacerVis);
            if (data.dividerVis != undefined) button.dividerVis.setData(data.dividerVis);
        }
    }

    form.show();

    function initialForm() {
        allButtonSet({ vis: false, dividerVis: false, spacerVis: false, disabled: false });

        label1.title.setData(initLabel1);
        label1.visible.setData(true);
        label1.spacer1.setData(true);
        label1.spacer2.setData(true);

        textField1.vis.setData(false);
        textField1.text.unsubscribe(findTextCB);
        textField1.text.setData("My Level");
        textField2.vis.setData(false);
        textField2.text.setData("");

        const button1 = buttonData[0];
        button1.title.setData("Play")
        button1.vis.setData(true);
        button1.cb = () => {
            onlineLevelsMenu();
        };

        const button2 = buttonData[1];
        button2.title.setData("Create");
        button2.vis.setData(true);
        button2.cb = () => {
            createForm();
        };

        const button3 = buttonData[2];
        button3.disabled.setData(getLevelNames().length == 0);
        button3.title.setData("Edit");
        button3.vis.setData(true);
        button3.cb = () => {
            myLevelsForm();
        };
    }

    function onlineLevelsMenu() {
        allButtonSet({ vis: false, disabled: false, dividerVis: false });
        textField1.vis.setData(false);
        label1.title.setData("Play Online");

        const button1 = buttonData[0];
        button1.title.setData("Search");
        button1.vis.setData(true);
        button1.cb = () => {
            onlineSearchForm();
        };

        const button2 = buttonData[1];
        button2.title.setData("Recent");
        button2.vis.setData(true);
        button2.cb = () => {
            onlineLevelsForm(OnlineLevelSearchOption.Recent);
        };

        const button3 = buttonData[2];
        button3.title.setData("Featured");
        button3.vis.setData(true);
        button3.cb = () => {
            onlineLevelsForm(OnlineLevelSearchOption.Featured);
        };

        const button4 = buttonData[3];
        button4.title.setData("Downloaded");
        button4.vis.setData(true);
        button4.cb = () => {
            onlineLevelsForm(OnlineLevelSearchOption.Downloaded);
        };

        const button5 = buttonData[4];
        button5.title.setData("Back");
        button5.vis.setData(true);
        button5.cb = () => {
            initialForm();
        };
    }

    async function onlineLevelsForm(option: OnlineLevelSearchOption, text?: string, levelList?: OnlineLevelMetadata[]) {
        let levels;
        if (levelList) levels = levelList;
        else levels = await getOnlineLevels(player, option, text);
        if (!levels) return;

        allButtonSet({ vis: false, disabled: false, dividerVis: false });

        label1.title.setData("yap");

        const maxPage = Math.max(1, Math.ceil(levels.length / maxLevels));
        page = Math.min(page, maxPage - 1);

        const start = page * maxLevels;
        const pageLevels = levels.slice(start, start + maxLevels);

        pageLevels.forEach((level, i) => {
            const button = buttonData[i];

            button.title.setData(level.name);
            button.vis.setData(true);
            button.disabled.setData(false);
            button.cb = () => {
                // play/download level here
                selectLevelForm(level, levels);
                console.warn(`Selected online level: ${level.id}`);
            };
        });

        if (maxPage > 1) {
            if (page < maxPage - 1) {
                buttonData[maxLevels].title.setData("Next");
                buttonData[maxLevels].vis.setData(true);
                buttonData[maxLevels].cb = () => {
                    page++;
                    onlineLevelsForm(option);
                };
            }

            if (page > 0) {
                buttonData[maxLevels + 1].title.setData("Previous");
                buttonData[maxLevels + 1].vis.setData(true);
                buttonData[maxLevels + 1].cb = () => {
                    page--;
                    onlineLevelsForm(option);
                };
            }
        }

        const backButton = buttonData[maxLevels + 2];
        backButton.title.setData("Back");
        backButton.vis.setData(true);
        backButton.cb = () => {
            onlineLevelsMenu();
        };
    }

    async function selectLevelForm(level: OnlineLevelMetadata, levels: OnlineLevelMetadata[]) {
        allButtonSet({ vis: false, disabled: false, dividerVis: false });
        label1.title.setData(`${level.name} by ${level.creator}\n§7${level.description ? `\nDescription: ${level.description}` : ""}\nDifficulty: ${LEVEL_DIFFICULTIES[level.difficulty]}\nDownloads: ${level.downloads}\nLikes: ${level.likes}`);

        const button1 = buttonData[0];
        button1.title.setData("Download");
        button1.vis.setData(true);
        button1.cb = () => {
            onlineSearchForm();
        };

        const button2 = buttonData[1];
        button2.title.setData("Back");
        button2.vis.setData(true);
        button2.cb = () => {
            // not actually choosing downloads forcing their old levels array
            onlineLevelsForm(OnlineLevelSearchOption.Downloaded, undefined, levels);
        };
    }

    async function onlineSearchForm() {
        allButtonSet({ vis: false, disabled: false, dividerVis: false });

        label1.title.setData("Search Online Levels");

        textField1.title.setData("Search");
        textField1.text.setData("");
        textField1.description.setData("");
        textField1.vis.setData(true);

        const searchCB = (text: string) => {
            if (text == "") return;

            onlineLevelsForm(OnlineLevelSearchOption.Search, text);
        };

        textField1.text.subscribe(searchCB);

        const backButton = buttonData[0];
        backButton.title.setData("Back");
        backButton.vis.setData(true);
        backButton.cb = () => {
            textField1.text.unsubscribe(searchCB);
            onlineLevelsMenu();
        };
    }

    function myLevelsForm() {
        const levels = getLevelNames();
        if (levels.length == 0) return;
        const maxPage = Math.ceil(activeLevels.length / maxLevels)
        page = Math.max(Math.min(page, maxPage - 1), 0)
        allButtonSet({ vis: false, disabled: false, dividerVis: false })
        label1.title.setData(`Page ${page + 1} / ${maxPage}`);

        textField1.title.setData("Search for a level");
        textField1.description.setData("");
        if (!insideLevelsForm) {
            textField1.text.setData("");
            textField1.text.subscribe(findTextCB);
        }
        textField1.vis.setData(true);

        for (let i = 0; i < maxLevels; i++) {
            const button = buttonData[i];
            const levelName = activeLevels[i + (page * maxLevels)];
            button.vis.setData(true);
            if (i == maxLevels - 1) button.dividerVis.setData(true);
            if (levelName == undefined) {
                button.title.setData("")
                button.disabled.setData(true);
                continue
            };
            button.cb = () => {
                insideLevelsForm = false;
                editLevelForm(levelName);
            }
            button.title.setData(activeLevels[i + (page * maxLevels)]);
        }

        const nextButton = buttonData[maxLevels];
        nextButton.title.setData("Next");
        nextButton.vis.setData(true);
        nextButton.disabled.setData(page + 1 == maxPage);
        nextButton.cb = () => {
            page = Math.min(page + 1, maxPage - 1);
            myLevelsForm();
        }

        const previousButton = buttonData[maxLevels + 1];
        previousButton.title.setData("Previous");
        previousButton.vis.setData(true);
        previousButton.disabled.setData(page == 0);
        previousButton.dividerVis.setData(true);
        previousButton.cb = () => {
            page = Math.max(page - 1, 0);
            myLevelsForm();
        };

        const backButton = buttonData[maxLevels + 2];
        backButton.title.setData("Back");
        backButton.vis.setData(true);
        backButton.cb = () => {
            insideLevelsForm = false;
            initialForm();
        }
        insideLevelsForm = true;
    }

    function editLevelForm(levelName: string) {
        allButtonSet({ vis: false, disabled: false, dividerVis: false });
        const level = getLevel(levelName);
        if (!level) return;

        textField1.text.unsubscribe(findTextCB);
        textField1.vis.setData(false);

        label1.title.setData(`Level: ${levelName}${level.description ? `\n${level.description}` : ""}`);

        const button1 = buttonData[0];
        button1.title.setData("Edit");
        button1.vis.setData(true);
        // button1.vis.setData(getCurrentLevelName(player) != levelName);
        button1.cb = () => {
            if (!isInsideLevelArea(player)) {
                const dimension = findAvailableDimension();
                if (dimension) {
                    loadDimension(player, dimension, level);
                } else {
                    console.warn("Unable to find available dimension!");
                }
            } else {
                const dimension = dimensions.find(d => d.typeId == player.dimension.id)
                if (!dimension) return console.warn("what");
                loadDimension(player, dimension, level);
            }
        };

        const button2 = buttonData[1];
        button2.title.setData("Save");
        button2.vis.setData(true);
        button2.cb = () => {
            if (!isInsideLevelArea(player)) return;
            allButtonSet({ disabled: true });
            runSaveStructure(player.dimension, { x: -32, y: -64, z: -32 }, { x: 32, y: 64, z: 32 }, (count, total) => {
                label1.title.setData(`Saving ${levelName} §7(${((count / total) * 100).toFixed(1)}%)`)
            }, async (structure) => {
                label1.title.setData(`§aSaved ${levelName}!`)
                player.playSound("note.bell");
                saveLevel(player, levelName, { structure });
                await sleep(30)
                label1.title.setData(`Level: ${levelName}${level.description ? `\n${level.description}` : ""}`)
                allButtonSet({ disabled: false });
            })
        };

        const button3 = buttonData[2];
        button3.title.setData("Save Online");
        button3.vis.setData(true);
        button3.cb = async () => {
            const level = getLevel(levelName);
            if (!level) return;
            saveOnline(player, level);
        };

        const button4 = buttonData[3];
        button4.title.setData("Delete");
        button4.vis.setData(true);
        button4.cb = () => {
            deleteLevel(levelName);
            activeLevels = getLevelNames();
            if (getLevelNames().length == 0) initialForm();
            else myLevelsForm();
        };

        const button5 = buttonData[4];
        button5.title.setData("Playtest");
        button5.vis.setData(true);
        button5.cb = () => {
            playtestLevel(player, level);
        };

        const button6 = buttonData[5];
        button6.title.setData("Back");
        button6.vis.setData(true);
        button6.cb = () => {
            myLevelsForm();
        };
    }

    function errorFunction(message: string, displayTicks = 30) {
        const oldMessage = label1.title.getData();
        label1.title.setData(message);
        const timeout = system.runTimeout(() => {
            label1.title.setData(oldMessage)
        }, displayTicks);
        return timeout
    }

    async function signIn(player: Player): Promise<{ localId: string, idToken: string } | undefined> {
        const ping = await api.sendPingRequest();
        if (ping.status != ServerStatusResponse.Success) {
            errorFunction("You aren't online (/function connect)");
            return
        };
        let usingDefault = true;
        let password = player.getDynamicProperty(`password`) as string;
        if (!password) {
            return new Promise((resolve) => {
                usingDefault = false;
                label1.title.setData("Login to Parkour Online")
                textField1.vis.setData(true);
                textField1.title.setData(`Type in your password`)
                toggle1.vis.setData(true);
                const loginButton = buttonData[0];
                loginButton.vis.setData(true);
                loginButton.disabled.setData(false);
                loginButton.title.setData("Login");
                loginButton.cb = () => {
                    if (toggle1.toggled.getData()) player.setDynamicProperty("password", textField1.text.getData());
                    resolve(loginInit(textField1.text.getData(), true))
                };
            })
        }

        async function loginInit(password: string, fromPrompt = false) {
            if (fromPrompt) {
                textField1.vis.setData(false);
                textField1.text.setData("");
                toggle1.toggled.setData(false);
                toggle1.vis.setData(false);
                allButtonSet({ vis: false, disabled: false });
            }
            const success = await login(player.name, password);
            if (success?.localId != undefined) {
                return { localId: success.localId, idToken: success.idToken };
            } else {
                player.setDynamicProperty("password");
                errorFunction(`Login fail: ${success}`);
                await sleep(30);
                signIn(player);
            }
        }

        return loginInit(password);
    }

    // async function saveOnline(player: Player, level: Level) {
    //     try {
    //         label1.title.setData("Logging in...");
    //         allButtonSet({ vis: false });
    //         const account = await signIn(player);
    //         if (!account) return editLevelForm(level.name);
    //         label1.title.setData(`Posting ${level.name}...`);
    //         // console.warn(JSON.stringify(login))
    //         const levelCode = generateLevelCode();
    //         const saveReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/levels/${levelCode}.json?auth=${account.idToken}`, {
    //             method: "PUT",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ creator: level.creator, name: level.name, description: level.description, ownerId: account.localId }),
    //         })
    //         const dataSaveReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/level_data/${levelCode}.json?auth=${account.idToken}`, {
    //             method: "PUT",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify({ structure: level.structure, levelData: level.customLevelData, ownerId: account.localId }),
    //         })
    //         if (dataSaveReq.status == ServerStatusResponse.Success) {
    //             label1.title.setData(`Posted ${level.name}!`);
    //             await sleep(30);
    //             editLevelForm(level.name);
    //         } else {
    //             label1.title.setData(`Failed to upload ${level.name}...`);
    //             await sleep(30);
    //             editLevelForm(level.name);
    //         }
    //     } catch {
    //         label1.title.setData(`Failed to upload ${level.name}...`);
    //         await sleep(30);
    //         editLevelForm(level.name);
    //     }
    // }

    function createForm() {
        allButtonSet({ vis: false });
        label1.title.setData("");
        label1.spacer1.setData(false);
        label1.spacer2.setData(false);
        textField1.vis.setData(true);
        textField2.vis.setData(true);

        const nameCB = (text: string) => {
            let validData = { message: "", valid: true };
            const regex = /^[a-zA-Z0-9 !?.,'()%@#$* -]+$/
            if (!regex.test(text)) validData = { message: "Invalid Characters!", valid: false };
            if (text.length <= 0) validData = { message: "Can't be 0 characters!", valid: false };
            if (text.length > 20) validData = { message: "Too Long", valid: false };
            textField1.description.setData(validData.message);
            button1.disabled.setData(!validData.valid)
        }

        textField1.text.subscribe(nameCB);

        const button1 = buttonData[0];
        button1.title.setData("Create")
        button1.vis.setData(true);
        button1.disabled.setData(false);
        button1.cb = () => {
            const level = createLevel(player, textField1.text.getData(), textField2.text.getData());
            const dimension = findAvailableDimension();
            if (dimension) {
                loadDimension(player, dimension, level as Level)
                form.close();
            } else {
                console.warn("smth happened bum")
            }
            textField1.text.unsubscribe(nameCB);
        };
        const button2 = buttonData[1];
        button2.title.setData("Back");
        button2.vis.setData(true);
        button2.cb = () => {
            textField1.text.unsubscribe(nameCB);
            initialForm();
        };
    }
    if (levelName) {
        editLevelForm(levelName);
    } else {
        initialForm();
    }
}

async function scriptUI(player: Player) {
    // const account = await signIn(player);
    // if (account == undefined) return;
    // const levelReq = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/levels.json?auth=${account.idToken}`)
    // if (levelReq.status != ServerStatusResponse.Success) return;
    // const levels = metadataToArray(levelReq.getData());
    // console.warn(JSON.stringify(levels))
    // const levelTempArr = []
    const levelAmount = 64
    const form = new DynamicActionUI(300, 200, { body_texture: "textures/ui/greyBorder", header_texture: "textures/ui/greyBorder" }, { height: 40, width: 300 }, { x: 0, y: 0 }, { autoCenter: true })
    form.title(new Label("Levels", { x: 0, y: 0 }, 3, "center", undefined, { fontType: "MinecraftTen" }));
    const buttonArr: Button[] = [];
    for (let i = 0; i < levelAmount; i++) {
        buttonArr.push(
            new Button(
                new ButtonPanel({ x: 0, y: 0 }, { height: 32, width: 32 }),
                new Image("textures/items/apple", { x: 16 + (35 * ((i % 8))), y: 12 + (35 * (Math.floor(i / 8))) }, { height: 24, width: 24 }),
                // undefined,
                new Label("a", { x: 11 + (35 * ((i % 8))), y: 20 + (35 * (Math.floor(i / 8))) }, 1, "center", 1),
                () => {
                    clicked(i);
                },
                { buttonTextures: { default_texture: "textures/ui/button_borderless_dark", hover_texture: "textures/ui/button_borderless_darkhover" }, forceGlobalTextParent: true, hoverText: "Level 2", }
            )
        )
    }
    form.grid(new Grid(
        buttonArr,
        { height: 8, width: 8 },
        { height: 280, width: 280 },
        { x: 10, y: 10 },
    ))

    function clicked(number: number) {

    }

    form.show(player);
}

async function scriptUI2(player: Player) {
    const levels = await getOnlineLevels(player);
    if (!levels) return;
    const form = new DynamicActionUI(300, 180, { body_texture: "textures/ui/greyBorder", header_texture: "textures/ui/greyBorder" }, { height: 40, width: 300 }, { x: 0, y: 0 })
    form.title(new Label("Levels", { x: 0, y: 0 }, 3, "center", undefined, { fontType: "MinecraftTen" }));
    const levelAmount = 10
    const buttonArr = [];
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        buttonArr.push(
            new Button(
                new ButtonPanel({ x: 10, y: 10 }, { height: 24, width: 276 }),
                undefined,
                // undefined,
                new Label(`${level?.name ?? ""} ${level?.description ?? ""}${level ? "\nby " + level?.creator : ""}`, { x: 15, y: 12 + (i * 24) }, 1, "left"),
                () => {
                    console.warn("hi");
                },
                { buttonTextures: { default_texture: "textures/ui/button_borderless_dark", hover_texture: "textures/ui/button_borderless_darkhover" }, forceGlobalTextParent: true, hoverText: `Level ${i + 1}`, }
            )
        )
    }
    form.customScrollingContentPanel(new ScrollingPanel({
        height: 160, width: 300
    }, {
        x: 0, y: 10
    }))
    form.stack(new Stacker(
        ...buttonArr
    ))
    form.show(player);
}

function vanillaUI(player: Player) {
    const form = new ActionFormData();
    form.title("normal:a");
    form.button("a");
    form.show(player);
}

export function settingsUI(player: Player, settings: BlockSettings) {
    const form = new CustomForm(player, "Settings")
    const states: { state: any, cb: (value: any) => void }[] = [];

    for (const setting of settings.elements) {
        if (setting.type == SettingsElementType.Slider) {
            const value = new ObservableNumber(setting.default, { clientWritable: true });
            value.subscribe((val) => setting.cb(val))

            form.slider(setting.name, value, setting.min, setting.max, {
                description: setting.description,
                step: setting.step,
                visible: setting.visible
            });

            states.push({ state: value, cb: setting.cb });
        }

        if (setting.type == SettingsElementType.Toggle) {
            const toggled = new ObservableBoolean(setting.default ?? false, { clientWritable: true });
            toggled.subscribe((val) => setting.cb(val))

            form.toggle(setting.name, toggled, {
                description: setting.description,
                visible: setting.visible
            });

            states.push({ state: toggled, cb: setting.cb });
        }

        if (setting.type == SettingsElementType.TextField) {
            const value = new ObservableString(setting.default ?? "", { clientWritable: true });

            form.textField(setting.name, value, {
                description: setting.description,
                visible: setting.visible
            });

            states.push({ state: value, cb: setting.cb });
        }

        if (setting.type == SettingsElementType.Dropdown) {
            const value = new ObservableNumber(setting.default ?? 0, { clientWritable: true });

            form.dropdown(setting.name, value, setting.options, {
                description: setting.description,
                visible: setting.visible
            });

            states.push({ state: value, cb: setting.cb });
        }

        if (setting.type == SettingsElementType.Button) {
            form.button(setting.name, () => {
                setting.cb();
                const close = setting.close instanceof ObservableBoolean ? setting.close.getData() : setting.close;

                if (close) {
                    form.close();
                }
            });
        }

        if (setting.type == SettingsElementType.Divider) {
            form.divider({ visible: setting.visible });
        }

        if (setting.type == SettingsElementType.Label) {
            form.label(setting.text, { visible: setting.visible });
        }

        if (setting.type == SettingsElementType.Header) {
            form.header(setting.text, { visible: setting.visible });
        }

        if (setting.type == SettingsElementType.Image) {
            form.image(setting.path, setting.packId, { visible: setting.visible })
        }
    }

    form.button("Submit", () => {
        form.close();

        for (const state of states) {
            state.cb(state.state.getData());
        }
    });

    form.show();
}

export function spawnSettingsUI(player: Player, level: Level) {
    settingsUI(player, {
        elements: [
            {
                type: SettingsElementType.Slider,
                name: "Y Rotation",
                default: level.customLevelData.spawn.rotation.y,
                max: 360,
                min: 0,
                cb(value) {
                    saveLevel(player, level.name, { customLevelData: { spawn: { rotation: { y: value } } } })
                },
            },
            {
                type: SettingsElementType.Slider,
                name: "X Rotation",
                default: level.customLevelData.spawn.rotation.x,
                max: 360,
                min: 0,
                cb(value) {
                    saveLevel(player, level.name, { customLevelData: { spawn: { rotation: { x: value } } } })
                },
            }
        ]
    })
}

export function checkpointSettingsUI(player: ParkourPlayer, level: Level, checkpoint: Checkpoint) {
    const enterMessage = new ObservableBoolean(checkpoint.settings?.enterMessage != undefined)
    const { x, y, z } = checkpoint.respawnLocation
    const offsetSign = x < 0 ? -1 : 1;
    let offsetX = (x % 1) * offsetSign;
    let offsetY = y % 1;
    let offsetZ = z % 1;
    console.warn(parseFloat(offsetX.toFixed(1)) * 10);
    const hasOffset = (checkpoint.respawnLocation.x % 1 != 0 || checkpoint.respawnLocation.y % 1 != 0 || checkpoint.respawnLocation.z % 1 != 0);
    const offsetBool = new ObservableBoolean(hasOffset)
    const currentMessage = checkpoint.settings?.enterMessage ?? "";

    const closeDelete = new ObservableBoolean(false);
    const deleteButtonMessage = new ObservableString("Delete (Press Twice)");
    let clickCount = 0;

    settingsUI(player, {
        elements: [

            {
                type: SettingsElementType.Toggle,
                name: "Offset?",
                default: offsetBool.getData(),
                cb(value) {
                    offsetBool.setData(value);

                    if (!value) {
                        const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
                        const checkpointIndex = checkpoints.indexOf(checkpoint);
                        if (checkpointIndex == -1) return;

                        const currentCheckpoint = checkpoints[checkpointIndex];

                        currentCheckpoint.respawnLocation = {
                            x: Math.floor(x),
                            y: Math.floor(y),
                            z: Math.floor(z)
                        };

                        saveLevel(player, level.name, {
                            customLevelData: {
                                checkpoints
                            }
                        });
                    }
                }
            },
            {
                type: SettingsElementType.Slider,
                name: "X Offset",
                description: "5 » 0.5",
                default: parseFloat(offsetX.toFixed(1)) * 10,
                visible: offsetBool,
                max: 5,
                min: -5,
                cb(value) {
                    offsetX = value / 10;

                    const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
                    const checkpointIndex = checkpoints.indexOf(checkpoint);
                    if (checkpointIndex == -1) return;

                    const currentCheckpoint = checkpoints[checkpointIndex];

                    currentCheckpoint.respawnLocation.x = Math.floor(x) + 0.5 + (offsetX * offsetSign);

                    saveLevel(player, level.name, {
                        customLevelData: {
                            checkpoints
                        }
                    });
                },
            },
            {
                type: SettingsElementType.Toggle,
                name: "Enter Message?",
                default: enterMessage.getData(),
                cb(value) {
                    enterMessage.setData(value);

                    const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
                    const checkpointIndex = checkpoints.indexOf(checkpoint);
                    if (checkpointIndex == -1) return;

                    const currentCheckpoint = checkpoints[checkpointIndex];

                    if (!value) {
                        currentCheckpoint.settings = {
                            ...currentCheckpoint.settings,
                            enterMessage: undefined
                        };
                    }

                    saveLevel(player, level.name, {
                        customLevelData: {
                            checkpoints
                        }
                    });
                }
            },
            {
                type: SettingsElementType.TextField,
                name: "What should enter message say?",
                default: currentMessage,
                visible: enterMessage,
                cb(value) {
                    if (value.length == 0 || !enterMessage.getData()) return;

                    const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
                    const checkpointIndex = checkpoints.indexOf(checkpoint);
                    if (checkpointIndex == -1) return;

                    const currentCheckpoint = checkpoints[checkpointIndex];

                    currentCheckpoint.settings = {
                        ...currentCheckpoint.settings,
                        enterMessage: value
                    };

                    saveLevel(player, level.name, {
                        customLevelData: {
                            checkpoints
                        }
                    });
                }
            },
            {
                type: SettingsElementType.Spacer,
                visible: true
            },
            {
                type: SettingsElementType.Button,
                name: deleteButtonMessage,
                close: closeDelete,
                cb() {
                    if (clickCount == 0) {
                        deleteButtonMessage.setData("Delete");
                        clickCount++;
                        return;
                    }

                    closeDelete.setData(true);

                    if (checkpoint.type == ZoneType.Point) {
                        player.dimension.setBlockType(checkpoint.location, "air");
                    }

                    const checkpoints = [...(level.customLevelData.checkpoints ?? [])];
                    const checkpointIndex = checkpoints.indexOf(checkpoint);
                    if (checkpointIndex == -1) return;

                    checkpoints.splice(checkpointIndex, 1);

                    saveLevel(player, level.name, {
                        customLevelData: {
                            checkpoints
                        }
                    });

                    updateOutlines(player.dimension.id);
                },
            }
        ]
    })
}

export function deathZoneSettingsUI(player: ParkourPlayer, level: Level, deathZone: DeathZone) {
    const closeDelete = new ObservableBoolean(false);
    const deleteButtonMessage = new ObservableString("Delete (Press Twice)");
    let clickCount = 0;

    settingsUI(player, {
        elements: [
            {
                type: SettingsElementType.Button,
                name: deleteButtonMessage,
                close: closeDelete,
                cb() {
                    if (clickCount == 0) {
                        deleteButtonMessage.setData("Delete");
                        clickCount++;
                        return;
                    }

                    closeDelete.setData(true);

                    const deathZones = [...(level.customLevelData.deathZones ?? [])];
                    const deathZoneIndex = deathZones.indexOf(deathZone);
                    if (deathZoneIndex == -1) return;

                    deathZones.splice(deathZoneIndex, 1);

                    saveLevel(player, level.name, {
                        customLevelData: {
                            deathZones
                        }
                    });

                    updateOutlines(player.dimension.id);
                },
            }
        ]
    })
}

// Edit level ui 
// (set name save delete with confirm em json ui maybe upload level)

// Upload level ui 
// (opens after u verify or you can open it with edit level if level is alr verified)

world.afterEvents.itemUse.subscribe(async ({ itemStack, source }) => {
    const player = source as ParkourPlayer
    if (itemStack.typeId == "minecraft:torch") {
        signUpUI(player);
    }
    if (itemStack.typeId == "minecraft:gold_ingot") {
        levelMainUI(player);
    }
    if (itemStack.typeId == "minecraft:gold_nugget") {
        levelMainUI(player, getPlayerLevel(player)?.name);
    }
    if (itemStack.typeId == "minecraft:copper_nugget") {
        scriptUI(player);
    }
    if (itemStack.typeId == "minecraft:copper_ingot") {
        scriptUI2(player);
    }
    if (itemStack.typeId == "parkour:playtest") {
        playtestLevel(player, getPlayerLevel(player) ?? player.parkourLevel as Level);
    }
    if (itemStack.typeId == "parkour:stop") {
        returnToEditor(player, getPlayerLevel(player) ?? player.parkourLevel as Level)
    }
    if (itemStack.typeId == "minecraft:iron_ingot") vanillaUI(player);
    if (itemStack.typeId == "minecraft:raw_gold") {
        const data = await signIn(player);
        if (data == undefined) return;
        // const json = await api.sendHttpRequest(`https://parkour-online-db-default-rtdb.firebaseio.com/level/Doohickey1788753137818.json?auth=${data.idToken}`, {}, undefined, undefined, (c, total) => {
        // console.warn(`${c} / ${total}`);
        // })
    }
    if (itemStack.typeId == "minecraft:diamond") {
        const molang = new MolangVariableMap();
        molang.setFloat("variable.index", 0);
        molang.setFloat("variable.lifetime", 1);
        molang.setFloat("variable.size", 0.5);
        player.dimension.spawnParticle("parkour:finish", { x: 0.5, y: -62.5, z: 0.5 }, molang);
    }
    if (itemStack.typeId == "minecraft:resin_brick") {
        getOnlineLevels(player);
    }
})