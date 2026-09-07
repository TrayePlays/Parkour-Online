import { DimensionExpression, Dimensions, Position, PositionExpression } from "../general/types";
import { BaseElement } from "./base";

export interface PlayerRendererOptions {

    /**
     * Automatically makes the player renderer look at the cursors position
     * @default true
     */
    lookAtCursor?: boolean;

    /**
     * Padding above the players head to avoid clipping
     * @default 0
     */
    topPadding?: number;
}

export class PlayerRenderer extends BaseElement {
    constructor(
        public size: DimensionExpression,
        public offset: PositionExpression,
        public options: PlayerRendererOptions = {
            lookAtCursor: true,
            topPadding: 0
        }
    ) {
        super(offset, size);
    }

    public clone() {
        return new PlayerRenderer({ ...this.size }, { ...this.offset }, { ...this.options });
    }
}