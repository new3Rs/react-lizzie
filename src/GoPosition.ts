/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import jssgf from "jssgf";

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const PASS = -1;

type GoColor = 1 | 2; // BLACK, WHITE
type GoIntersectionState = 0 | 1 | 2; // EMPTY, BLACK, WHITE

export function opponentOf(color: GoColor): GoColor {
    return color === BLACK ? WHITE : BLACK;
}

export function coord2xy(coord: string): [number, number] {
    const c = coord.charCodeAt(0);
    const x = (c < "I".charCodeAt(0) ? c + 1 : c) - "A".charCodeAt(0);
    return [x, parseInt(coord.slice(1))];
}

export function xy2coord(x: number, y: number): string {
    const COORD = ["@", "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
    return COORD[x] + y;
}

class Marker {
    BOARD_SIZE: number;
    BOARD_SIZE2: number;
    value: number;
    marks: Int32Array;

    constructor(boardSize: number) {
        this.BOARD_SIZE = boardSize;
        this.BOARD_SIZE2 = boardSize * boardSize;
        this.value = 0;
        this.marks = new Int32Array(this.BOARD_SIZE2);
    }

    clear() {
        this.value += 1;
    }

    isMarked(point: number): boolean {
        return this.marks[point] === this.value;
    }

    mark(point: number) {
        this.marks[point] = this.value;
    }
}

const HANDICAPS = [
    [],
    [],
    [[16, 4], [4, 16]],
    [[16, 4], [4, 16], [16, 16]],
    [[16, 4], [4, 16], [16, 16], [4, 4]],
    [[16, 4], [4, 16], [16, 16], [4, 4], [10, 10]],
    [[16, 4], [4, 16], [16, 16], [4, 4], [16, 10], [4, 10]],
    [[16, 4], [4, 16], [16, 16], [4, 4], [16, 10], [4, 10], [10, 10]],
    [[16, 4], [4, 16], [16, 16], [4, 4], [16, 10], [4, 10], [10, 4], [10, 16]],
    [[16, 4], [4, 16], [16, 16], [4, 4], [16, 10], [4, 10], [10, 4], [10, 16], [10, 10]],
];


export interface GoMove {
    turn: GoColor;
    point: number;
    ko?: number;
    captives: number[];
    string: GoString;
}

class GoPosition {
    BOARD_SIZE: number;
    BOARD_SIZE2: number;
    moveNumber: number;
    turn: GoColor;
    state: { [name in GoColor]: Float32Array };
    ko?: number;
    recent8: number[];
    marker1: Marker;
    marker2: Marker;

    static copy(source: GoPosition) {
        const result = new GoPosition(source.BOARD_SIZE);
        result.state[BLACK].set(source.state[BLACK]);
        result.state[WHITE].set(source.state[WHITE]);
        result.turn = source.turn;
        result.ko = source.ko;
        return result;
    }

    static fromSgf(sgf: string, moveNumber: number = Infinity) {
        const [root] = jssgf.fastParse(sgf);
        const p = new this(parseInt(root.SZ || "19"));
        if (root["AB"]) {
            const list = Array.isArray(root["AB"]) ? root["AB"] : [root["AB"]];
            for (const move of list) {
                const xy = p.moveToXy(move);
                if (xy !== -1) {
                    p.setState(p.xyToPoint(xy[0], xy[1]), BLACK);
                }
            }
            p.turn = WHITE;
        }
        if (root["AW"]) {
            const list = Array.isArray(root["AW"]) ? root["AW"] : [root["AW"]];
            for (const move of list) {
                const xy = p.moveToXy(move);
                if (xy !== -1) {
                    p.setState(p.xyToPoint(xy[0], xy[1]), WHITE);
                }
            }
        }
        if (root["PL"]) {
            p.turn = root["PL"] === "B" ? BLACK : WHITE;
        }

        let node = root;
        let mn = 0;
        while (node._children.length > 0 && mn < moveNumber) {
            node = node._children[0];
            let move;
            if (node.B != null) {
                move = node.B;
            } else if (node.W != null) {
                move = node.W;
            } else {
                continue;
            }
            const xy = p.moveToXy(move);
            if (xy === PASS) {
                p.play(PASS);
            } else {
                p.play(p.xyToPoint.apply(p, xy));
            }
            mn++;
        }
        return p
    }

    constructor(boardSize: number) {
        this.BOARD_SIZE = boardSize;
        this.BOARD_SIZE2 = boardSize * boardSize;
        this.moveNumber = 0;
        this.state = {
            [BLACK]: new Float32Array(this.BOARD_SIZE2),
            [WHITE]: new Float32Array(this.BOARD_SIZE2)
        }
        this.turn = BLACK;
        this.recent8 = [];
        this.marker1 = new Marker(boardSize);
        this.marker2 = new Marker(boardSize);
        this.ko = undefined;
    }

    moveToXy(s: string): [number, number] | -1 {
        if (s === "") {
            return PASS;
        }
        const offset = "a".charCodeAt(0) - 1;
        return [s.charCodeAt(0) - offset, this.BOARD_SIZE - (s.charCodeAt(1) - offset) + 1];
    }
    
    xyToMove(x: number, y: number): string {
        const offset = "a".charCodeAt(0) - 1;
        return String.fromCharCode(x + offset) + String.fromCharCode(this.BOARD_SIZE - y + 1 + offset);
    }
    
    opponent() {
        return opponentOf(this.turn);
    }

    switchTurn() {
        this.turn = opponentOf(this.turn);
    }

    getState(point: number) {
        if (this.state[BLACK][point] === 1.0) {
            return BLACK;
        }
        if (this.state[WHITE][point] === 1.0) {
            return WHITE;
        }
        return EMPTY;
    }

    setState(point: number, color: GoIntersectionState) {
        if (color === EMPTY) {
            this.state[BLACK][point] = 0.0;
            this.state[WHITE][point] = 0.0;
        } else {
            this.state[color][point] = 1.0;
        }
    }

    removeString(string: GoString) {
        for (const e of string.points) {
            this.setState(e, EMPTY);
        }
    }

    captureBy(point: number): number[] {
        const opponent = this.opponent();
        const captives: number[] = [];
        for (const pt of this.adjacenciesAt(point)) {
            if (this.getState(pt) === opponent) {
                const string = this.stringAt(pt);
                if (string != null && string.liberties.length === 0) {
                    this.removeString(string);
                    captives.push.apply(captives, string.points);
                }
            }
        }
        return captives;
    }

    stringAt(point: number): GoString | undefined {
        const color = this.getState(point);
        if (color === EMPTY) {
            return undefined;
        }
        const opponent = opponentOf(color);
        const string = new GoString();

        this.marker1.clear();
        this.marker2.clear();
        string.points.push(point);
        this.marker2.mark(point);
        for (let index = 0; index < string.points.length; index++) {
            const pt = string.points[index];
            if (!this.marker1.isMarked(pt)) {
                this.marker1.mark(pt);
                for (const a of this.adjacenciesAt(pt)) {
                    if (!this.marker1.isMarked(a)) {
                        const state = this.getState(a);
                        if (state === color) {
                            if (!this.marker2.isMarked(a)) {
                                string.points.push(a);
                                this.marker2.mark(a);
                            }
                        } else {
                            this.marker1.mark(a);
                            if (state === opponent) {
                                string.opponents.push(a);
                            } else {
                                string.liberties.push(a);
                            }
                        }
                    }
                }
            }
        }
        return string;
    }

    putRecent8(point: number) {
        this.recent8.unshift(point);
        if (this.recent8.length > 8) {
            this.recent8.pop();
        }
    }

    play(point: number): GoMove | undefined {
        if (point === PASS) {
            this.putRecent8(point);
            this.switchTurn();
            this.moveNumber++;
            return {
                turn: this.turn,
                point,
                ko: this.ko,
                captives: [],
                string: new GoString()
            };
        }
        if (point === this.ko || this.getState(point) !== EMPTY) { // 着手禁止
            return undefined;
        }
        this.setState(point, this.turn);

        const captives = this.captureBy(point);
        const string = this.stringAt(point)!;
        const liberties = string.liberties.length;
        if (liberties === 0) { // 着手禁止
            this.setState(point, EMPTY); // restore
            return undefined;
        }
        const ko = this.ko;
        if (captives.length === 1 && liberties === 1 && string.points.length === 1) {
            this.ko = string.liberties[0];
        } else {
            this.ko = undefined;
        }
        this.putRecent8(point);
        const turn = this.turn;
        this.switchTurn();
        this.moveNumber++;
        return { turn, point, ko, captives, string };
    }

    undoPlay(move: GoMove) {
        this.ko = move.ko;
        this.switchTurn();
        this.moveNumber--;
        if (move.point === PASS) {
            return;
        }
        this.setState(move.point, EMPTY);
        const opponent = opponentOf(move.turn);
        for (const p of move.captives) {
            this.setState(p, opponent);
        }
    }

    isLegal(point: number): boolean {
        const move = this.play(point);
        if (move) {
            this.undoPlay(move);
            return true;
        }
        return false;
    }

    xyToPoint(x: number, y: number): number {
        return (x - 1) + (y - 1) * this.BOARD_SIZE;
    }

    pointToXy(point: number): [number, number] {
        const y = Math.floor(point / this.BOARD_SIZE);
        const x = point - y * this.BOARD_SIZE;
        return [x + 1, y + 1];
    }

    adjacenciesAt(point: number): number[] {
        const xy = this.pointToXy(point);
        const result = [];
        for (const e of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
            const x = xy[0] + e[0];
            const y = xy[1] + e[1];
            if (x >= 1 && x <= this.BOARD_SIZE && y >= 1 && y <= this.BOARD_SIZE) {
                result.push(this.xyToPoint(x, y));
            }
        }
        return result;
    }

    diagonalsAt(point: number) {
        const xy = this.pointToXy(point);
        const result = [];
        for (const e of [[-1, -1], [-1, 1], [1, -1], [1, -1]]) {
            const x = xy[0] + e[0];
            const y = xy[1] + e[1];
            if (x >= 1 && x <= this.BOARD_SIZE && y >= 1 && y <= this.BOARD_SIZE) {
                result.push(this.xyToPoint(x, y));
            }
        }
        return result;
    }

    canEscape(string: GoString): boolean {
        if (string.liberties.length > 1) { // アタリじゃない
            return true;
        }
        for (const o of string.opponents) { // 相手の石を取って逃げる
            const os = this.stringAt(o)!;
            if (os.liberties.length === 1) { // アタリの石
                const escape = this.play(os.liberties[0]);
                if (!escape) { // 着手禁止
                    continue;
                }
                const ss = this.stringAt(string.points[0])!; // stringの更新
                if (ss.liberties.length === 2) { // 取ってもまだシチョウ
                    for (const o of ss.liberties) {
                        const tryToCapture = this.play(o);
                        if (!tryToCapture) {
                            continue;
                        }
                        const result = this.canEscape(this.stringAt(ss.points[0])!);
                        this.undoPlay(tryToCapture);
                        if (!result) {
                            this.undoPlay(escape);
                            return false;
                        }
                    }
                    this.undoPlay(escape);
                    return true;
                } else {
                    this.undoPlay(escape);
                    return ss.liberties.length > 2;
                }
            }
        }
        const escape = this.play(string.liberties[0]);
        if (escape == null) {
            return false;
        }
        if (escape.string != null && escape.string.liberties.length === 2) {
            for (const o of escape.string.liberties) {
                const tryToCapture = this.play(o);
                if (!tryToCapture) {
                    continue;
                }
                const ss = this.stringAt(string.points[0])!;
                const result = this.canEscape(ss);
                this.undoPlay(tryToCapture);
                if (!result) {
                    this.undoPlay(escape);
                    return false;
                }
            }
            this.undoPlay(escape);
            return true;
        } else {
            this.undoPlay(escape);
            return escape.string.liberties.length !== 1;
        }
    }

    likeEye(point: number): boolean {
        if (this.getState(point) !== EMPTY) {
            return false;
        }
        const adjacencies = this.adjacenciesAt(point);
        if (!adjacencies.every(p => this.getState(p) === this.turn)) {
            return false;
        }
        return adjacencies.every(p => this.stringAt(p)!.liberties.length > 1);
    }

    isEyeOfTurn(point: number, stack: number[] = []): boolean {
        if (!this.likeEye(point)) {
            return false;
        }
        let numBadDiagonal = 0;
        const allowableBadDiagonal = this.adjacenciesAt(point).length === 4 ? 1 : 0;

        const opponent = opponentOf(this.turn);
        for (const d of this.diagonalsAt(point)) {
            if (this.getState(d) === opponent) {
                numBadDiagonal += 1;
            } else if (this.getState(d) === EMPTY && stack.indexOf(d) < 0) {
                stack.push(point);
                if (!this.isEyeOfTurn(d, stack)) {
                    numBadDiagonal += 1;
                }
                stack.pop();
            }
            if (numBadDiagonal > allowableBadDiagonal) {
                return false;
            }
        }
        return true;
    }

    isFalseEye(point: number): boolean {
        return this.likeEye(point) && !this.isEyeOfTurn(point);
    }

    toString(): string {
        let string ="";
        for (let y = 1; y <= this.BOARD_SIZE; y++) {
            for (let x = 1; x <= this.BOARD_SIZE; x++) {
                switch (this.getState(this.xyToPoint(x, y))) {
                    case EMPTY:
                        string += ".";
                        break;
                    case BLACK:
                        string += "X";
                        break;
                    case WHITE:
                        string += "O";
                        break;
                    default:
                }
            }
            string += "\n";
        }
        return string;
    }
}

class GoString {
    points: number[];
    liberties: number[];
    opponents: number[];
    constructor() {
        this.points = [];
        this.liberties = [];
        this.opponents = [];
    }
}

export default GoPosition;