/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from 'react';

interface Props {
    width: string;
    blackPercent: number;
    blackInfo: string;
    whiteInfo: string;
}

function SituationBar(props: Props) {
    const style = {
        width: props.width,
        height: "15px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "black",
        marginBottom: "5px",
    } as const;
    const blackStyle = {
        float: "left" as const,
        textAlign: "center",
        color: "white",
        width: `${props.blackPercent}%`,
        height: "100%",
        backgroundColor: "black",
    } as const;
    const whiteStyle = {
        float: "left",
        textAlign: "center",
        width: `${100 - props.blackPercent}%`,
        height: "100%",
    } as const;
    return (
        <div style={style}>
        <div style={blackStyle}>{props.blackInfo}</div>
        <div style={whiteStyle}>{props.whiteInfo}</div>
        </div>
    );
}

export default SituationBar;