(function () {
  'use strict';

  var MACHINE_ID = Math.floor(Math.random() * 0xFFFFFF);
  var index = ObjectID.index = parseInt(Math.random() * 0xFFFFFF, 10);
  var pid = (typeof process === 'undefined' || typeof process.pid !== 'number' ? Math.floor(Math.random() * 100000) : process.pid) % 0xFFFF;

  /**
   * Determine if an object is Buffer
   *
   * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
   * License:  MIT
   *
   */
  var isBuffer = function (obj) {
    return !!(
    obj != null &&
    obj.constructor &&
    typeof obj.constructor.isBuffer === 'function' &&
    obj.constructor.isBuffer(obj)
    )
  };

  /**
   * Create a new immutable ObjectID instance
   *
   * @class Represents the BSON ObjectID type
   * @param {String|Number} arg Can be a 24 byte hex string, 12 byte binary string or a Number.
   * @return {Object} instance of ObjectID.
   */
  function ObjectID(arg) {
    if(!(this instanceof ObjectID)) return new ObjectID(arg);
    if(arg && ((arg instanceof ObjectID) || arg._bsontype==="ObjectID"))
      return arg;

    var buf;

    if(isBuffer(arg) || (Array.isArray(arg) && arg.length===12)) {
      buf = Array.prototype.slice.call(arg);
    }
    else if(typeof arg === "string") {
      if(arg.length!==12 && !ObjectID.isValid(arg))
        throw new Error("Argument passed in must be a single String of 12 bytes or a string of 24 hex characters");

      buf = buffer(arg);
    }
    else if(/number|undefined/.test(typeof arg)) {
      buf = buffer(generate(arg));
    }

    Object.defineProperty(this, "id", {
      enumerable: true,
      get: function() { return String.fromCharCode.apply(this, buf); }
    });
    Object.defineProperty(this, "str", {
      get: function() { return buf.map(hex.bind(this, 2)).join(''); }
    });
  }
  var objectid = ObjectID;
  ObjectID.generate = generate;
  ObjectID.default = ObjectID;

  /**
   * Creates an ObjectID from a second based number, with the rest of the ObjectID zeroed out. Used for comparisons or sorting the ObjectID.
   *
   * @param {Number} time an integer number representing a number of seconds.
   * @return {ObjectID} return the created ObjectID
   * @api public
   */
  ObjectID.createFromTime = function(time){
    time = parseInt(time, 10) % 0xFFFFFFFF;
    return new ObjectID(hex(8,time)+"0000000000000000");
  };

  /**
   * Creates an ObjectID from a hex string representation of an ObjectID.
   *
   * @param {String} hexString create a ObjectID from a passed in 24 byte hexstring.
   * @return {ObjectID} return the created ObjectID
   * @api public
   */
  ObjectID.createFromHexString = function(hexString) {
    if(!ObjectID.isValid(hexString))
      throw new Error("Invalid ObjectID hex string");

    return new ObjectID(hexString);
  };

  /**
   * Checks if a value is a valid bson ObjectId
   *
   * @param {String} objectid Can be a 24 byte hex string or an instance of ObjectID.
   * @return {Boolean} return true if the value is a valid bson ObjectID, return false otherwise.
   * @api public
   *
   * THE NATIVE DOCUMENTATION ISN'T CLEAR ON THIS GUY!
   * http://mongodb.github.io/node-mongodb-native/api-bson-generated/objectid.html#objectid-isvalid
   */
  ObjectID.isValid = function(objectid) {
    if(!objectid) return false;

    //call .toString() to get the hex if we're
    // working with an instance of ObjectID
    return /^[0-9A-F]{24}$/i.test(objectid.toString());
  };

  /**
   * set a custom machineID
   * 
   * @param {String|Number} machineid Can be a string, hex-string or a number
   * @return {void}
   * @api public
   */
  ObjectID.setMachineID = function(arg) {
    var machineID;

    if(typeof arg === "string") {
      // hex string
      machineID = parseInt(arg, 16);
     
      // any string
      if(isNaN(machineID)) {
        arg = ('000000' + arg).substr(-7,6);

        machineID = "";
        for(var i = 0;i<6; i++) {
          machineID += (arg.charCodeAt(i));
        }
      }
    }
    else if(/number|undefined/.test(typeof arg)) {
      machineID = arg | 0;
    }

    MACHINE_ID = (machineID & 0xFFFFFF);
  };

  /**
   * get the machineID
   * 
   * @return {number}
   * @api public
   */
  ObjectID.getMachineID = function() {
    return MACHINE_ID;
  };

  ObjectID.prototype = {
    _bsontype: 'ObjectID',
    constructor: ObjectID,

    /**
     * Return the ObjectID id as a 24 byte hex string representation
     *
     * @return {String} return the 24 byte hex string representation.
     * @api public
     */
    toHexString: function() {
      return this.str;
    },

    /**
     * Compares the equality of this ObjectID with `otherID`.
     *
     * @param {Object} other ObjectID instance to compare against.
     * @return {Boolean} the result of comparing two ObjectID's
     * @api public
     */
    equals: function (other){
      return !!other && this.str === other.toString();
    },

    /**
     * Returns the generation date (accurate up to the second) that this ID was generated.
     *
     * @return {Date} the generation date
     * @api public
     */
    getTimestamp: function(){
      return new Date(parseInt(this.str.substr(0,8), 16) * 1000);
    }
  };

  function next() {
    return index = (index+1) % 0xFFFFFF;
  }

  function generate(time) {
    if (typeof time !== 'number')
      time = Date.now()/1000;

    //keep it in the ring!
    time = parseInt(time, 10) % 0xFFFFFFFF;

    //FFFFFFFF FFFFFF FFFF FFFFFF
    return hex(8,time) + hex(6,MACHINE_ID) + hex(4,pid) + hex(6,next());
  }

  function hex(length, n) {
    n = n.toString(16);
    return (n.length===length)? n : "00000000".substring(n.length, length) + n;
  }

  function buffer(str) {
    var i=0,out=[];

    if(str.length===24)
      for(;i<24; out.push(parseInt(str[i]+str[i+1], 16)),i+=2);

    else if(str.length===12)
      for(;i<12; out.push(str.charCodeAt(i)),i++);

    return out;
  }

  /**
   * Converts to a string representation of this Id.
   *
   * @return {String} return the 24 byte hex string representation.
   * @api private
   */
  ObjectID.prototype.inspect = function() { return "ObjectID("+this+")" };
  ObjectID.prototype.toJSON = ObjectID.prototype.toHexString;
  ObjectID.prototype.toString = ObjectID.prototype.toHexString;

  /* global exports */
  /**
   * @fileoverview a tiny library for Web Worker Remote Method Invocation
   *
   */


  /**
   * @private returns a list of Transferable objects which {@code obj} includes
   * @param {object} obj any object
   * @param {Array} list for internal recursion only
   * @return {List} a list of Transferable objects
   */
  function getTransferList(obj, list = []) {
      if (ArrayBuffer.isView(obj)) {
          list.push(obj.buffer);
          return list;
      }
      if (isTransferable(obj)) {
          list.push(obj);
          return list;
      }
      if (!(typeof obj === 'object')) {
          return list;
      }
      for (const prop in obj) {
          if (obj.hasOwnProperty(prop)) {
              getTransferList(obj[prop], list);
          }
      }
      return list;
  }

  /**
   * @private checks if {@code obj} is Transferable or not.
   * @param {object} obj any object
   * @return {boolean}
   */
  function isTransferable(obj) {
      const transferable = [ArrayBuffer];
      if (typeof MessagePort !== 'undefined') {
          transferable.push(MessagePort);
      }
      if (typeof ImageBitmap !== 'undefined') {
          transferable.push(ImageBitmap);
      }
      return transferable.some(e => obj instanceof e);
  }

  /**
   * @class base class whose child classes use RMI
   */
  class WorkerRMI {
      /**
       * @constructor
       * @param {object} remote an instance to call postMessage method
       * @param {Array} args arguments to be passed to server-side instance
       */
      constructor(remote, ...args) {
          this.remote = remote;
          this.id = objectid().toString();
          this.methodStates = {};
          this.remote.addEventListener('message', event => {
              const data = event.data;
              if (data.id === this.id) {
                  this.returnHandler(data);
              }
          }, false);
          this.constructorPromise = this.invokeRM(this.constructor.name, args);
      }

      /**
       * invokes remote method
       * @param {string} methodName Method name
       * @param {Array} args arguments to be passed to server-side instance
       * @return {Promise}
       */
      invokeRM(methodName, args = []) {
          if (!this.methodStates[methodName]) {
              this.methodStates[methodName] = {
                  num: 0,
                  resolveRejects: {}
              };
          }
          return new Promise((resolve, reject) => {
              const methodState = this.methodStates[methodName];
              methodState.num += 1;
              methodState.resolveRejects[methodState.num] = { resolve, reject };
              this.remote.postMessage({
                  id: this.id,
                  methodName,
                  num: methodState.num,
                  args
              }, getTransferList(args));
          });
      }

      /**
       * @private handles correspondent 'message' event
       * @param {obj} data data property of 'message' event
       */
      returnHandler(data) {
          const resolveRejects = this.methodStates[data.methodName].resolveRejects;
          if (data.error) {
              resolveRejects[data.num].reject(data.error);
          } else {
              resolveRejects[data.num].resolve(data.result);
          }
          delete resolveRejects[data.num];
      }
  }


  /**
   * @private executes a method on server and post a result as message.
   * @param {obj} event 'message' event
   */
  async function handleWorkerRMI(event) {
      const data = event.data;
      const message = {
          id: data.id,
          methodName: data.methodName,
          num: data.num,
      };
      let result;
      if (data.methodName === this.name) {
          this.workerRMI.instances[data.id] = new this(...data.args);
          message.result = null;
          this.workerRMI.target.postMessage(message, getTransferList(result));
      } else {
          const instance = this.workerRMI.instances[data.id];
          if (instance) {
              try {
                  result = await instance[data.methodName].apply(instance, data.args);
                  message.result = result;
                  this.workerRMI.target.postMessage(message, getTransferList(result));
              } catch (e) {
                  console.error(e);
                  message.error = e.toString();
                  this.workerRMI.target.postMessage(message);
              }
          }
      }
  }

  /**
   * registers a class as an executer of RMI on server
   * @param {obj} target an instance that receives 'message' events of RMI
   * @param {Class} klass a class to be registered
   */
  function resigterWorkerRMI(target, klass) {
      klass.workerRMI = {
          target,
          instances: {},
          handler: handleWorkerRMI.bind(klass)
      };
      target.addEventListener('message', klass.workerRMI.handler);
  }

  var WorkerRMI_1 = WorkerRMI;
  var resigterWorkerRMI_1 = resigterWorkerRMI;

  /**
   * @file ニューラルネットワークのRMIです。
   */

  /**
   * ニューラルネットワークのRMIです。ドキュメントは本体側のコードを参照してください。
   * @alias NeuralNetworkRMI
   * @see NeuralNetwork
   */
  class NeuralNetwork extends WorkerRMI_1 {
      async load(...inputs) {
          return await this.invokeRM('load', inputs);
      }

      async evaluate(...inputs) {
          const result = await this.invokeRM('evaluate', inputs);
          return result;
      }
  }

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
  function shuffle(array) {
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
  function mostCommon(array) {
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
  function argsort(array, reverse, second = null) {
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
  function argmax(obj) {
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
   * 与えられた範囲の整数乱数を返します。
   * 引数を省略すると符号付き32ビット整数の乱数を返します。
   * @param {Integer} min
   * @param {Integer} max
   */
  function random(min = -0x80000000, max = 0x7FFFFFFF) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * @file 碁盤の定数クラスです
   */

  /** x座標ラベル文字列です。 */
  const X_LABELS = '@ABCDEFGHJKLMNOPQRST';

  /**
   * 交点の状態を表す列挙型です。
   */
  const IntersectionState = {
      WHITE: 0,
      BLACK: 1,
      EMPTY: 2,
      EXTERIOR: 3,
      /**
       * 相手の色を返します。
       * @param {IntersectionState} color 
       */
      opponentOf(color) {
          switch (color) {
              case this.WHITE: return this.BLACK;
              case this.BLACK: return this.WHITE;
              default: throw new Error('invalid color');
          }
      }
  };

  /**
   * 碁盤定数と座標変換の列挙型を生成するクラスです。<br>
   * 碁盤クラスでは座標系に拡張線形座標を使います。
   * 拡張線形座標は盤外の交点を持つ碁盤の座標です。
   * 四路盤の場合、以下のような構造になります。
   * <pre style="font-family: Courier;">
   *     ###### #が盤外(実際の値はEXTERIOR)
   *     #....# .は盤上交点(実際の値はEMPTY)
   *     #....#
   *     #....#
   *     #....#
   *     ######
   * </pre>
   * 左下から0-オリジンで数えます。四路盤の場合、
   * <pre style="font-family: Courier;">
   *     30 31 32 33 34 35
   *     24 25 26 27 28 29
   *     18 19 20 21 22 23
   *     12 13 14 15 16 17
   *      6  7  8  9 10 11
   *      0  1  2  3  4  5
   * </pre>
   * 碁盤の交点をxy座標で表すときも左下が原点です。xy座標は盤上左下が(1,1)です。
   * <pre style="font-family: Courier;">
   *       ###### #が盤外(実際の値はEXTERIOR)
   *     4|#....# .は盤上交点(実際の値はEMPTY)
   *     3|#....#
   *     2|#....#
   *     1|#....#
   *       ######
   *        1234
   * </pre>
   */
  class BoardConstants {
      constructor(size = 19) {
          this.BSIZE = size; // 碁盤サイズ
          this.EBSIZE = this.BSIZE + 2; // 拡張碁盤サイズ
          this.EBVCNT = this.EBSIZE * this.EBSIZE;
          this.PASS = this.EBVCNT;
          this.VNULL = this.EBVCNT + 1;
          this.BVCNT = this.BSIZE * this.BSIZE;
          this.symmetricRawVertex = new Uint16Array(this.BVCNT * 8);
          this.ZobristHashes = [new Int32Array(this.EBVCNT + 1), new Int32Array(this.EBVCNT + 1)];
          this.initializeSymmetricRawVertex();
          this.initializeZobristHashes();
          Object.freeze(this);
      }

      /**
       * SGFフォーマットの座標をxy座標に変換します。
       * @param {string} s 
       * @returns {Integer[]} xy座標
       */
      move2xy(s) {
          const OFFSET = 'a'.charCodeAt(0) - 1;
          return [s.charCodeAt(0) - OFFSET, this.BSIZE + 1 - (s.charCodeAt(1) - OFFSET)];
      }

      /**
       * 拡張線形座標をxy座標に変換します。
       * @param {Uint16} ev 
       * @returns {Integer[]} xy座標
       */
      ev2xy(ev) {
          return [ev % this.EBSIZE, Math.floor(ev / this.EBSIZE)];
      }

      /**
       * xy座標を拡張線形座標に変換します。
       * @param {Integer} x 
       * @param {Integer} y 
       * @returns {Uint16} extended vertex
       */
      xy2ev(x, y) {
          return y * this.EBSIZE + x;
      }

      /**
       * 線形座標を拡張線形座標に変換します。
       * @param {Uint16} rv raw vertex
       * @returns {Uint16} extended vertex
       */
      rv2ev(rv) {
          return rv === this.BVCNT ?
              this.PASS :
              rv % this.BSIZE + 1 + Math.floor(rv / this.BSIZE + 1) * this.EBSIZE;
      }

      /**
       * 拡張線形座標を線形座標に変換します。
       * @param {Uint16} ev
       * @returns {Uint16} raw vertex
       */
      ev2rv(ev) {
          return ev === this.PASS ?
              this.BVCNT :
              ev % this.EBSIZE - 1 + Math.floor(ev / this.EBSIZE - 1) * this.BSIZE;
      }

      /**
       * 拡張線形座標をGTPが使用する座標に変換します。
       * @param {Uint16} ev
       * @returns {string} GTP座標
       */
      ev2str(ev) {
          if (ev >= this.PASS) {
              return 'pass';
          } else {
              const [x, y] = this.ev2xy(ev);
              return X_LABELS.charAt(x) + y.toString();
          }
      }

      /**
       * GTPが使用する座標を拡張線形座標に変換します。
       * @param {string} v
       * @returns {Uint16} extended vertex
       */
      str2ev(v) {
          const vStr = v.toUpperCase();
          if (vStr === 'PASS' || vStr === 'RESIGN') {
              return this.PASS;
          } else {
              const x = X_LABELS.indexOf(vStr.charAt(0));
              const y = parseInt(vStr.slice(1));
              return this.xy2ev(x, y);
          }
      }

      /**
       * vに隣接する交点の座標を返します。
       * @param {Uint16}} v 拡張線形座標
       * @returns {Uint16[]}
       */
      neighbors(v) {
          return [v + 1, v + this.EBSIZE, v - 1, v - this.EBSIZE];
      }
      
      /**
       * vに斜め隣接する交点の座標を返します。
       * @param {Uint16}} v 拡張線形座標
       * @returns {Uint16[]}
       */
      diagonals(v) {
          return [
              v + this.EBSIZE + 1,
              v + this.EBSIZE - 1,
              v - this.EBSIZE - 1,
              v - this.EBSIZE + 1,
          ]
      }

      initializeSymmetricRawVertex() {
          for (let sym = 0; sym < 8; sym++) {
              for (let rv = 0; rv < this.BVCNT; rv++) {
                  this.symmetricRawVertex[rv * 8 + sym] = this.calcSymmetricRawVertex(rv, sym);
              }
          }
      }

      /**
       * 線形座標の対称変換を返します。
       * @param {Uint16} rv 線形座標
       * @param {Integer} symmetry 対称番号
       * @return {Uint16}
       */
      getSymmetricRawVertex(rv, symmetry) {
          return this.symmetricRawVertex[rv * 8 + symmetry];
      }

      /**
       * 線形座標の対称変換を計算して返します。
       * @param {Uint16} rv 線形座標
       * @param {Integer} symmetry 対称番号
       */
      calcSymmetricRawVertex(rv, symmetry) {
          const center = (this.BSIZE - 1) / 2;
          let x = rv % this.BSIZE - center;
          let y = Math.floor(rv / this.BSIZE) - center;
          if (symmetry >= 4) { // 鏡像変換
              x = -x;                        
          }
          let tmp;
          // 回転
          switch (symmetry % 4) {
              case 1:
              tmp = y;
              y = x;
              x = -tmp;
              break;
              case 2:
              x = -x;
              y = -y;
              break;
              case 3:
              tmp = y;
              y = -x;
              x = tmp;
              break;
          }
          return x + center + (y + center) * this.BSIZE;
      }

      initializeZobristHashes() {
          for (let turn = 0; turn < this.ZobristHashes.length; turn++) {
              const hashes = this.ZobristHashes[turn];
              for (let i = 0; i < hashes.length; i++) {
                  hashes[i] = random();
              }
          }
      }
  }

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
  class StoneGroup {
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

  /**
   * @file 碁盤クラスです。
   * このコードはPyaqの移植コードです。
   * @see {@link https://github.com/ymgaq/Pyaq}
   */

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
          this.sg.forEach(e => { e.clear(false); });
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
  class Board extends BaseBoard {
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

  /**
   * @file モンテカルロツリー探索の実装です。
   * このコードはPyaqの移植コードです。
   * @see {@link https://github.com/ymgaq/Pyaq}
   */

  const NODES_MAX_LENGTH = 16384;
  const COLLISION_DETECT = false;

  /** MCTSのノードクラスです。 */
  class Node {
      /**
       * MCTSのノードを生成します。
       * @param {BoardConstants} constants
       */
      constructor(constants) {
          this.C = constants;
          /** 着手候補数です。(名前のedgeはグラフ理論の枝のことです。) */
          this.edgeLength = 0;
          //頻繁なメモリアロケーションを避けるため、枝情報に必要な最大メモリを予め確保します。
          /** ポリシー確率の高い順並んだ着手候補です。 */
          this.moves = new Uint16Array(this.C.BVCNT + 1); 
          /** moves要素に対応するポリシー確率です。 */
          this.probabilities = new Float32Array(this.C.BVCNT + 1); 
          /** moves要素に対応するバリューです。ただしノードの手番から見ての値です。 */
          this.values = new Float32Array(this.C.BVCNT + 1);
          /** moves要素に対応する総アクションバリューです。ただしノードの手番から見ての値です。 */
          this.totalActionValues = new Float32Array(this.C.BVCNT + 1);
          /** moves要素に対応する訪問回数です。 */
          this.visitCounts = new Uint32Array(this.C.BVCNT + 1);
          /** moves要素に対応するノードIDです。 */
          this.nodeIds = new Int16Array(this.C.BVCNT + 1);
          /** moves要素に対応するハッシュです。 */
          this.hashes = new Int32Array(this.C.BVCNT + 1);
          /** moves要素に対応する局面のニューラルネットワークを計算したか否かを保持します。 */
          this.evaluated = new Uint8Array(this.C.BVCNT + 1);
          this.value = 0;
          this.totalCount = 0;
          this.hashValue = 0;
          this.moveNumber = -1;
          this.sortedIndices = null;
          this.position = null;
          this.clear();
      }

      /** 未使用状態にします。 */
      clear() {
          this.edgeLength = 0;
          this.value = 0;
          this.totalCount = 0;
          this.hashValue = 0;
          this.moveNumber = -1;
          this.sortedIndices = null;
          this.position = null;
      }

      /**
       * 初期化します。
       * @param {Integer} hash 現局面のハッシュです。
       * @param {Integer} moveNumber 現局面の手数です。
       * @param {UInt16[]} candidates Boardが生成する候補手情報です。
       * @param {Float32Array} prob 着手確率(ニューラルネットワークのポリシー出力)です。
       */
      initialize(hash, moveNumber, candidates, prob, value, position = null) {
          this.clear();
          this.hashValue = hash;
          this.moveNumber = moveNumber;
          this.value = value;
          this.position = position;

          for (const rv of argsort(prob, true)) {
              if (prob[rv] !== 0.0 && candidates.includes(rv)) {
                  this.moves[this.edgeLength] = this.C.rv2ev(rv);
                  this.probabilities[this.edgeLength] = prob[rv];
                  this.values[this.edgeLength] = 0.0;
                  this.totalActionValues[this.edgeLength] = 0.0;
                  this.visitCounts[this.edgeLength] = 0;
                  this.nodeIds[this.edgeLength] = -1;
                  this.hashes[this.edgeLength] = 0;
                  this.evaluated[this.edgeLength] = false;
                  this.edgeLength += 1;
              }
          }
      }

      /**
       * indexのエッジの勝率を返します。
       * @param {Integer} index 
       * @returns {number}
       */
      winrate(index) {
          return this.totalActionValues[index] / Math.max(this.visitCounts[index], 1) / 2.0 + 0.5;
      }

      /**
       * visitCountsを1増やし、sortedIndicesをクリアします。
       * @param {Integer} index 
       */
      incrementVisitCount(index) {
          this.visitCounts[index] += 1;
          this.sortedIndices = null;
      }

      /**
       * visitCountsの多い順のインデックスの配列を返します。
       */
      getSortedIndices() {
          if (this.sortedIndices == null) {
              this.sortedIndices = argsort(this.visitCounts.slice(0, this.edgeLength), true, this.values.slice(0, this.edgeLength));
          }
          return this.sortedIndices;
      }


      /**
       * UCB評価で最善の着手情報を返します。
       * @param {number} c_puct
       * @returns {Array} [UCB選択インデックス, 最善ブランチの子ノードID, 着手]
       */
      selectByUCB(c_puct) {
          const cpsv = c_puct * Math.sqrt(this.totalCount);
          const meanActionValues = new Float32Array(this.edgeLength);
          for (let i = 0; i < meanActionValues.length; i++) {
              /* AlphaGo Zero論文ではmeanActionValueの初期値は0ですが、その場合、悪い局面でMCTSがエッジをすべて一度は評価しようとします。
               * それを避けるために初期値を現局面の評価値にしました。 */
              meanActionValues[i] = this.visitCounts[i] === 0 ? this.value : this.totalActionValues[i] / this.visitCounts[i];
          }
          const ucb = new Float32Array(this.edgeLength);
          for (let i = 0; i < ucb.length; i++) {
              ucb[i] = meanActionValues[i] + cpsv * this.probabilities[i] / (1 + this.visitCounts[i]);
          }
          const selectedIndex = argmax(ucb);
          const selectedId = this.nodeIds[selectedIndex];
          const selectedMove = this.moves[selectedIndex];
          return [selectedIndex, selectedId, selectedMove];
      }
  }

  /** モンテカルロツリー探索を実行するクラスです。 */
  class MCTS {
      /**
       * コンストラクタ
       * @param {NeuralNetwork} nn 
       * @param {BoardConstants} C
       * @param {Function} evaluatePlugin
       */
      constructor(nn, C, evaluatePlugin = null) {
          this.C_PUCT = 1.5; // ELF OpenGoのボット設定
          this.mainTime = 0.0;
          this.byoyomi = 1.0;
          this.leftTime = 0.0;
          this.nodes = [];
          this.nodesLength = 0;
          for (let i = 0; i < NODES_MAX_LENGTH; i++) {
              this.nodes.push(new Node(C));
          }
          this.rootId = 0;
          this.rootMoveNumber = 0;
          this.nodeHashes = new Map();
          this.evalCount = 0;
          this.nn = nn;
          this.terminateFlag = false;
          this.exitCondition = null;
          this.evaluatePlugin = evaluatePlugin;
          this.collisions = 0;
      }

      /**
       * 持ち時間の設定をします。
       * 残り時間もリセットします。
       * @param {number} mainTime 秒
       * @param {number} byoyomi 秒
       */
      setTime(mainTime, byoyomi) {
          this.mainTime = mainTime;
          this.leftTime = mainTime;
          this.byoyomi = byoyomi;
      }

      /**
       * 残り時間を設定します。
       * @param {number} leftTime 秒
       */
      setLeftTime(leftTime) {
          this.leftTime = leftTime;
      }

      /**
       * 内部状態をクリアします。
       * 同一時間設定で初手から対局できるようになります。
       */
      clear() {
          this.leftTime = this.mainTime;
          for (const node of this.nodes) {
              node.clear();
          }
          this.nodesLength = 0;
          this.rootId = 0;
          this.rootMoveNumber = 0;
          this.nodeHashes.clear();
          this.evalCount = 0;
      }

      /**
       * this.nodesに同じ局面があればそのインデックスを返します。
       * なければnullを返します。
       * @param {Board} b 
       */
      getNodeIdInNodes(b) {
          const hash = b.hash();
          if (this.nodeHashes.has(hash)) {
              const id = this.nodeHashes.get(hash);
              if (b.moveNumber === this.nodes[id].moveNumber) {
                  {
                      return id;
                  }
              }
          }
          return null;
      }
      /**
       * 局面bのMCTSの探索ノードを生成してノードIDを返します。
       * @param {Board} b 
       * @param {Float32Array} prob 
       * @returns {Integer} ノードID
       */
      createNode(b, prob, value) {
          const hash = b.hash();
          let nodeId = Math.abs(hash) % NODES_MAX_LENGTH;
          while (this.nodes[nodeId].moveNumber !== -1) {
              nodeId = nodeId + 1 < NODES_MAX_LENGTH ? nodeId + 1 : 0;
          }

          this.nodeHashes.set(hash, nodeId);
          this.nodesLength += 1;

          const node = this.nodes[nodeId];
          node.initialize(hash, b.moveNumber, b.candidates(), prob, value, COLLISION_DETECT && b.toString());
          return nodeId;
      }

      /**
       * nodesの中の不要なノードを未使用状態に戻します。
       */
      cleanupNodes() {
          if (this.nodesLength < NODES_MAX_LENGTH / 2) {
              return;
          }
          for (let i = 0; i < NODES_MAX_LENGTH; i++) {
              const mn = this.nodes[i].moveNumber;
              if (mn >= 0 && mn < this.rootMoveNumber) {
                  this.nodeHashes.delete(this.nodes[i].hashValue);
                  this.nodes[i].clear();
                  this.nodesLength -= 1;
              }
          }
      }

      /**
       * 検索するかどうかを決定します。
       * @param {Integer} best 
       * @param {Integer} second 
       * @returns {bool}
       */
      shouldSearch(best, second) {
          const node = this.nodes[this.rootId];
          const winrate = node.winrate(best);

          return winrate <= 0.5 || node.probabilities[best] <= 0.99;
      }

      /**
       * 次の着手の考慮時間を算出します。
       * @returns {number} 使用する時間(秒)
       */
      getSearchTime(C) {
          if (this.mainTime === 0.0 || this.leftTime < this.byoyomi * 2.0) {
              return Math.max(this.byoyomi, 1.0);
          } else {
              // 碁盤を埋めることを仮定し、残りの手数を算出します。
              const assumedRemainingMoves = (C.BVCNT - this.rootMoveNumber) / 2;
              //布石ではより多くの手数を仮定し、急ぎます。
              const openingOffset = Math.max(C.BVCNT / 10 - this.rootMoveNumber, 0);
              return this.leftTime / (assumedRemainingMoves + openingOffset) + this.byoyomi;
          }
      }

      /**
       * nodeIdのノードのedgeIndexのエッジに対応するノードが既に存在するか返します。
       * @param {Integer} edgeIndex 
       * @param {Integer} nodeId 
       * @param {Integer} moveNumber 
       * @returns {bool}
       */
      hasEdgeNode(edgeIndex, nodeId, moveNumber) {
          const node = this.nodes[nodeId];
          const edgeId = node.nodeIds[edgeIndex];
          if (edgeId < 0) {
              return false;
          }
          return node.hashes[edgeIndex] === this.nodes[edgeId].hashValue &&
              this.nodes[edgeId].moveNumber === moveNumber;
      }

      /**
       * 
       * @private
       * @param {Integer} nodeId 
       * @param {BoardConstants} c 
       */
      edgeWinrate(nodeId, c) {
          let value = NaN;
          let parity = 1;
          while (true) {
              const node = this.nodes[nodeId];
              if (node.edgeLength < 1) {
                  break;
              }

              const [best] = node.getSortedIndices();
              if (node.visitCounts[best] === 0) {
                  break;
              }
              value = node.values[best] * parity;
              if (!this.hasEdgeNode(best, nodeId, node.moveNumber + 1)) {
                  break;
              }
              nodeId = node.nodeIds[best];
              parity *= -1;
          }

          return (value + 1.0) / 2.0;
      }

      /**
       * printInfoのヘルパー関数です。
       * @private
       * @param {Uint16} headMove nodeIdのノードに至る着手です
       * @param {Integer} nodeId 
       * @param {BoardConstants} c 
       */
      bestSequence(nodeId, c) {
          let seqStr = '';
          for (let i = 0; i < 7; i++) {
              const node = this.nodes[nodeId];
              if (node.edgeLength < 1) {
                  break;
              }

              const [best] = node.getSortedIndices();
              if (node.visitCounts[best] === 0) {
                  break;
              }
              const bestMove = node.moves[best];
              seqStr += '->' + (c.ev2str(bestMove) + '   ').slice(0, 3);

              if (!this.hasEdgeNode(best, nodeId, node.moveNumber + 1)) {
                  break;
              }
              nodeId = node.nodeIds[best];
          }

          return seqStr;
      }

      /**
       * 探索結果の詳細を表示します。
       * @param {Integer} nodeId 
       * @param {BoardConstants} c
       */
      printInfo(nodeId, c) {
          const node = this.nodes[nodeId];
          const order = node.getSortedIndices();
          console.log('|move|count  |rate |value|prob | best sequence');
          const length = Math.min(order.length, 9);
          for (let i = 0; i < length; i++) {
              const m = order[i];
              const visitCount = node.visitCounts[m];
              if (visitCount === 0) {
                  break;
              }

              const rate = visitCount === 0 ? 0.0 : node.winrate(m) * 100.0;
              const value = (node.values[m] / 2.0 + 0.5) * 100.0;
              console.log(
                  '|%s|%s|%s|%s|%s| %s',
                  (c.ev2str(node.moves[m]) + '    ').slice(0, 4),
                  ('       ' + visitCount).slice(-7),
                  ('  ' + rate.toFixed(1)).slice(-5),
                  ('  ' + value.toFixed(1)).slice(-5),
                  ('  ' + (node.probabilities[m] * 100.0).toFixed(1)).slice(-5),
                  (c.ev2str(node.moves[m]) + '   ').slice(0, 3) + this.bestSequence(node.nodeIds[m], c)
              );
          }
      }

      /**
       * ニューラルネットワークで局面を評価します。
       * @param {Board} b
       * @param {bool} random
       * @returns {Float32Array[]}
       */
      async evaluate(b, random$$1 = true) {
          let [prob, value] = await b.evaluate(this.nn, random$$1);
          if (this.evaluatePlugin) {
              prob = this.evaluatePlugin(b, prob);
          }
          this.evalCount += 1;
          return [prob, value];
      }

      /**
       * 検索の前処理です。
       * @private
       * @param {Board} b 
       * @returns {Node}
       */
      async prepareRootNode(b) {
          this.rootMoveNumber = b.moveNumber;
          this.rootId = this.getNodeIdInNodes(b);
          if (this.rootId == null) {
              const [prob, value] = await this.evaluate(b);
              this.rootId = this.createNode(b, prob, value);
          }
          // AlphaGo Zeroでは自己対戦時にはここでprobに"Dirichletノイズ"を追加します。
          return this.nodes[this.rootId];
      }

      /**
       * edgeIndexのエッジの局面を評価しノードを生成してバリューを返します。
       * @private
       * @param {Board} b 
       * @param {Integer} edgeIndex 
       * @param {Node} parentNode 
       * @returns {number} parentNodeの手番から見たedge局面のバリュー
       */
      async evaluateEdge(b, edgeIndex, parentNode) {
          let [prob, value] = await this.evaluate(b);
          value = -value[0]; // parentNodeの手番から見たバリューに変換します。
          if (this.nodesLength > 0.85 * NODES_MAX_LENGTH) {
              this.cleanupNodes();
          }
          const nodeId = this.createNode(b, prob, value);
          parentNode.nodeIds[edgeIndex] = nodeId;
          parentNode.hashes[edgeIndex] = b.hash();
          parentNode.values[edgeIndex] = value;
          parentNode.evaluated[edgeIndex] = true;
          /*
          if (!this.isConsistentNode(nodeId, b)) {
              const node = this.nodes[nodeId];
              for (let i = 0; i < node.edgeLength; i++) {
                  console.log(b.C.ev2str(node.moves[i]));
              }
              b.showboard();
              throw new Error('inconsistent node');
          }
          */
          return value;
      }

      /**
       * MCTSツリーをUCBに従って下り、リーフノードに到達したら展開します。
       * @private
       * @param {Board} b 
       * @param {Integer} nodeId
       * @returns {number} バリュー
       */
      async playout(b, nodeId) {
          const node = this.nodes[nodeId];
          const [selectedIndex, selectedId, selectedMove] = node.selectByUCB(this.C_PUCT);
          try {
              b.play(selectedMove);
          } catch (e) {
              console.error(e);
              b.showboard();
              console.log('%s %d', b.C.ev2str(selectedMove), this.collisions);
              b.play(b.C.PASS);
          }
          let value;
          if (selectedId >= 0) {
              value = - await this.playout(b, selectedId); // selectedIdの手番でのバリューが返されるから符号を反転させます。
          } else {
              const nodeId = this.nodeHashes.get(b.hash());
              if (nodeId && this.nodes[nodeId].moveNumber === b.moveNumber) {
                  const edgeNode = this.nodes[nodeId];
                  node.nodeIds[selectedIndex] = nodeId;
                  node.hashes[selectedIndex] = b.hash();
                  node.values[selectedIndex] = -edgeNode.value;
                  node.evaluated[selectedIndex] = true;
                  value = - await this.playout(b, nodeId);
              } else {
                  value = await this.evaluateEdge(b, selectedIndex, node);
              }
          }
          node.totalCount += 1;
          node.totalActionValue += value;
          node.totalActionValues[selectedIndex] += value;
          node.incrementVisitCount(selectedIndex);
          return value;
      }

      /**
       * プレイアウトを繰り返してMCTSツリーを更新します。
       * @private
       * @param {Board} b 
       */
      async keepPlayout(b) {
          let bCpy = new Board(b.C, b.komi);
          do {
              b.copyTo(bCpy);
              await this.playout(bCpy, this.rootId);
          } while (!this.exitCondition());
      }

      /**
       * MCTS探索メソッドです。
       * 局面bをルートノード設定して、終了条件を設定し、time時間探索し、結果をログ出力してルートノードを返します。
       * @param {Board} b 
       * @param {number} time 探索時間を秒単位で指定します
       * @param {bool} ponder ttrueのときstopメソッドが呼ばれるまで探索を継続します
       * @param {bool} clean 形勢が変わらない限りパス以外の着手を選びます
       * @returns {Object[]} [Node, Integer] ルートノードと評価数
       */
      async search(b, time, ponder) {
          const start = Date.now();
          this.evalCount = 0;
          const rootNode = await this.prepareRootNode(b);

          if (rootNode.edgeLength <= 1) { // 候補手がパスしかなければ
              console.log('\nmove number=%d:', this.rootMoveNumber + 1);
              this.printInfo(this.rootId, b.C);
              return [rootNode, this.evalCount];
          }

          this.cleanupNodes();

          const time_ = (time === 0.0 ? this.getSearchTime(b.C) : time) * 1000 - 500; // 0.5秒のマージン
          this.terminateFlag = false;
          this.exitCondition = ponder ? () => this.terminateFlag :
              () => this.terminateFlag || Date.now() - start > time_;

          let [best, second] = rootNode.getSortedIndices();
          if (ponder || this.shouldSearch(best, second)) {
              await this.keepPlayout(b);
              [best, second] = rootNode.getSortedIndices();
          }

          console.log(
              '\nmove number=%d: left time=%s[sec] evaluated=%d collisions=%d',
              this.rootMoveNumber + 1,
              Math.max(this.leftTime - time, 0.0).toFixed(1),
              this.evalCount,
              this.collisions
          );
          this.printInfo(this.rootId, b.C);
          this.leftTime = this.leftTime - (Date.now() - start) / 1000;
          return [rootNode, this.evalCount];
      }

      /**
       * 実行中のkeepPlayoutを停止させます。
       */
      stop() {
          this.terminateFlag = true;
      }

      /**
       * 
       * @param {Integer} nodeId
       * @param {Board} b 
       */
      isConsistentNode(nodeId, b) {
          const node = this.nodes[nodeId];
          for (let i = 0; i < node.edgeLength; i++) {
              const ev = node.moves[i];
              if (ev === b.C.EBVCNT) {
                  continue
              }
              if (b.state[ev] !== IntersectionState.EMPTY) {
                  console.log('isConsistentNode', b.C.ev2str(ev));
                  return false;
              }
          }
          return true
      }
  }

  /**
   * @file 探索モードの列挙型です。
   */
  /*
   * @author 市川雄二
   * @copyright 2018 ICHIKAWA, Yuji (New 3 Rs)
   * @license MIT
   */

  /**
   * 探索モードの列挙型です。
   */
  const SearchMode = {
      HARD: 0,
      NORMAL: 1,
      EASY: 2,
      fromString(str) {
          switch (str) {
              case 'normal':
              return this.NORNAL;
              case 'easy':
              return this.EASY;
              default:
              return this.HARD;
          }
      }
  };

  /**
   * @file 対局を行う思考エンジンクラスAZjsEngineのコードです。
   * ウェブワーカで動かすことを前提に、メインスレッドのアプリとNeuralNetworkの2つと通信しながらモンテカルロツリー探索を実行します。
   */

  /**
   * 対局を行う思考エンジンの基本クラスです。
   * ウェブワーカで動かすことを前提に、メインスレッドのアプリとNeuralNetworkの2つと通信しながらMCTSを実行します。
   * AZjsEngineという拡張クラスを作成して使います。
   */
  class AZjsEngineBase {
      /**
       * @param {Integer} size 碁盤サイズ
       * @param {number} komi コミ
       * @param {Function} evaluatePlugin
       */
      constructor(size = 19, komi = 7, evaluatePlugin = null) {
          this.b = new Board(new BoardConstants(size), komi);
          this.nn = new NeuralNetwork(self);
          this.mcts = new MCTS(this.nn, this.b.C, evaluatePlugin);
      }

      /**
       * ニューラルネットワークのウェイトをロードします。
       */
      async loadNN() {
          let args;
          switch (this.b.C.BSIZE) {
              case 9:
              args = ['https://storage.googleapis.com/mimiaka-storage/LeelaZero9'];
              break;
              case 19:
              args = ['https://storage.googleapis.com/mimiaka-storage/ELF_OpenGo_v1', 2];
              break;
              default:
              throw new Error('size is not supported');
          }
          await this.nn.load.apply(this.nn, args);
      }

      /**
       * 内部状態をクリアします。
       * 改めて初手から対局可能になります。
       */
      clear() {
          this.b.reset();
          this.mcts.clear();
      }

      /**
       * 持ち時間を設定します。
       * @param {number} mainTime 秒
       * @param {number} byoyomi 秒
       */
      timeSettings(mainTime, byoyomi) {
          this.mcts.setTime(mainTime, byoyomi);
      }

      /**
       * 次の手を返します。状況に応じて投了します。
       * 戻り値[x, y]は左上が1-オリジンの2次元座標です。もしくは'resgin'または'pass'を返します。
       * 内部で保持している局面も進めます。
       * @param {SearchMode} mode
       * @returns {Object[]} [(Integer[]|string), Number]
       */
      async genmove(mode) {
          const [move, winRate, num] = await this.search(mode);
          if (winRate < 0.01) {
              return ['resign', winRate, num];
          }
          try {
              this.b.play(move);
              return [move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move), winRate, num];
          } catch (e) {
              this.b.showboard();
              console.log(this.b.candidates());
              throw new Error(`illegal move ${this.b.C.ev2xy(move)}(${move})`);
          }
      }

      /**
       * 次の手を打って現局面を進めます。
       * (x, y)は左上が1-オリジンの2次元座標です。
       * @param {Integer} x 
       * @param {Integer} y 
       * @throws {Error}
       */
      play(x, y) {
          this.b.play(this.b.C.xy2ev(x, y));
      }

      /**
       * 次の手をパスして現局面を進めます。
       */
      pass() {
          this.b.play(this.b.C.PASS);
      }

      /**
       * MCTS探索します。
       * modeに応じて次の一手と勝率を返します。
       * @private
       * @param {SearchMode} mode
       * @param {bool} ponder
       * @returns {Object[]} [Integer, Number, Integer], 着手と勝率、評価数
       */
      async search(mode, ponder = false) {
          const [node, num] = await this.mcts.search(this.b, ponder ? Infinity : 0.0, ponder);
          switch (mode) {
              case SearchMode.NORMAL: {
                  const indices = node.getSortedIndices().filter(e => node.visitCounts[e] > 0);
                  const winrates = indices.map(e => [e, node.winrate(e)]);
                  winrates.sort((a, b) => b[1] - a[1]);
                  const i = winrates.findIndex(e => e[1] < 0.5);
                  const e = winrates[i < 0 ? winrates.length - 1 : Math.max(i - 1, 0)];
                  return [node.moves[e[0]], e[1], num];
              }
              case SearchMode.EASY: {
                  const indices = node.getSortedIndices().filter(e => node.visitCounts[e] > 0);
                  const winrates = indices.map(e => [e, node.winrate(e), node.visitCounts[e]]);
                  winrates.sort((a, b) => b[1] - a[1]);
                  let e = winrates.find(e => e[1] < 0.5);
                  if (e == null) {
                      e = winrates[winrates.length - 1];
                  }
                  return [node.moves[e[0]], e[1], num];
              }
              default: {
                  const [best] = node.getSortedIndices();
                  return [node.moves[best], node.winrate(best), num];
                  // return [node.moves[best], 1.0 - this.mcts.edgeWinrate(node.nodeIds[best])];
              }
          }
      }

      /**
       * @private
       */
      finalScore() {
          return this.b.finalScore();
      }

      /**
       * 相手の考慮中に探索を継続します。
       * @returns {Object[]} [(Integer[]|string), Number]
       */
      async ponder() {
          const [move, winrate] = await this.search('hard', true);
          return [move === this.b.C.PASS ? 'pass' : this.b.C.ev2xy(move), winrate];
      }

      /**
       * 探索を強制終了させます。
       * 探索ツリーは有効なままです。主にポンダリング終了に使います。
       */
      stop() {
          this.mcts.stop();
      }

      /**
       * メイン時間の残り時間を返します。
       * @returns {number} 残りの秒数
       */
      timeLeft() {
          return this.mcts.leftTime;
      }
  }

  /**
   * @file ウェブワーカのエントリーポイントです。
   */

  /**
   * アプリ特有のevaluatePlugin関数です。
   * thisはMCTSのインスタンスです。
   * @param {Board} b 
   */
  function evaluatePlugin(b, prob) {
      switch (b.moveNumber) {
          case 0:
          switch (b.C.BSIZE) {
              case 19: {
                  const moves = [
                      [17, 17],
                      [16, 16],
                      [17, 16],
                      [15, 17],
                      [15, 16]
                  ];
                  const move = moves[Math.floor(Math.random() * moves.length)];
                  prob = new Float32Array(prob.length);
                  for (let i = 0; i < prob.length; i++) {
                      const xy = b.C.ev2xy(b.C.rv2ev(i));
                      prob[i] = move[0] === xy[0] && move[1] === xy[1] ? 1.0 : 0.0;
                  }
              }
              break;
          }
          break;
          case 1:
          switch (b.C.BSIZE) {
              case 19: {
                  const moves = [
                      [3, 3],
                      [4, 4],
                      [3, 4],
                      [4, 3],
                      [3, 5],
                      [5, 3],
                      [4, 5],
                      [5, 4],
                      [3, 17],
                      [4, 16],
                      [3, 16],
                      [4, 17],
                      [5, 17],
                      [3, 15],
                      [5, 16],
                      [4, 15],
                      [17, 3],
                      [16, 4],
                      [17, 4],
                      [16, 3],
                      [15, 3],
                      [17, 5],
                      [15, 4],
                      [16, 5]
                  ];
                  const move = moves[Math.floor(Math.random() * moves.length)];
                  prob = new Float32Array(prob.length);
                  for (let i = 0; i < prob.length; i++) {
                      const xy = b.C.ev2xy(b.C.rv2ev(i));
                      prob[i] = move[0] === xy[0] && move[1] === xy[1] ? 1.0 : 0.0;
                  }
              }
              break;
          }
          break;
      }
      return prob;
  }

  /** 対局を行う思考エンジンクラスです。 */
  class AZjsEngine extends AZjsEngineBase {
      /**
       * AZjsEngineBaseにアプリ固有のevaluatePlugin関数を渡します。
       * @param {Integer} size 
       * @param {Number} komi 
       */
      constructor(size, komi) {
          super(size, komi, evaluatePlugin);
      }
  }

  resigterWorkerRMI_1(self, AZjsEngine);

}());
