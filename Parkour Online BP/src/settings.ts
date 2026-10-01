import { Vector2 } from "@minecraft/server"
import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";

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



export enum SettingsElementType {
    Slider = "slider",
    Toggle = "toggle",
    TextField = "textField",
    Dropdown = "dropdown",
    Button = "button",
    Divider = "divider",
    Label = "label",
    Header = "header",
    Image = "image",
    Spacer = "spacer"
}

export interface SliderSetting {
    type: SettingsElementType.Slider;
    name: ObservableString | string;
    default: number;
    min: number;
    max: number;
    step?: number;
    description?: string;
    visible?: ObservableBoolean | boolean;
    cb: (value: number) => void;
}

export interface ToggleSetting {
    type: SettingsElementType.Toggle;
    name: ObservableString | string;
    default?: boolean;
    description?: string;
    visible?: ObservableBoolean | boolean;
    cb: (value: boolean) => void;
}

export interface TextFieldSetting {
    type: SettingsElementType.TextField;
    name: ObservableString | string;
    default?: string;
    placeholder?: string;
    description?: string;
    visible?: ObservableBoolean | boolean;
    cb: (value: string) => void;
}

export interface DropdownSetting {
    type: SettingsElementType.Dropdown;
    name: ObservableString | string;
    options: { label: string, value: number }[];
    default?: number;
    description?: string;
    visible?: ObservableBoolean | boolean;
    cb: (value: number) => void;
}

export interface ButtonSetting {
    type: SettingsElementType.Button;
    name: ObservableString | string;
    close?: ObservableBoolean | boolean;
    cb: () => void;
}

export interface DividerSetting {
    type: SettingsElementType.Divider;
    visible?: ObservableBoolean | boolean;
}

export interface SpacerSetting {
    type: SettingsElementType.Spacer;
    visible?: ObservableBoolean | boolean;
}

export interface LabelSetting {
    type: SettingsElementType.Label;
    text: string;
    visible?: ObservableBoolean | boolean;
}

export interface HeaderSetting {
    type: SettingsElementType.Header;
    text: string;
    visible?: ObservableBoolean | boolean;
}

export interface ImageSetting {
    type: SettingsElementType.Image;
    path: string;
    packId: string
    visible?: ObservableBoolean | boolean;
}

export type SettingsElement =
    | SliderSetting
    | ToggleSetting
    | TextFieldSetting
    | DropdownSetting
    | ButtonSetting
    | DividerSetting
    | LabelSetting
    | HeaderSetting
    | ImageSetting
    | SpacerSetting;

export interface BlockSettings {
    elements: SettingsElement[];
}