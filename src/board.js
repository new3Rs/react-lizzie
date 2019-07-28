/**
 * @file 碁盤クラスです。
 * このコードはPyaqの移植コードです。
 * @see {@link https://github.com/ymgaq/Pyaq}
 */
/*
 * @author 市川雄二 
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */
import { shuffle, mostCommon, random } from './utils.js';
import { X_LABELS, IntersectionState } from './board_constants.js';
import { StoneGroup } from './stone_group.js';

/// ニューラルネットワークへの入力に関する履歴の深さです。
const KEEP_PREV_CNT = 7;
const FEATURE_CNT = KEEP_PREV_CNT * 2 + 4;

/**
 * ニューラルネットワークの入力のインデックスを計算します。
 * @param {UInt16} rv 碁盤の交点の線形座標
 * @param {Integer} f フィーチャー番号
 */
function featureIndex(rv, f) {
    return rv * FEATURE_CNT + f;
}

/**
 * 碁盤の基本クラスです。
 */
class BaseBoard {
    /**
     * @param {BoardConstants} constants
     * @param {number} komi 
     */
    constructor(constants, komi = 7.5) {
        this.C = constants;
        this.komi = komi;
        /** 交点の状態配列です。インデックスは拡張線形座標です。 */
        this.state = new Uint8Array(this.C.EBVCNT);
        this.state.fill(IntersectionState.EXTERIOR);
        this.id = new Uint16Array(this.C.EBVCNT); // 交点の連IDです。
        this.next = new Uint16Array(this.C.EBVCNT); // 交点を含む連の次の石の座標です。
        this.sg = []; // 連情報です。
        for (let i = 0; i < this.C.EBVCNT; i++) {
            this.sg.push(new StoneGroup(this.C));
        }
        this.prevState = [];
        this.ko = this.C.VNULL;
        /** 手番です。 */
        this.turn = IntersectionState.BLACK;
        /** 現在の手数です。 */
        this.moveNumber = 0;
        /** 直前の着手です。 */
        this.prevMove = this.C.VNULL;
        this.removeCnt = 0;
        this.history = [];
        this.hashValue = 0x87654321;
        this.reset();
    }

    /**
     * 状態を初期化します。
     */
    reset() {
        for (let x = 1; x <= this.C.BSIZE; x++) {
            for (let y = 1; y <= this.C.BSIZE; y++) {
                this.state[this.C.xy2ev(x, y)] = IntersectionState.EMPTY;
            }
        }
        for (let i = 0; i < this.id.length; i++) {
            this.id[i] = i;
        }
        for (let i = 0; i < this.next.length; i++) {
            this.next[i] = i;
        }
        this.sg.forEach(e => { e.clear(false) });
        this.prevState = [];
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            this.prevState.push(this.state.slice());
        }
        this.ko = this.C.VNULL;
        this.turn = IntersectionState.BLACK;
        this.moveNumber = 0;
        this.prevMove = this.C.VNULL;
        this.removeCnt = 0;
        this.history = [];
        this.hashValue = 0x87654321;
    }

    /**
     * destに状態をコピーします。
     * @param {Board} dest 
     */
    copyTo(dest) {
        dest.state = this.state.slice();
        dest.id = this.id.slice();
        dest.next = this.next.slice();
        for (let i = 0; i < dest.sg.length; i++) {
            this.sg[i].copyTo(dest.sg[i]);
        }
        dest.prevState = [];
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            dest.prevState.push(this.prevState[i].slice());
        }
        dest.ko = this.ko;
        dest.turn = this.turn;
        dest.moveNumber = this.moveNumber;
        dest.removeCnt = this.removeCnt;
        dest.history = this.history.slice();
        dest.hashValue = this.hashValue;
    }

    /**
     * 拡張線形座標の配列を受け取って順に着手します。
     * @param {Uin16[]} sequence 
     * @throws {Error}
     */
    playSequence(sequence) {
        for (const v of sequence) {
            this.play(v);
        }
    }

    /**
     * 交点にある石を含む連を盤上から打ち上げます。
     * @param {Uint16} v 拡張線形座標
     */
    remove(v) {
        let vTmp = v;
        do {
            this.removeCnt += 1;
            this.state[vTmp] = IntersectionState.EMPTY;
            this.id[vTmp] = vTmp;
            for (const nv of this.C.neighbors(vTmp)) {
                this.sg[this.id[nv]].add(vTmp);
            }
            const vNext = this.next[vTmp];
            this.next[vTmp] = vTmp;
            vTmp = vNext;
        } while (vTmp !== v);
    }

    /**
     * 交点にある石の連を結合します。
     * @param {Uint16} v1 拡張線形座標
     * @param {Uint16} v2 拡張線形座標
     */
    merge(v1, v2) {
        let idBase = this.id[v1];
        let idAdd = this.id[v2];
        if (this.sg[idBase].getSize() < this.sg[idAdd].getSize()) {
            let tmp = idBase;
            idBase = idAdd;
            idAdd = tmp;
        }

        this.sg[idBase].merge(this.sg[idAdd]);

        let vTmp = idAdd;
        do {
            this.id[vTmp] = idBase;
            vTmp = this.next[vTmp];
        } while (vTmp !== idAdd);
        const tmp = this.next[v1];
        this.next[v1] = this.next[v2];
        this.next[v2] = tmp;
    }

    /**
     * 交点vに着手するヘルパーメソッドです。
     * 着手にはplayメソッドを使ってください。
     * @private
     * @param {Uint16} v 拡張線形座標
     */
    placeStone(v) {
        const stoneColor = this.turn;
        this.state[v] = stoneColor;
        this.id[v] = v;
        this.sg[this.id[v]].clear(true);
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === IntersectionState.EMPTY) {
                this.sg[this.id[v]].add(nv);
            } else {
                this.sg[this.id[nv]].sub(v);
            }
        }
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === stoneColor && this.id[nv] !== this.id[v]) {
                this.merge(v, nv);
            }
        }
        this.removeCnt = 0;
        const opponentStone = IntersectionState.opponentOf(this.turn);
        for (const nv of this.C.neighbors(v)) {
            if (this.state[nv] === opponentStone && this.sg[this.id[nv]].getLibCnt() === 0) {
                this.remove(nv);
            }
        }
    }

    /**
     * 交点が着手禁止でないかを返します。
     * 石が既に存在する交点、コウによる禁止、自殺手が着手禁止点です。
     * @param {*} v 拡張線形座標
     * @returns {bool} 
     */
    legal(v) {
        if (v === this.C.PASS) {
            return true;
        } else if (v === this.ko || this.state[v] !== IntersectionState.EMPTY) {
            return false;
        }

        const stoneCnt = [0, 0];
        const atrCnt = [0, 0];
        for (const nv of this.C.neighbors(v)) {
            const c = this.state[nv];
            switch (c) {
                case IntersectionState.EMPTY:
                return true;
                case IntersectionState.BLACK:
                case IntersectionState.WHITE:
                stoneCnt[c] += 1;
                if (this.sg[this.id[nv]].getLibCnt() === 1) {
                    atrCnt[c] += 1;
                }
            }
        }
        return atrCnt[IntersectionState.opponentOf(this.turn)] !== 0 ||
            atrCnt[this.turn] < stoneCnt[this.turn];
    }

    /**
     * 交点vが眼形かどうかを返します。
     * コウ付きでコウを取れる場合、眼形と判定します。
     * @private
     * @param {Uint16} v 
     * @param {number} pl player color
     */
    eyeshape(v, pl) {
        if (v === this.C.PASS) {
            return false;
        }
        const opponent = IntersectionState.opponentOf(pl);
        for (const nv of this.C.neighbors(v)) {
            const c = this.state[nv];
            if (c === IntersectionState.EMPTY || c === opponent) { // ポン抜きの形でなければ
                return false;
            }
            if (c === pl && this.sg[this.id[nv]].getLibCnt() === 1) { // ポン抜きの形を作る石のどれかがアタリなら
                return false;
            }
        }
        const diagCnt = [0, 0, 0, 0];
        const diagonals = this.C.diagonals(v);
        for (const nv of diagonals) {
            diagCnt[this.state[nv]] += 1;
        }
        const wedgeCnt = diagCnt[opponent] + (diagCnt[3] > 0 ? 1 : 0);
        if (wedgeCnt === 2) {
            for (const nv of diagonals) {
                if (this.state[nv] === opponent &&
                    this.sg[this.id[nv]].getLibCnt() === 1 &&
                    this.sg[this.id[nv]].getVAtr() !== this.ko) {
                        return true;
                    }
            }
        }
        return wedgeCnt < 2;
    }

    /**
     * 交点vに着手します。
     * @param {*} v 拡張線形座標
     * @param {*} notFillEye 眼を潰すことを許可しない
     * @throws {Error}
     */
    play(v, notFillEye = false) {
        if (!this.legal(v)) {
            this.showboard();
            console.log(v, this.C.ev2str(v));
            throw new Error('illegal move');
        }
        if (notFillEye && this.eyeshape(v, this.turn)) {
            throw new Error('eye-fill move');
        }
        for (let i = KEEP_PREV_CNT - 2; i >= 0; i--) {
            this.prevState[i + 1] = this.prevState[i];
        }
        this.prevState[0] = this.state.slice();
        if (v === this.C.PASS) {
            this.ko = this.C.VNULL;
        } else {
            this.placeStone(v);
            const id = this.id[v];
            this.ko = this.C.VNULL;
            if (this.removeCnt === 1 && this.sg[id].getLibCnt() === 1 && this.sg[id].getSize() === 1) {
                this.ko = this.sg[id].getVAtr();
            }
        }
        this.prevMove = v;
        this.history.push(v);
        this.hashValue ^= this.C.ZobristHashes[this.turn][v];
        this.turn = IntersectionState.opponentOf(this.turn);
        this.moveNumber += 1;
    }

    /**
     * ハッシュ値を返します。
     * @returns {number}
     */
    hash() {
        return this.hashValue + this.ko;
    }

    /**
     * 眼形を潰さないようにランダムに着手します。
     * @returns {Uint16}
     */
    randomPlay() {
        const emptyList = [];
        for (let i = 0; i < this.state.length; i++) {
            if (this.state[i] === IntersectionState.EMPTY) {
                emptyList.push(i);
            }
        }
        shuffle(emptyList);
        for (const v of emptyList) {
            try {
                this.play(v, true);
                return v;
            } catch (e) {}
        }
        this.play(this.C.PASS);
        return this.C.PASS;
    }

    /**
     * colorかcolorに届く交点の数を返します。
     * @private
     * @param {InersectionState} color 
     * @returns {Integer}
     */
    pointsReach(color) {
        const bd = this.state.map(e => e === color ? 1 : 0);
        let reachable = bd.reduce((a, b) => a + b);
        const open = [];
        for (let i = 0; i < bd.length; i++) {
            if (bd[i] === 1) {
                open.push(i);
            }
        }

        while (open.length > 0) {
            const v = open.shift();
            for (const n of this.C.neighbors(v)) {
                if (bd[n] !== 1 && this.state[n] === IntersectionState.EMPTY) {
                    reachable++;
                    bd[n] = 1;
                    open.push(n);
                }
            }
        }
        return reachable;
    }

    /**
     * Tromp-Tayerスコアを返します。
     * @returns {Number}
     */
    score() {
        return this.pointsReach(IntersectionState.BLACK) - this.pointsReach(IntersectionState.WHITE) - this.komi;
    }

    /**
     * 眼以外着手可能な交点がなくなるまでランダムに着手します。
     * showBoardがtrueのとき終局
     * @param {bool}} showBoard 
     */
    rollout(showBoard) {
        while (this.moveNumber < this.C.EBVCNT * 2) {
            const prevMove = this.prevMove;
            const move = this.randomPlay();
            if (showBoard && move !== this.C.PASS) {
                console.log('\nmove count=%d', this.moveNumber);
                this.showboard();
            }
            if (prevMove === this.C.PASS && move === this.C.PASS) {
                break;
            }
        }
    }

    toString(mark = false) {
        let result = this.xLabel();
        for (let y = this.C.BSIZE; y > 0; y--) {
            let lineStr = (' ' + y.toString()).slice(-2);
            for (let x = 1; x <= this.C.BSIZE; x++) {
                const v = this.C.xy2ev(x, y);
                let xStr;
                switch (this.state[v]) {
                    case IntersectionState.BLACK:
                    xStr = mark && v === this.prevMove ? '[X]' : ' X ';
                    break;
                    case IntersectionState.WHITE:
                    xStr = mark && v === this.prevMove ? '[O]' : ' O ';
                    break;
                    case IntersectionState.EMPTY:
                    xStr = ' . ';
                    break;
                    default:
                    xStr = ' ? ';
                }
                lineStr += xStr;
            }
            lineStr += (' ' + y.toString()).slice(-2);
            result += lineStr + '\n';
        }
        result += this.xLabel();
        return result;
    }

    /**
     * toStringのヘルパーメソッドです。
     * @private
     */
    xLabel() {
        let lineStr = '  ';
        for (let x = 1; x <= this.C.BSIZE; x++) {
            lineStr += ` ${X_LABELS[x]} `;
        }
        return lineStr + '\n';
    }

    /**
     * 碁盤をコンソールに出力します。
     */
    showboard(mark) {
        console.log(this.toString(mark));
    }

    /**
     * 着手可能な交点の情報を返します。
     * @returns {Integer[]} 着手可能な交点線形座標(拡張線形座標ではありません)
     */
    candidates() {
        const result = [];
        for (let v = 0; v < this.state.length; v++) {
            if (this.legal(v)) {
                result.push(this.C.ev2rv(v));
            }
        }
        result.push(this.C.ev2rv(this.C.PASS));
        return result;
    }

    /**
     * 統計的手法で整地した結果を返します。
     * @private
     */
    finalScore() {
        const ROLL_OUT_NUM = 256;
        const scores = [];
        let bCpy = new Board(this.C, this.komi);
        for (let i = 0; i < ROLL_OUT_NUM; i++) {
            this.copyTo(bCpy);
            bCpy.rollout(false);
            scores.push(bCpy.score());
        }
        return mostCommon(scores);
    }
}

/**
 * 碁盤クラスです。
 */
export class Board extends BaseBoard {
    /**
     * ニューラルネットワークを使用する際の入力フィーチャーを生成します。
     * @param {Integer} symmetry
     * @returns {Float32Array}
     */
    feature(symmetry = 0) {
        const array = new Float32Array(this.C.BVCNT * FEATURE_CNT);
        const my = this.turn;
        const opp = IntersectionState.opponentOf(this.turn);

        const N = KEEP_PREV_CNT + 1;
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), 0)] = this.state[this.C.rv2ev(p)] === my ? 1.0 : 0.0;
        }
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), N)] = this.state[this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
        }
        for (let i = 0; i < KEEP_PREV_CNT; i++) {
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), i + 1)] = this.prevState[i][this.C.rv2ev(p)] === my ? 1.0 : 0.0;
            }
            for (let p = 0; p < this.C.BVCNT; p++) {
                array[featureIndex(this.C.getSymmetricRawVertex(p, symmetry), N + i + 1)] = this.prevState[i][this.C.rv2ev(p)] === opp ? 1.0 : 0.0;
            }
        }
        let is_black_turn, is_white_turn;
        if (my === IntersectionState.BLACK) {
            is_black_turn = 1.0;
            is_white_turn = 0.0;
        } else {
            is_black_turn = 0.0;
            is_white_turn = 1.0;
        }
        for (let p = 0; p < this.C.BVCNT; p++) {
            array[featureIndex(p, FEATURE_CNT - 2)] = is_black_turn;
            array[featureIndex(p, FEATURE_CNT - 1)] = is_white_turn;
        }
        return array;
    }

    /**
     * ニューラルネットワークで局面を評価します。
     * ランダムに局面を対称変換させる機能を持ちます。
     * @param {NeuralNetwork} nn
     * @param {bool} random
     * @returns {Float32Array[]}
     */
    async evaluate(nn, randomSymmetry = true) {
        const symmetry = randomSymmetry ? random(0, 7) : 0;
        let [prob, value] = await nn.evaluate(this.feature(symmetry));
        if (symmetry !== 0) {
            const p = new Float32Array(prob.length);
            for (let rv = 0; rv < this.C.BVCNT; rv++) {
                p[rv] = prob[this.C.getSymmetricRawVertex(rv, symmetry)];
            }
            p[prob.length - 1] = prob[prob.length - 1];
            prob = p;
        }
        return [prob, value];
    }
}
