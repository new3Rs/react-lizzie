import React from "react";
import "./NavigationBar.css";

type Props = {
    disabled: boolean;
    moveNumber: number;
    rewind: () => void;
    back: () => void;
    pause: () => void;
    forward: () => void;
    fastForward: () => void;
}

const NavigationBar: React.FC<Props> = (props) => {
    return (
        <div className="navigation-bar">
            <button type="button" onClick={props.rewind} disabled={props.disabled}>◀︎◀︎</button>
            <button type="button" onClick={props.back} disabled={props.disabled}>◀︎</button>
            <button type="button" onClick={props.pause} disabled={props.disabled}>❚❚</button>
            <span>{props.moveNumber}</span>
            <button type="button" onClick={props.forward} disabled={props.disabled}>▶︎</button>
            <button type="button" onClick={props.fastForward} disabled={props.disabled}>▶︎▶︎</button>
        </div>
    )
} 

export default NavigationBar;