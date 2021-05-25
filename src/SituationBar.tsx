/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from "react";
import "./SituationBar.css";

interface Props {
    blackPercent: number;
    blackInfo: string;
    whiteInfo: string;
}

function SituationBar(props: Props) {
    const blackStyle = {
        width: `${props.blackPercent}%`,
    } as const;
    const whiteStyle = {
        width: `${100 - props.blackPercent}%`,
    } as const;
    return (
        <div className="situation-bar">
            <div style={blackStyle}>{props.blackInfo}</div>
            <div style={whiteStyle}>{props.whiteInfo}</div>
        </div>
    );
}

export default SituationBar;