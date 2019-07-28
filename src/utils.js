/**
 * @file 各種ユーティリティ関数群です。
 */
/*
 * @author 市川雄二
 * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
 * @license MIT
 */

/**
 * @param {Array} array
 */
export function shuffle(array) {
    let n = array.length;
    let t;
    let i;

    while (n) {
        i = Math.floor(Math.random() * n--);
        t = array[n];
        array[n] = array[i];
        array[i] = t;
    }

    return array;
}

/**
 * arrayの中の最頻出要素を返します。
 * @param {Array} array 
 */
export function mostCommon(array) {
    const map = new Map();
    for (const e of array) {
        if (map.has(e)) {
            map.set(e, map.get(e) + 1);
        } else {
            map.set(e, 1);
        }
    }
    return argmax(map);
}

/**
 * arrayをソートした時のインデックス配列を返します。
 * secondを与えると、arrayの値が等しい時、secondで比較します。
 * @param {number[]} array 
 * @param {number[]} second 
 * @param {bool} reverse 
 */
export function argsort(array, reverse, second = null) {
    const indices = array.map((e, i) => i);
    if (second == null) {
        if (reverse) {
            indices.sort((a, b) => array[b] - array[a]);
        } else {
            indices.sort((a, b) => array[a] - array[b]);
        }
    } else {
        if (reverse) {
            indices.sort((a, b) => {
                const cmp = array[b] - array[a];
                return cmp !== 0 ? cmp : second[b] - second[a];
            });
        } else {
            indices.sort((a, b) => {
                const cmp = array[a] - array[b];
                return cmp !== 0 ? cmp : second[a] - second[b];
            });
        }
    }
    return indices
}

/**
 * objの中の最大値のキーを返します。
 * 配列にもMapインスタンスにも使えます。
 * @param {Object} obj 
 */
export function argmax(obj) {
    let maxIndex;
    let maxValue = -Infinity;
    for (const [i, v] of obj.entries()) {
        if (v > maxValue) {
            maxIndex = i;
            maxValue = v;
        }
    }
    return maxIndex;
}

/**
 * 温度パラメータありのソフトマックス関数です。
 * @param {Float32Array} input 
 * @param {number} temperature
 * @returns {Float32Array}
 */
export function softmax(input, temperature = 1.0) {
    const output = new Float32Array(input.length);
    const alpha = Math.max.apply(null, input);
    let denom = 0.0;

    for (let i = 0; i < input.length; i++) {
        const val = Math.exp((input[i] - alpha) / temperature);
        denom += val;
        output[i] = val;
    }

    for (let i = 0; i < output.length; i++) {
        output[i] /= denom;
    }

    return output;
}

export function printProb(prob, size = 19) {
    for (let y = 0; y < size; y++) {
        let str = `${y + 1} `;
        for (let x = 0; x < size; x++) {
            str += ('  ' + prob[x + y * size].toFixed(1)).slice(-5);
        }
        console.log(str);
    }
    console.log('pass=%s', prob[prob.length - 1].toFixed(1));
}

/**
 * 与えられた範囲の整数乱数を返します。
 * 引数を省略すると符号付き32ビット整数の乱数を返します。
 * @param {Integer} min
 * @param {Integer} max
 */
export function random(min = -0x80000000, max = 0x7FFFFFFF) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 2要素配列をキーとするMapクラスです */
export class TwoKeyMap {
    constructor() {
        this.map = new Map();
    }
    get size() {
        let result = 0;
        for (const e of this.map.values) {
            result += e.size;
        }
        return result;
    }
    clear() {
        this.map.clear();
    }
    delete(key) {
        const map = this.map.get(key[0]);
        if (map == null) {
            return false;
        }
        return map.delete(key[1]);
    }
    entries() {
        /* TODO: 現在、配列を返す。イテレータを返すようにする。 */
        const result = [];
        for (const k0 of this.map.keys()) {
            for (const e of this.map.get(k0).entries()) {
                result.push([[k0, e[0]], e[1]]);
            }
        }
        return result;
    }
    get(key) {
        const map = this.map.get(key[0]);
        return map == null ? undefined : map.get(key[1]);
    }
    has(key) {
        return this.map.has(key[0]) && this.map.get(key[0]).has(key[1]);
    }
    keys() {
        /* TODO: 現在、配列を返す。イテレータを返すようにする。 */
        const result = [];
        for (const k0 of this.map.keys()) {
            for (const k1 of this.map.get(k0).keys()) {
                result.push([k0, k1]);
            }
        }
        return result;
    }
    set(key, value) {
        let map = this.map.get(key[0]);
        if (map == null) {
            map = new Map();
            this.map.set(key[0], map);
        }
        map.set(key[1], value);
    }
    values() {
        /* TODO: 現在、配列を返す。イテレータを返すようにする。 */
        const result = [];
        for (const map of this.map.values()) {
            for (const v of map.values()) {
                result.push(v);
            }
        }
        return result;
    }
    toString() {
        return this.entries().map(e => e.map(e => e.toString()).join(': ')).join('\n');
    }
}
