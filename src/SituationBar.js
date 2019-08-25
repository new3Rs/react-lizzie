/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from 'react';

function SituationBar(props) {
    const style = {
        width: props.width,
        height: "15px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "black",
        marginBottom: "5px",
    }
    const blackStyle = {
        float: "left",
        textAlign: "center",
        color: "white",
        width: `${props.blackPercent}%`,
        height: "100%",
        backgroundColor: "black",
    }
    const whiteStyle = {
        float: "left",
        textAlign: "center",
        width: `${100 - props.blackPercent}%`,
        height: "100%",
    }
    return (
        <div style={style}>
        <div style={blackStyle}>{props.blackInfo}</div>
        <div style={whiteStyle}>{props.whiteInfo}</div>
        </div>
    );
}

export default SituationBar;