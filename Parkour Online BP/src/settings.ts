import { Vector2 } from "@minecraft/server"

// export const SPAWN_SETTINGS_CONFIG: BlockSettings = {
//     sliders: [
//         {
//             name: "X"
//         }
//     ]
//     toggles: [
//         {
//             name: "test 1",
//             description: "this is a test of my system",
//             cb(toggled) {
//                 console.warn("test 1 value", toggled);
//             },
//         },
//         {
//             name: "test 2",
//             cb(toggled) {
//                 console.warn("what does test2 do?")
//             },
//         }
//     ]
// }

const CHECKPOINT_SETTINGS_CONFIG: BlockSettings = {

}

export interface BlockSettings {
    sliders?: Slider[]
    toggles?: Toggle[]
    textFields?: TextField[]

}

interface Slider {
    name: string,
    default: number
    description?: string,
    step?: number
    max: number,
    min: number,
    cb: (value: number) => void
}

interface TextField {
    name: string;
    tooltip: string;
}

interface Toggle {
    name: string;
    description?: string
    default?: boolean;
    cb: (toggled: boolean) => void
}