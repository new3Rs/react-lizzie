import React from "react";
import "./NavigationBar.css";

type Props = {
    width: string;
    moveNumber: number;
    rewind: () => void;
    back: () => void;
    pause: () => void;
    forward: () => void;
    fastForward: () => void;
}

const NavigationBar: React.FC<Props> = (props) => {
    return (
        <div style={{width: props.width }} className="navigation-bar">
            <button type="button" onClick={props.rewind}>◀︎◀︎</button>
            <button type="button" onClick={props.back}>◀︎</button>
            <button type="button" onClick={props.pause}>❚❚</button>
            <span>{props.moveNumber}</span>
            <button type="button" onClick={props.forward}>▶︎</button>
            <button type="button" onClick={props.fastForward}>▶︎▶︎</button>
        </div>
    )
} 

export default NavigationBar;