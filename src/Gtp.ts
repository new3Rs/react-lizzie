/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

export interface LzInfo {
    move: string,
    visits: number,
    winrate: number,
    pv: string[],
    prior: number,
    lcb: number,
    order: number,
}

export interface KataInfo {
    move: string,
    visits: number,
    winrate: number,
    pv: string[],
}

export interface KataInfos {
    info: any[],
    ownership: number[],
}

interface GtpInputElement extends HTMLFormElement {
    command: HTMLInputElement
}

class Gtp {
    socket!: WebSocket | any; // any means StdStream
    buffer: string;
    lastCommand?: string;
    resolve?: (line: string) => void;
    reject?: (line: string) => void;
    LzAnalyzeHandler?: (infos: LzInfo[]) => void;
    kataAnalyzeHandler?: (infos: KataInfos) => void;

    constructor(url: string, callback?: () => void, error?: (err: ErrorEvent) => void) {
        this.buffer = "";
        if (url === "katago") {
            this.socket = window.Module["input"];
        } else {
            this.socket = new WebSocket(url);
        }
        this.socket.onopen = (event: Event) => {
            this.socket.onmessage = (event: MessageEvent) => {
                this.buffer += event.data;
                const lines = this.buffer.split("\n");
                this.buffer = lines.pop()!;
                for (const line of lines) {
                    this.process(line);
                }
            };
            if (callback) {
                callback();
            }
        }
        this.socket.onerror = (err: ErrorEvent) => {
            console.log("onerror", err);
            if (error) {
                error(err);
            }
        }
        if (!(this.socket instanceof WebSocket)) {
            setTimeout(() => { this.socket.onopen(new CustomEvent("open")); }, 0);
        }
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                this.resume();
            } else {
                this.suspend();
            }
        }, false);
    }

    _command(str: string) {
        this.lastCommand = str;
        this.socket.send(str + "\n");
    }

    command(str: string) {
        return new Promise((res, rej) => {
            this.LzAnalyzeHandler = undefined;
            this.resolve = res;
            this.reject = rej;
            this._command(str);
        });
    }

    lzAnalyze(interval: number, handler: (infos: LzInfo[]) => void) {
        this.LzAnalyzeHandler = handler;
        this._command(`lz-analyze ${interval}`);
    }

    kataAnalyze(interval: number, handler: (infos: KataInfos) => void) {
        this.kataAnalyzeHandler = handler;
        this._command(`kata-analyze ${interval} ownership true`);
    }

    process(line: string) {
        if (line.startsWith("=")) {
            if (this.resolve) {
                this.resolve(line);
                this.resolve = undefined;;
            }
        } else if (line.startsWith("?")) {
            if (this.reject) {
                this.reject(line);
                this.reject = undefined;;
            }
        }
        if (this.LzAnalyzeHandler) {
            this.parseLzAnalyze(line);
        }
        if (this.kataAnalyzeHandler) {
            this.parseKataAnalyze(line);
        }
    }
    parseLzAnalyze(line: string) {
        // info move C4 visits 2 winrate 4861 prior 1307 lcb -5139 order 0 pv C4 Q17 info move Q17 visits 2 winrate 4905 prior 1098 lcb -5095 order 1 pv Q17 Q3 info move Q3 visits 2 winrate 4870 prior 1089 lcb -5130 order 2 pv Q3 Q17 info move Q4 visits 2 winrate 4934 prior 915 lcb -5066 order 3 pv Q4 Q17 info move Q16 visits 2 winrate 4940 prior 900 lcb -5060 order 4 pv Q16 Q3 info move D3 visits 0 winrate 4120 prior 853 lcb -5880 order 5 pv D3
        const regex = /info move ([A-Z]\d{1,2}) visits (\d+) winrate (\d+) prior (-?\d+) lcb (-?\d+) order (\d+) pv ((:? ?[A-Z]\d{1,2})+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(line)) != null) {
            result.push({
                move: match[1],
                visits: parseInt(match[2]),
                winrate: parseInt(match[3]) / 10000,
                prior: parseInt(match[4]),
                lcb: parseInt(match[5]),
                order: parseInt(match[6]),
                pv: match[7].split(" ")
            });
        }
        this.LzAnalyzeHandler!(result);
    }
    parseKataAnalyze(line: string) {
        // info move C16 visits 56 utility -0.0194507 radius 0.00739696 winrate 0.491428 scoreMean -0.478044 scoreStdev 32.3095 prior 0.105269 lcb 0.488786 utilityLcb -0.0268477 order 0 pv C16 D3 R16 Q3 info move Q17 visits 53 utility -0.0205986 radius 0.00789271 winrate 0.490967 scoreMean -0.51843 scoreStdev 32.3086 prior 0.103317 lcb 0.488148 utilityLcb -0.0284914 order 1 pv Q17 R4 C4 D17 info move R16 visits 48 utility -0.0213819 radius 0.00722001 winrate 0.490688 scoreMean -0.558307 scoreStdev 32.284 prior 0.0935492 lcb 0.48811 utilityLcb -0.0286019 order 2 pv R16 D17 Q3 C4 info move Q3 visits 48 utility -0.02044 radius 0.00754151 winrate 0.491073 scoreMean -0.52743 scoreStdev 32.2601 prior 0.0914671 lcb 0.48838 utilityLcb -0.0279815 order 3 pv Q3 C4 C16 Q17 info move D17 visits 46 utility -0.0203694 radius 0.00863686 winrate 0.491095 scoreMean -0.523149 scoreStdev 32.3207 prior 0.0878046 lcb 0.48801 utilityLcb -0.0290062 order 4 pv D17 C4 R4 R16 info move C4 visits 45 utility -0.0197793 radius 0.00917776 winrate 0.491299 scoreMean -0.49066 scoreStdev 32.3245 prior 0.0849676 lcb 0.488021 utilityLcb -0.028957 order 5 pv C4 D17 R4 Q17 info move R4 visits 44 utility -0.0194629 radius 0.00811152 winrate 0.491457 scoreMean -0.490883 scoreStdev 32.3008 prior 0.0829457 lcb 0.488561 utilityLcb -0.0275745 order 6 pv R4 D3 D17 Q17 info move D3 visits 31 utility -0.0191221 radius 0.0111833 winrate 0.491607 scoreMean -0.48426 scoreStdev 32.3926 prior 0.0578495 lcb 0.487613 utilityLcb -0.0303054 order 7 pv D3 R16 Q3 C16 info move Q4 visits 22 utility -0.0124166 radius 0.0190799 winrate 0.494289 scoreMean -0.244886 scoreStdev 32.3341 prior 0.035389 lcb 0.487475 utilityLcb -0.0314966 order 8 pv Q4 C16 Q17 info move D16 visits 21 utility -0.011348 radius 0.0169283 winrate 0.494768 scoreMean -0.224796 scoreStdev 32.3515 prior 0.0329591 lcb 0.488722 utilityLcb -0.0282763 order 9 pv D16 R4 Q17 info move Q16 visits 20 utility -0.0146187 radius 0.0177249 winrate 0.493477 scoreMean -0.347622 scoreStdev 32.3037 prior 0.034737 lcb 0.487147 utilityLcb -0.0323436 order 10 pv Q16 R4 C4 D17 info move D4 visits 18 utility -0.0106007 radius 0.0247917 winrate 0.495063 scoreMean -0.197694 scoreStdev 32.4116 prior 0.026451 lcb 0.486209 utilityLcb -0.0353924 order 11 pv D4 D17 R16 ownership 0.0574604 0.0927184 0.0862007 0.0889222 0.0713715 0.0705342 0.0663168 0.0699454 0.0696961 0.0703135 0.0707498 0.0720875 0.0683848 0.0697193 0.0657052 0.0811097 0.0803288 0.0891219 0.0589881 0.09508 0.0887696 0.0856517 0.0567618 0.0538765 0.0454831 0.037413 0.0424316 0.0418428 0.0414332 0.0427052 0.0438007 0.0401999 0.0443078 0.04858 0.0488899 0.0744198 0.0782437 0.0795875 0.0927124 0.0970239 0.068805 0.0359063 0.027807 0.040289 0.0323884 0.0359301 0.0319725 0.0286396 0.0314628 0.0330162 0.0307161 0.0350543 0.0235283 0.020687 0.0460025 0.073326 0.0802772 0.102314 0.0730797 0.0559703 0.0428388 0.0478558 0.0374339 0.0321411 0.0350915 0.032562 0.0320581 0.0322501 0.0338105 0.0301837 0.029372 0.0364939 0.0338301 0.0170987 0.0471682 0.0860232 0.0806405 0.06963 0.0410239 0.0474705 0.0264108 0.028095 0.0277513 0.0269129 0.025512 0.0257056 0.0253849 0.0268678 0.0262896 0.0218693 0.0223549 0.0386803 0.0254255 0.0511993 0.0714695 0.0758416 0.0510583 0.039525 0.0360652 0.0254357 0.024569 0.0223601 0.0146071 0.0127407 0.0131719 0.0130609 0.0145692 0.020976 0.0232113 0.0236705 0.0341295 0.038488 0.0405238 0.0703722 0.0724104 0.0408933 0.0345678 0.033456 0.0273286 0.0214489 0.0109052 0.00227355 1.36716e-05 7.0059e-05 -0.000410544 0.00066663 0.00918381 0.0199694 0.0284545 0.0308396 0.0304586 0.0345143 0.0668094 0.072015 0.0414706 0.0365848 0.0383315 0.0287511 0.014852 0.00129122 -0.00670995 -0.0096296 -0.00890338 -0.009229 -0.00681303 0.00073803 0.0125068 0.0282436 0.033793 0.0327075 0.0415581 0.0722434 0.0677752 0.0390562 0.0333236 0.0353017 0.0260784 0.0115204 -0.0021702 -0.0113931 -0.0153548 -0.0147816 -0.014332 -0.0103502 -0.00193408 0.0102372 0.0246196 0.0313203 0.0286652 0.0404499 0.071719 0.0652687 0.0371737 0.0271852 0.0320029 0.0244574 0.0101729 -0.00306306 -0.0122747 -0.0168854 -0.0162893 -0.0162496 -0.0113587 -0.00237764 0.00981343 0.0236747 0.0300972 0.0250575 0.0373618 0.071067 0.0634167 0.0371166 0.0251066 0.0275254 0.0212085 0.00748802 -0.00544358 -0.0136066 -0.0178959 -0.0181945 -0.0177597 -0.0128457 -0.00337375 0.00914089 0.0226917 0.0299255 0.0269413 0.0340216 0.0690287 0.0610828 0.0350292 0.0234277 0.0245448 0.0195385 0.00625186 -0.00509413 -0.011918 -0.0136773 -0.0126529 -0.0125938 -0.00954261 -0.00163155 0.0104468 0.0230677 0.0297651 0.0248561 0.0325079 0.0667663 0.0530989 0.0241485 0.0167402 0.0170874 0.0144973 0.0102617 0.00225149 -0.00486142 -0.00583227 -0.00427596 -0.00443261 -0.00260952 0.00667355 0.0165172 0.0215436 0.0231393 0.0177754 0.0248205 0.0616455 0.0496837 0.0235134 0.0107289 0.0131149 0.00576788 0.0106886 0.0100019 0.00467538 0.00352945 0.00487139 0.00469349 0.00734111 0.014891 0.0163271 0.0148882 0.0227564 0.0179868 0.0292976 0.0605091 0.0454176 0.0215302 -0.00957254 0.00772825 0.00449392 0.00775453 0.013559 0.0158508 0.0147453 0.0162791 0.0170412 0.0195928 0.0195486 0.0157745 0.0127525 0.0227294 0.0123397 0.0336789 0.0560846 0.0524011 0.00537971 -0.0367772 0.0201121 0.00255268 0.00633342 0.0112068 0.0194867 0.0195896 0.0213024 0.021994 0.0238675 0.0197127 0.0185881 0.0267457 0.0271527 0.00493118 0.0321386 0.0680206 0.0320382 0.0248312 -0.0121598 -0.0560937 -0.016586 0.0033388 0.010258 0.0191786 0.0191341 0.0169894 0.0206722 0.0221256 0.0157605 0.0197785 0.0122782 -0.00640326 0.0215207 0.0570617 0.0569199 0.0235893 0.0244588 0.0171742 -0.00940123 0.00497656 0.0136249 0.0109796 0.0211825 0.0241471 0.0261304 0.0284791 0.0278052 0.0240433 0.0307363 0.0356951 0.0270279 0.0523358 0.0552047 0.0552847 -0.00718682 0.0239468 0.0142311 0.0338551 0.0278807 0.0416977 0.0494086 0.0593436 0.0604753 0.0625834 0.0626572 0.0633467 0.0566236 0.0559152 0.0495887 0.0620285 0.051852 0.0538323 0.0218319
        const result: KataInfos = {
            info: [],
            ownership: []
         };
         if (!line.includes("info")) {
            this.kataAnalyzeHandler!(result);
            return;
         }
         const [infos, ownership] = line.trim().split("ownership");
         const infoStrs = infos.trim().split("info");
         infoStrs.shift(); // 最初は空文字列
         for (const infoStr of infoStrs) {
            const items = infoStr.trim().split(" ");
            const info: any = {};
            while (items.length > 1) {
                const item = items.shift()!;
                switch (item) {
                    case "move":
                    info[item] = items.shift();
                    break;
                    case "visits":
                    info[item] = parseInt(items.shift()!);
                    break;
                    case "pv":
                    info[item] = [...items];
                    items.splice(0);
                    break;
                    default:
                    info[item] = parseFloat(items.shift()!);
                    break;
                }
            }
            if ("move" in info && "visits" in info && "winrate" in info && "pv" in info) {
                result.info.push(info as KataInfo);
            } else {
                console.log(info);
                console.log(line);
            }
        }
        if (ownership != null) {
            result.ownership = ownership.trim().split(" ").map(parseFloat);
        };
        this.kataAnalyzeHandler!(result);
    }

    suspend() {
        this.socket.send("\n");
    }

    resume() {
        if (this.lastCommand) {
            this._command(this.lastCommand);
        }
    }
}

export default Gtp;