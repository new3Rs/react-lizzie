import React from 'react';
import ReactDOM from 'react-dom';
import GoBoard, { GoIntersectionState } from './GoBoard';
import GoPosition, { BLACK, WHITE, opponentOf } from './GoPosition';
import Gtp from "./Gtp.js";

function coord2xy(coord) {
    const c = coord.charCodeAt(0);
    const x = (c < "I".charCodeAt(0) ? c + 1 : c) - "A".charCodeAt(0);
    return [x, parseInt(coord.slice(1))];
}

function xy2coord(x, y) {
    const COORD = ["@", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"];
    return COORD[x] + y;
}

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


function board2intersections(board) {
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

class GoBoardController {
    constructor() {
        this.size = 19;
        this.byoyomi = 3;
        this.gtp = new Gtp();
        this.model = new GoPosition(this.size, 0);
        this.candidates = [];
        this.candidate = null;
        const intersections = board2intersections(this.model);
        this.render(intersections);
    }
    
    lzAnalyze() {
        console.log("lzAnalyze");
        this.gtp.lzAnalyze(100, result => {
            this.candidates = result;
            let intersections;
            if (this.candidate) {
                intersections = this.variationIntersections();
            } else {
                intersections = board2intersections(this.model);
                this.addCandidatesInfo(intersections, result);
            }
            if (intersections) {
                this.render(intersections);
            }
        });
    }

    async play(x, y) {
        try {
            this.model.play(this.model.xyToPoint(x, y));
            this.render(board2intersections(this.model));
            await this.gtp.command(`play ${this.model.turn === BLACK ? "black" : "white"} ${xy2coord(x, y)}`);
            this.lzAnalyze();
        } catch (e) {
            console.log(e);
        }
    }

    onMouseEnterIntersection(x, y) {
        const coord = xy2coord(x, y);
        if (this.candidates.map(e => e[0]).includes(coord)) {
            this.candidate = coord;
            const intersections = this.variationIntersections();
            this.render(intersections);
        }
    }

    onMouseLeaveIntersection(x, y) {
        if (this.candidate) {
            this.candidate = null;
            const intersections = board2intersections(this.model);
            this.addCandidatesInfo(intersections, this.candidates);
            this.render(intersections);
        }
    }

    render(intersections) {
        ReactDOM.render(<GoBoard
            width="500px"
            height="500px"
            w={this.size}
            h={this.size}
            intersections={intersections}
            onClickIntersection={(x, y) => this.play(x, y)}
            onMouseEnterIntersection={(x, y) => this.onMouseEnterIntersection(x, y)}
            onMouseLeaveIntersection={(x, y) => this.onMouseLeaveIntersection(x, y)}
        />, document.getElementById('root'));
    }

    addCandidatesInfo(intersections, candidates) {
        const maxPlayouts = Math.max(...candidates.map(e => e[1]));
        const maxWinrate = Math.max(...candidates.map(e => e[2]));
        const saturation = 0.75;
        const brightness = 0.85;
        const maxAlpha = 240;
        const minAlpha = 32;
        const hueFactor = 3.0;
        const alphaFactor = 5.0;
        const greenHue = RGBtoHSV(0, 255, 0).h;
        const cyanHue = RGBtoHSV(0, 255, 255).h;
        for (const [i, candidate] of candidates.entries()) {
            const intersection = intersections[this.model.xyToPoint.apply(this.model, coord2xy(candidate[0]))];
            intersection.winrate = (candidate[2] / 100).toFixed(1);
            intersection.playouts = candidate[1];
    
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
            intersection.backgroundColor = `rgba(${color.r},${color.g},${color.b},${alpha})`;
        }
    }
    
    variationIntersections() {
        const info = this.candidates.find(e => e[0] === this.candidate);
        if (!info) {
            return null;
        }
        const position = GoPosition.copy(this.model);
        for (const move of info[6]) {
            position.play(position.xyToPoint.apply(position, coord2xy(move)));
        }
        const intersections = board2intersections(position);
        let turn = this.model.turn;
        const first = intersections[position.xyToPoint.apply(position, coord2xy(info[6][0]))];
        first.winrate = (info[2] / 100).toFixed(1);
        first.playouts = info[1];
        first.textColor = turn === BLACK ? "white" : "black";
        let number = 2;
        turn = opponentOf(turn);
        for (const move of info[6].slice(1)) {
            const intersection = intersections[position.xyToPoint.apply(position, coord2xy(move))]
            intersection.number = number;
            intersection.textColor = turn === BLACK ? "white" : "black";
            turn = opponentOf(turn);
            number++;
        }
        return intersections;
    }
}

export default GoBoardController;
