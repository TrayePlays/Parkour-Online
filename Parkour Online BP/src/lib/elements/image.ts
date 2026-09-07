import { DimensionExpression, Expression, PositionExpression } from "../general/types";
import { BaseElement } from "./base";

export interface ImageOptions {

    /**
     * If the image should appear under the button or not, will be
     * ignored if the Image instance is used for a button image
     * @default false
     */
    appearUnderButton: boolean
}

export class Image extends BaseElement {

    constructor(
        public texture: string,
        public offset: PositionExpression,
        public size: DimensionExpression,
        public imageOptions: ImageOptions = {
            appearUnderButton: false
        },
    ) {
        super(offset, size);
    }

    public clone() {
        return new Image(this.texture, { ...this.offset }, { ...this.size }, { ...this.imageOptions });
    }
}


