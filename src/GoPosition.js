/* global jssgf */
/* exported GoPosition */
// (C) 2017 ICHIKAWA, Yuji (New 3 Rs)

export const PASS = -1;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export function opponentOf(color) {
    switch (color) {
        case BLACK:
            return WHITE;
        case WHITE:
            return BLACK;
        default:
            return EMPTY;
    }
}

function moveToXy(s) {
    if (s === '') {
        return PASS;
    }
    const offset = 'a'.charCodeAt(0) - 1;
    return [s.charCodeAt(0) - offset, s.charCodeAt(1) - offset];
}


class Marker {
    constructor(boardSize) {
        this.BOARD_SIZE = boardSize;
        this.BOARD_SIZE2 = boardSize * boardSize;
        this.value = 0;
        this.marks = new Int32Array(this.BOARD_SIZE2);
    }

    clear() {
        this.value += 1;
    }

    isMarked(point) {
        return this.marks[point] === this.value;
    }

    mark(point) {
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


class GoPosition {
    static copy(source) {
        const result = new GoPosition(source.BOARD_SIZE, 0);
        result.state[BLACK].set(source.state[BLACK]);
        result.state[WHITE].set(source.state[WHITE]);
        result.turn = source.turn;
        result.ko = source.ko;
        return result;
    }

    static fromSgf(sgf) {
        const [root] = jssgf.fastParse(sgf);
        const p = new this(parseInt(root.SZ || '19'));
        let node = root;
        while (node._children.length > 0) {
            node = node._children[0];
            let move;
            if (node.B != null) {
                move = node.B;
            } else if (node.W != null) {
                move = node.W;
            } else {
                continue;
            }
            p.play(p.xyToPoint.apply(p, moveToXy(move)));
        }
        return p
    }

    constructor(boardSize, handicap) {
        this.BOARD_SIZE = boardSize;
        this.BOARD_SIZE2 = boardSize * boardSize;
        this.state = {
            [BLACK]: new Float32Array(this.BOARD_SIZE2),
            [WHITE]: new Float32Array(this.BOARD_SIZE2)
        }
        this.recent8 = [];
        this.marker1 = new Marker(boardSize);
        this.marker2 = new Marker(boardSize);
        if (handicap > 1) {
            for (const xy of HANDICAPS[handicap]) {
                this.setState(this.xyToPoint(xy[0], xy[1]), BLACK);
            }
            this.turn = WHITE;
        } else {
            this.turn = BLACK;
        }
        this.ko = null;
    }

    opponent() {
        return opponentOf(this.turn);
    }

    switchTurn() {
        this.turn = opponentOf(this.turn);
    }

    getState(point) {
        if (this.state[BLACK][point] === 1.0) {
            return BLACK;
        }
        if (this.state[WHITE][point] === 1.0) {
            return WHITE;
        }
        return EMPTY;
    }

    setState(point, color) {
        if (color === EMPTY) {
            this.state[BLACK][point] = 0.0;
            this.state[WHITE][point] = 0.0;
        } else {
            this.state[color][point] = 1.0;
        }
    }

    removeString(string) {
        for (const e of string.points) {
            this.setState(e, EMPTY);
        }
    }

    captureBy(point) {
        const opponent = this.opponent();
        const captives = [];
        for (const pt of this.adjacenciesAt(point)) {
            if (this.getState(pt) === opponent) {
                const string = this.stringAt(pt);
                if (string.liberties.length === 0) {
                    this.removeString(string);
                    captives.push.apply(captives, string.points);
                }
            }
        }
        return captives;
    }

    stringAt(point) {
        const color = this.getState(point);
        if (color === EMPTY) {
            return null;
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

    putRecent8(point) {
        this.recent8.unshift(point);
        if (this.recent8.length > 8) {
            this.recent8.pop();
        }
    }

    play(point) {
        if (point === PASS) {
            this.putRecent8(point);
            this.switchTurn();
            return {
                turn: this.turn,
                point,
                ko: this.ko,
                captives: []
            };
        }
        if (point === this.ko || this.getState(point) !== EMPTY) { // 着手禁止
            return null;
        }
        this.setState(point, this.turn);

        const captives = this.captureBy(point);
        const string = this.stringAt(point);
        const liberties = string.liberties.length;
        if (liberties === 0) { // 着手禁止
            this.setState(point, EMPTY); // restore
            return null;
        }
        const ko = this.ko;
        if (captives.length === 1 && liberties === 1 && string.points.length === 1) {
            this.ko = string.liberties[0];
        } else {
            this.ko = null;
        }
        this.putRecent8(point);
        const turn = this.turn;
        this.switchTurn();
        return { turn, point, ko, captives, string };
    }

    undoPlay(move) {
        this.ko = move.ko;
        this.switchTurn();
        if (move.point === PASS) {
            return;
        }
        this.setState(move.point, EMPTY);
        const opponent = opponentOf(move.turn);
        for (const p of move.captives) {
            this.setState(p, opponent);
        }
    }

    isLegal(point) {
        const move = this.play(point);
        if (move) {
            this.undoPlay(move);
            return true;
        }
        return false;
    }

    xyToPoint(x, y) {
        return (x - 1) + (y - 1) * this.BOARD_SIZE;
    }

    pointToXy(point) {
        const y = Math.floor(point / this.BOARD_SIZE);
        const x = point - y * this.BOARD_SIZE;
        return [x + 1, y + 1];
    }

    adjacenciesAt(point) {
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

    diagonalsAt(point) {
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

    canEscape(string) {
        if (string.liberties.length > 1) { // アタリじゃない
            return true;
        }
        for (const o of string.opponents) { // 相手の石を取って逃げる
            const os = this.stringAt(o);
            if (os.liberties.length === 1) { // アタリの石
                const escape = this.play(os.liberties[0]);
                if (!escape) { // 着手禁止
                    continue;
                }
                const ss = this.stringAt(string.points[0]); // stringの更新
                if (ss.liberties.length === 2) { // 取ってもまだシチョウ
                    for (const o of ss.liberties) {
                        const tryToCapture = this.play(o);
                        if (!tryToCapture) {
                            continue;
                        }
                        const result = this.canEscape(this.stringAt(ss.points[0]));
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
        if (!escape) {
            return false;
        }
        if (escape.string.liberties.length === 2) {
            for (const o of escape.string.liberties) {
                const tryToCapture = this.play(o);
                if (!tryToCapture) {
                    continue;
                }
                const ss = this.stringAt(string.points[0]);
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

    likeEye(point) {
        if (this.getState(point) !== EMPTY) {
            return false;
        }
        const adjacencies = this.adjacenciesAt(point);
        if (!adjacencies.every(p => this.getState(p) === this.turn)) {
            return false;
        }
        return adjacencies.every(p => this.stringAt(p).liberties.length > 1);
    }

    isEyeOfTurn(point, stack=[]) {
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

    isFalseEye(point) {
        return this.likeEye(point) && !this.isEyeOfTurn(point);
    }

    toString() {
        let string ='';
        for (let y = 1; y <= this.BOARD_SIZE; y++) {
            for (let x = 1; x <= this.BOARD_SIZE; x++) {
                switch (this.getState(this.xyToPoint(x, y))) {
                    case EMPTY:
                        string += '.';
                        break;
                    case BLACK:
                        string += 'X';
                        break;
                    case WHITE:
                        string += 'O';
                        break;
                    default:
                }
            }
            string += '\n';
        }
        return string;
    }
}

class GoString {
    constructor() {
        this.points = [];
        this.liberties = [];
        this.opponents = [];
    }
}

export default GoPosition;