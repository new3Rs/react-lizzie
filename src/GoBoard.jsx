/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from 'react';
import './GoBoard.css';
import { sprintf } from "sprintf-js";
import GoPosition, { BLACK, WHITE, opponentOf, coord2xy, xy2coord } from './GoPosition';

/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR 
 * h, s, v
*/
function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s;
        v = h.v;
        h = h.h;
    }
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
        case 5:
        r = v;
        g = p;
        b = q;
        break;
        default:
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
function RGBtoHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g;
        b = r.b;
        r = r.r;
    }
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
        case b:
        h = (r - g) + d * 4;
        h /= 6 * d;
        break;
        default:
        break;
    }

    return {
        h: h,
        s: s,
        v: v
    };
}

function darker(r, g, b) {
    const ratio = 0.7;
    if (arguments.length === 1) {
        r = r.r;
        g = r.g;
        b = r.b;
    }
    return {
        r: r * ratio,
        g: g * ratio,
        b: b * ratio,
    }
}

function shortStringOfInteger(n) {
    if (n < 1000) {
        return sprintf('%d', n);
    } else if (n < 10000) {
        return sprintf('%.1fk', n / 1000);
    } else if (n < 1000000) {
        return sprintf('%.0fk', n / 1000);
    } else if (n < 10000000) {
        return sprintf('%.1fM', n / 1000000);
    } else if (n < 1000000000) {
        return sprintf('%.0fM', n / 1000000);
    } else {
        return sprintf('%.0G', n / 1000000000);
    }
}

export function board2intersections(board) {
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

function addCandidatesInfo(intersections, model, candidates) {
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
                intersection.borderCoor = "red";
            } else {
                intersection.borderWidth = "1px";
                const c = darker(color);
                intersection.borderCoor = `rgba(${c.r},${c.g},${c.b},${alpha})`;
            }
        } else if (intersection.winrate === maxWinrate) {
            intersection.borderWidth = "2px";
            intersection.borderCoor = "blue";
        }
        intersection.fillColor = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    }
}

function variationIntersections(model, candidates, candidate) {
    const info = candidates.find(e => e.move === candidate);
    if (!info) {
        return null;
    }
    const position = GoPosition.copy(model);
    for (const move of info.pv) {
        position.play(position.xyToPoint.apply(position, coord2xy(move)));
    }
    const intersections = board2intersections(position);
    let turn = model.turn;
    const first = intersections[position.xyToPoint.apply(position, coord2xy(info.pv[0]))];
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

function addOwnership(intersections, model, ownership) {
    if (this.model.turn === BLACK) {
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

export class GoIntersectionState {
    constructor() {
        this.stone = null;
        this.number = null;
        this.winrate = null;
        this.playouts = null;
        this.fillColor = null;
        this.borderWidth = null;
        this.borderColor = null;
        this.backgroundColor = null;
    }
}

function range(start, end) {
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

class GoBoard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            candidate: null
        };
    }

    index(x, y) {
        return this.props.w * (y - 1) + x - 1;
    }

    /*, number, winrate, visits, backgroundColor, borderColor) {

    }*/

    renderIntersection(intersections, x, y) {
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
                borderColor={intersection.borderColor}
                backgroundColor={intersection.backgroundColor}
            />
        );
    }

    render() {
        let intersections;
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
                {range(parseInt(this.props.h), 1).map(y => (
                    <div className="go-row" key={y}>
                        {range(1, parseInt(this.props.w)).map(x => this.renderIntersection(intersections, x, y))}
                    </div>
                ))}
            </div>
            </div>
        );
    }

    onMouseEnterIntersection(x, y) {
        const coord = xy2coord(x, y);
        if (this.props.candidates.map(e => e.move).includes(coord)) {
            this.candidate = coord;
            this.setState({ candidate: coord });
        }
    }

    onMouseLeaveIntersection(x, y) {
        if (this.state.candidate) {
            this.setState({ candidate: null });
        }
    }
}

class GoIntersection extends React.PureComponent {
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
            url = null;
        }
        const intersectionStyle = {
            color: this.props.stone === "B" ? "white" : "black",
            backgroundImage: url,
            backgroundColor: this.props.backgroundColor,
        }
        const infoStyle = {
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
