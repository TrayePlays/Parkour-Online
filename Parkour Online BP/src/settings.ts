import { Vector2 } from "@minecraft/server"

const CHECKPOINT_SETTINGS_CONFIG: BlockSettings = {
    
}

export interface BlockSettings {
    toggles?: Toggle[]
    textFields?: TextField[]

}

interface TextField {
    name: string;
    tooltip: string;
}

interface Toggle {
    name: string,

}