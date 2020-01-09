/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from 'react';
import ReactDOM from 'react-dom';
import SituationBar from './SituationBar';
import GoBoard, { GoIntersectionState } from './GoBoard';
import GoPosition, { BLACK, WHITE, opponentOf } from './GoPosition';
import Gtp from "./Gtp.js";
import { fstat } from 'fs';

function coord2xy(coord) {
    const c = coord.charCodeAt(0);
    const x = (c < "I".charCodeAt(0) ? c + 1 : c) - "A".charCodeAt(0);
    return [x, parseInt(coord.slice(1))];
}

function xy2coord(x, y) {
    const COORD = ["@", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
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
    constructor(container) {
        this.container = container;
        this.size = 19;
        this.byoyomi = 3;
        this.gtp = new Gtp();
        this.model = new GoPosition(this.size, 0);
        this.candidates = [];
        this.ownership = null;
        this.candidate = null;
        this.info = {
            percent: 50,
        };
        const intersections = board2intersections(this.model);
        this.render(intersections);
    }
    
    lzAnalyze() {
        this.gtp.lzAnalyze(100, result => {
            this.candidates = result;
            let intersections;
            if (this.candidate) {
                intersections = this.variationIntersections();
            } else {
                intersections = board2intersections(this.model);
                this.addCandidatesInfo(intersections, result);
            }
            const blackWinrate = (this.model.turn === BLACK ? result.winrate : 1 - result.winrate) * 100;
            this.info.percent = blackWinrate;
            this.info.black = `${blackWinrate.toFixed(1)}%`;
            this.info.white = `${(100 - blackWinrate).toFixed(1)}%`;
            if (intersections) {
                this.render(intersections);
            }
        });
    }

    kataAnalyze() {
        this.gtp.kataAnalyze(100, result => {
            if (result.info.length === 0) {
                return;
            }
            this.candidates = result.info;
            this.ownership = result.ownership;
            let intersections;
            if (this.candidate) {
                intersections = this.variationIntersections();
            } else {
                intersections = board2intersections(this.model);
                this.addCandidatesInfo(intersections, result.info);
            }
            const first = result.info[0];
            const blackWinrate = (this.model.turn === BLACK ? first.winrate : 1.0 - first.winrate) * 100;
            const blackScore = (this.model.turn === BLACK ? first.scoreMean : 1.0 - first.scoreMean).toFixed(1);
            const scoreStdev = first.scoreStdev.toFixed(1)
            this.info.percent = blackWinrate;
            if (blackWinrate >= 50) {
                this.info.black = `${blackWinrate.toFixed(1)}%(${blackScore}±${scoreStdev})`;
                this.info.white = `${(100 - blackWinrate).toFixed(1)}%`;
            } else {
                this.info.black = `${blackWinrate.toFixed(1)}%`;
                this.info.white = `${(100 - blackWinrate).toFixed(1)}%(${-blackScore}±${scoreStdev})`;
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
            this.kataAnalyze();
        } catch (e) {
            console.log(e);
        }
    }

    onMouseEnterIntersection(x, y) {
        const coord = xy2coord(x, y);
        if (this.candidates.map(e => e.move).includes(coord)) {
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
        const size = "500px";
        ReactDOM.render(
        <div>
            <SituationBar
                width={size}
                blackPercent={this.info.percent}
                blackInfo={this.info.black}
                whiteInfo={this.info.white}
            />
            <GoBoard
                width={size}
                height={size}
                w={this.size}
                h={this.size}
                intersections={intersections}
                onClickIntersection={(x, y) => this.play(x, y)}
                onMouseEnterIntersection={(x, y) => this.onMouseEnterIntersection(x, y)}
                onMouseLeaveIntersection={(x, y) => this.onMouseLeaveIntersection(x, y)}
            />
        </div>
        , this.container);
    }

    addCandidatesInfo(intersections, candidates) {
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
            const intersection = intersections[this.model.xyToPoint.apply(this.model, coord2xy(candidate.move))];
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
    
    variationIntersections() {
        const info = this.candidates.find(e => e.move === this.candidate);
        if (!info) {
            return null;
        }
        const position = GoPosition.copy(this.model);
        for (const move of info.pv) {
            position.play(position.xyToPoint.apply(position, coord2xy(move)));
        }
        const intersections = board2intersections(position);
        let turn = this.model.turn;
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
        if (info.order === 0 && this.ownership) {
            this.addOwnership(intersections, this.ownership);
        }
        return intersections;
    }

    addOwnership(intersections, ownership) {
        if (this.model.turn === BLACK) {
            for (const [i, v] of ownership.entries()) {
                if (i >= this.model.BOARD_SIZE2) {
                    break;
                }
                const value = v * 0.5;
                const [x, y] = this.model.pointToXy(i);
                const intersection = intersections[this.model.BOARD_SIZE * (this.model.BOARD_SIZE - y) + (x - 1)];
                intersection.backgroundColor = value > 0.0 ? `rgba(0,0,0,${value})` : `rgba(255,255,255,${-value})`;
            }
        } else {
            for (const [i, value] of ownership.entries()) {
                if (i >= this.model.BOARD_SIZE2) {
                    break;
                }
                const [x, y] = this.model.pointToXy(i);
                const intersection = intersections[this.model.BOARD_SIZE * (this.model.BOARD_SIZE - y) + (x - 1)];
                intersection.backgroundColor = value < 0.0 ? `rgba(0,0,0,${-value})` : `rgba(255,255,255,${value})`;
            }
        }
    }
}

export default GoBoardController;
