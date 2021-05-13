import React from "react";

type Props = {
    moveNumber: number;
    rewind: () => void;
    back: () => void;
    forward: () => void;
    fastForward: () => void;
}

const NavigationBar: React.FC<Props> = (props) => {
    return (
        <div>
            <button type="button" onClick={props.rewind}>⏪</button>
            <button type="button" onClick={props.back}>◀️</button>
            <span>{props.moveNumber}</span>
            <button type="button" onClick={props.forward}>▶️</button>
            <button type="button" onClick={props.fastForward}>⏩</button>
        </div>
    )
} 

export default NavigationBar;