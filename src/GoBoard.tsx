/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React, { CSSProperties } from "react";
import "./GoBoard.css";
import { sprintf } from "sprintf-js";
import { KataInfo } from "./Gtp";
import GoPosition, { BLACK, WHITE, opponentOf, coord2xy, xy2coord } from "./GoPosition";

type RGB = {
    r: number,
    g: number,
    b: number,
}

class GoIntersectionState {
    stone?: string;
    number?: number;
    winrate?: string;
    playouts?: number;
    fillColor?: string;
    borderWidth?: string;
    borderColor?: string;
    backgroundColor?: string;

    constructor() {
        this.stone = undefined;
        this.number = undefined;
        this.winrate = undefined;
        this.playouts = undefined;
        this.fillColor = undefined;
        this.borderWidth = undefined;
        this.borderColor = undefined;
        this.backgroundColor = undefined;
    }
}

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
*/
function HSVtoRGB(h: number, s: number, v: number): RGB {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
        r = v;
        g = t;
        b = p;
        break;
        case 1: r = q;
        g = v;
        b = p;
        break;
        case 2:
        r = p;
        g = v;
        b = t;
        break;
        case 3:
        r = p;
        g = q;
        b = v;
        break;
        case 4:
        r = t;
        g = p;
        b = v;
        break;
        default: // 5
        r = v;
        g = p;
        b = q;
        break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/* accepts parameters
 * r  Object = {r:x, g:y, b:z}
 * OR 
 * r, g, b
*/
function RGBtoHSV(r: number, g: number, b: number): { h: number, s: number, v: number } {
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let d = max - min;
    let h;
    let s = (max === 0 ? 0 : d / max);
    let v = max / 255;

    switch (max) {
        case min:
        h = 0;
        break;
        case r:
        h = (g - b) + d * (g < b ? 6: 0);
        h /= 6 * d;
        break;
        case g:
        h = (b - r) + d * 2;
        h /= 6 * d;
        break;
        default: // case b:
        h = (r - g) + d * 4;
        h /= 6 * d;
        break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
}

function darker(rgb: RGB): RGB {
    const ratio = 0.7;
    const r = rgb.r;
    const g = rgb.g;
    const b = rgb.b;
    return {
        r: r * ratio,
        g: g * ratio,
        b: b * ratio,
    }
}

function shortStringOfInteger(n: number): string {
    if (n < 1000) {
        return sprintf("%d", n);
    } else if (n < 10000) {
        return sprintf("%.1fk", n / 1000);
    } else if (n < 1000000) {
        return sprintf("%.0fk", n / 1000);
    } else if (n < 10000000) {
        return sprintf("%.1fM", n / 1000000);
    } else if (n < 1000000000) {
        return sprintf("%.0fM", n / 1000000);
    } else {
        return sprintf("%.0G", n / 1000000000);
    }
}

export function board2intersections(board: GoPosition) {
    const intersections = new Array(board.BOARD_SIZE2);
    for (let i = 0; i < intersections.length; i++) {
        const intersection  = new GoIntersectionState();
        switch (board.getState(i)) {
            case BLACK:
            intersection.stone = "B";
            break;
            case WHITE:
            intersection.stone = "W";
            break;
            default:
        }
        intersections[i] = intersection;
    }
    return intersections;
}

function addCandidatesInfo(intersections: GoIntersectionState[], model: GoPosition, candidates: KataInfo[]) {
    const maxPlayouts = Math.max(...candidates.map(e => e.visits));
    const maxWinrate = Math.max(...candidates.map(e => e.winrate));
    const saturation = 0.75;
    const brightness = 0.85;
    const maxAlpha = 240;
    const minAlpha = 32;
    const hueFactor = 3.0;
    const alphaFactor = 5.0;
    const greenHue = RGBtoHSV(0, 255, 0).h;
    const cyanHue = RGBtoHSV(0, 255, 255).h;
    for (const [i, candidate] of candidates.entries()) {
        const intersection = intersections[model.xyToPoint.apply(model, coord2xy(candidate.move))];
        intersection.winrate = (candidate.winrate * 100).toFixed(1);
        intersection.playouts = candidate.visits;

        const percentPlayouts = intersection.playouts / maxPlayouts;
        const logPlayouts = Math.log(percentPlayouts);
        const hue = i === 0 ?  cyanHue : greenHue * Math.max(0, logPlayouts / hueFactor + 1);
        const alpha = ((minAlpha + (maxAlpha - minAlpha) * Math.max(0, logPlayouts / alphaFactor + 1))) / 255;
        const color = HSVtoRGB(hue, saturation, brightness);
        if (i === 0) {
            if (candidate.winrate < maxWinrate) {
                intersection.borderWidth = "2px";
                intersection.borderColor = "red";
            } else {
                intersection.borderWidth = "1px";
                const c = darker(color);
                intersection.borderColor = `rgba(${c.r},${c.g},${c.b},${alpha})`;
            }
        } else if (intersection.winrate === maxWinrate.toFixed(1)) {
            intersection.borderWidth = "2px";
            intersection.borderColor = "blue";
        }
        intersection.fillColor = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    }
}

function variationIntersections(model: GoPosition, candidates: KataInfo[], candidate: string): GoIntersectionState[] {
    const info = candidates.find(e => e.move === candidate);
    if (!info) {
        return [];
    }
    const position = GoPosition.copy(model);
    console.log(info);
    for (const move of info.pv) {
        position.play(position.xyToPoint.apply(position, coord2xy(move)));
    }
    const intersections = board2intersections(position);
    let turn = model.turn;
    const first = intersections[position.xyToPoint.apply(position, coord2xy(candidate))];
    first.winrate = info.winrate.toFixed(1);
    first.playouts = info.visits;
    first.textColor = turn === BLACK ? "white" : "black";
    let number = 2;
    turn = opponentOf(turn);
    for (const move of info.pv.slice(1)) {
        const intersection = intersections[position.xyToPoint.apply(position, coord2xy(move))]
        intersection.number = number;
        intersection.textColor = turn === BLACK ? "white" : "black";
        turn = opponentOf(turn);
        number++;
    }
    return intersections;
}

function addOwnership(intersections: GoIntersectionState[], model: GoPosition, ownership: number[]) {
    if (model.turn === BLACK) {
        for (const [i, v] of ownership.entries()) {
            if (i >= model.BOARD_SIZE2) {
                break;
            }
            const value = v * 0.5;
            const [x, y] = model.pointToXy(i);
            const intersection = intersections[model.BOARD_SIZE * (model.BOARD_SIZE - y) + (x - 1)];
            intersection.backgroundColor = value > 0.0 ? `rgba(0,0,0,${value})` : `rgba(255,255,255,${-value})`;
        }
    } else {
        for (const [i, value] of ownership.entries()) {
            if (i >= model.BOARD_SIZE2) {
                break;
            }
            const [x, y] = model.pointToXy(i);
            const intersection = intersections[model.BOARD_SIZE * (model.BOARD_SIZE - y) + (x - 1)];
            intersection.backgroundColor = value < 0.0 ? `rgba(0,0,0,${-value})` : `rgba(255,255,255,${value})`;
        }
    }
}

function range(start: number, end: number): number[] {
    const result = [];
    if (start <= end) {
        for (let i = start; i <= end; i++) {
            result.push(i);
        }
    } else {
        for (let i = start; i >= end; i--) {
            result.push(i);
        }
    }
    return result;
}

interface GoBoardProps {
    width: string;
    height: string;
    w: number;
    h: number;
    model: GoPosition;
    candidates: KataInfo[];
    onClickIntersection: (x: number, y: number) => void,
}

interface GoBoardState {
    candidate?: string;
}

class GoBoard extends React.Component<GoBoardProps, GoBoardState>  {
    constructor(props: GoBoardProps) {
        super(props);
        this.state = {}
    }

    index(x: number, y: number): number {
        return this.props.w * (y - 1) + x - 1;
    }

    /*, number, winrate, visits, backgroundColor, borderColor) {

    }*/

    renderIntersection(intersections: GoIntersectionState[], x: number, y: number) {
        const intersection = intersections[this.index(x, y)];
        return (
            <GoIntersection
                key={`${x}-${y}`}
                onClick={() => this.props.onClickIntersection(x, y)}
                onMouseEnter={() => this.onMouseEnterIntersection(x, y)}
                onMouseLeave={() => this.onMouseLeaveIntersection(x, y)}
                stone={intersection.stone}
                number={intersection.number}
                winrate={intersection.winrate}
                playouts={intersection.playouts}
                fillColor={intersection.fillColor}
                borderWidth={intersection.borderWidth}
                borderColor={intersection.borderColor}
                backgroundColor={intersection.backgroundColor}
            />
        );
    }

    render() {
        let intersections: GoIntersectionState[];
        if (this.state.candidate) {
            intersections = variationIntersections(this.props.model, this.props.candidates, this.state.candidate)
        } else {
            intersections = board2intersections(this.props.model);
            if (this.props.candidates) {
                addCandidatesInfo(intersections, this.props.model, this.props.candidates);
            }
        }
        const goBoardStyle = {
            width: this.props.width,
            height: this.props.height,
        };
        return (
            <div className="go-board" style={goBoardStyle}>
            <div className="go-board-content">
                {range(this.props.h, 1).map(y => (
                    <div className="go-row" key={y}>
                        {range(1, this.props.w).map(x => this.renderIntersection(intersections, x, y))}
                    </div>
                ))}
            </div>
            </div>
        );
    }

    onMouseEnterIntersection(x: number, y: number) {
        const coord = xy2coord(x, y);
        if (this.props.candidates.map(e => e.move).includes(coord)) {
            this.setState({ candidate: coord });
        }
    }

    onMouseLeaveIntersection(x: number, y: number) {
        if (this.state.candidate) {
            this.setState({ candidate: undefined });
        }
    }
}

interface GoIntersectionProps {
    stone?: string;
    number?: number;
    winrate?: string;
    playouts?: number | string;
    fillColor?: string;
    borderWidth?: string;
    borderColor?: string;
    backgroundColor?: string;
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

interface GoIntersectionState {

}

class GoIntersection extends React.PureComponent<GoIntersectionProps, GoIntersectionState> {
    render() {
        let url;
        switch (this.props.stone) {
            case "B":
            url = "url(https://storage.googleapis.com/mimiaka-storage/mimiaka/public/images/nachiguro2.png)";
            break;
            case "W":
            url = "url(https://storage.googleapis.com/mimiaka-storage/mimiaka/public/images/hamaguri2.png)";
            break;
            default:
            url = undefined;
        }
        const intersectionStyle: CSSProperties = {
            color: this.props.stone === "B" ? "white" : "black",
            backgroundImage: url,
            backgroundColor: this.props.backgroundColor,
        }
        const infoStyle: CSSProperties = {
            backgroundColor: this.props.fillColor,
            borderWidth: this.props.borderWidth,
            borderColor: this.props.borderColor,
        }
        return (
            <div className="go-intersection" style={intersectionStyle} onClick={this.props.onClick} onMouseEnter={this.props.onMouseEnter} onMouseLeave={this.props.onMouseLeave}>
                <div className="go-intersection-number">{this.props.number}</div>
                <div className="go-intersection-info" style={infoStyle}>
                    <div>{this.props.winrate}</div>
                    <div>{typeof this.props.playouts === "number" ? shortStringOfInteger(this.props.playouts) : this.props.playouts}</div>
                </div>
            </div>
        );
    }
}

export default GoBoard;
