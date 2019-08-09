import React from 'react';
import ReactDOM from 'react-dom';
import GoBoard, { GoIntersectionState } from './GoBoard';
import { Board } from './board';
import { BoardConstants, IntersectionState } from './board_constants';
import { AZjsEngine } from './azjs_engine_client';

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
        r: r * 0.7,
        g: g * 0.7,
        b: b * 0.7,
    }
}


function board2intersections(board) {
    const intersections = new Array(board.C.BVCNT);
    for (let i = 0; i < intersections.length; i++) {
        const intersection  = new GoIntersectionState();
        switch (board.state[board.C.rv2ev(i)]) {
            case IntersectionState.BLACK:
            intersection.stone = "B";
            break;
            case IntersectionState.WHITE:
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
    }
    
    async start(size) {
        this.size = size;
        const byoyomi = 3;
        this.model = new Board(new BoardConstants(this.size));
        this.engine = new AZjsEngine(this.size);
        const intersections = board2intersections(this.model);
        this.render(intersections);
        await this.engine.loadNN();
        await this.engine.timeSettings(0, byoyomi);
        while (true) {
            const [move, winRate, num] = await this.engine.genmove("best");
            switch (move) {
                case "resign":
                return;
                case "pass":
                this.model.play(this.model.C.PASS);
                break;
                default:
                this.play(move[0], move[1]);
            }
        }
    }

    play(x, y) {
        try {
            this.model.play(this.model.C.xy2ev(x, y));
            this.render(board2intersections(this.model));
        } catch (e) {
            console.log(e);
        }
    }

    onMouseEnterIntersection(x, y) {
        console.log("onMouseEnterIntersection");
        return;
        const intersections = board2intersections(this.model);
        let variation;
        this.addVariationInfo(intersections, variation);
        this.render(intersections);
    }

    onMouseLeaveIntersection(x, y) {
        console.log("onMouseLeaveIntersection");
        return;
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
        const maxPlayouts = candidates[0].playouts;
        const maxWinrate = Math.max(...candidates.map(e => e.winate));
        const saturation = 0.75;
        const brightness = 0.85;
        const maxAlpha = 240;
        const minAlpha = 32;
        const hueFactor = 3.0;
        const alphaFactor = 5.0;
        const greenHue = RGBtoHSV(0, 255, 0).h;
        const cyanHue = RGBtoHSV(0, 255, 255).h;
        for (const [i, candidate] of candidates.entries()) {
            if (!candidate.primaryVariation[0]) {
                continue;
            }
            const [x, y] = this.model.C.move2xy(candidate.primaryVariation[0]);
            const intersection = intersections[(y - 1) * this.model.C.BSIZE + x - 1];
            intersection.winrate = candidate.winrate;
            intersection.playouts = candidates.playouts;
    
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
    
    addVariationInfo(intersections, variation) {
    
    }
}

export default GoBoardController;
