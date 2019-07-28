/**
 * @file 囲碁の連を表すクラスです。
 * このコードはPyaqの移植コードです。
 * @see {@link https://github.com/ymgaq/Pyaq}
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/** 連情報クラス */
export class StoneGroup {
    /**
     * 
     * @param {object} boardConstants
     */
    constructor(boardConstants) {
        this.C = boardConstants;
        this.libCnt = this.C.VNULL;
        this.size = this.C.VNULL;
        this.vAtr = this.C.VNULL;
        this.libs = new Set();
    }

    getSize() {
        return this.size;
    }

    getLibCnt() {
        return this.libCnt;
    }

    getVAtr() {
        return this.vAtr;
    }

    /**
     * stoneがtrueの時、石1つの連として初期化します。
     * stoneがfalseの時、空点として初期化します。
     * @param {bool} stone 
     */
    clear(stone) {
        this.libCnt = stone ? 0 : this.C.VNULL;
        this.size = stone ? 1 : this.C.VNULL;
        this.vAtr = this.C.VNULL;
        this.libs.clear();
    }

    /**
     * 空点vを追加します。
     * @param {Uint16} v 
     */
    add(v) {
        if (this.libs.has(v)) {
            return;
        }
        this.libs.add(v);
        this.libCnt += 1;
        this.vAtr = v;
    }

    /**
     * 空点vを削除します。
     * @param {Uint16} v 
     */
    sub(v) {
        if (!this.libs.has(v)) {
            return;
        }
        this.libs.delete(v);
        this.libCnt -= 1;
    }

    /**
     * 連をマージします。
     * @param {StoneGroup} other 
     */
    merge(other) {
        this.libs = new Set([...this.libs, ...other.libs]);
        this.libCnt = this.libs.size;
        this.size += other.size;
        if (this.libCnt === 1) {
            this.vAtr = this.libs[0];
        }
    }

    /**
     * コピーします。
     * @param {StoneGroup} dest 
     */
    copyTo(dest) {
        dest.libCnt = this.libCnt;
        dest.size = this.size;
        dest.vAtr = this.vAtr;
        dest.libs = new Set(this.libs);
    }
}
