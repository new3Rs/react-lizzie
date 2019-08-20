class Gtp {
    constructor() {
        this.inputDom = document.getElementById("input");
        this.outputDom = document.getElementById("output");
        this.outputDom.addEventListener("message", event => {
            this.process(event.currentTarget.value);
            event.currentTarget.value = "";
        }, false);
    }
    _command(str) {
        this.inputDom.command.value = str;
        // submitメソッドはイベントハンドラを走らせない。
        this.inputDom.dispatchEvent(new CustomEvent('submit'));
    }
    command(str) {
        return new Promise((res, rej) => {
            if (this.inputDom.command.getAttribute("disabled") != null) {
                return;
            }
            this.LzAnalyzeHandler = null;
            this.resolve = res;
            this.reject = rej;
            this._command(str);
        });
    }
    lzAnalyze(interval, handler) {
        if (this.inputDom.command.getAttribute("disabled") != null) {
            return;
        }
        this.LzAnalyzeHandler = handler;
        this._command(`lz-analyze ${interval}`);
    }
    process(line) {
        if (line.startsWith("=")) {
            if (this.resolve) {
                this.resolve(line);
                this.resolve = null;;
            }
        } else if (line.startsWith("?")) {
            if (this.reject) {
                this.reject(line);
                this.reject = null;;
            }
        }
        if (this.LzAnalyzeHandler) {
            this.parseLzAnalyze(line);
        }
    }
    parseLzAnalyze(line) {
        const regex = /info move ([A-Z]\d{1,2}) visits (\d+) winrate (\d+) prior (-?\d+) lcb (-?\d+) order (\d+) pv ((:? ?[A-Z]\d{1,2})+)/g;
        const result = [];
        let match;
        while ((match = regex.exec(line)) != null) {
            result.push([
                match[1],
                parseInt(match[2]),
                parseInt(match[3]),
                parseInt(match[4]),
                parseInt(match[5]),
                parseInt(match[6]),
                match[7].split(" ")
            ]);
        }
        this.LzAnalyzeHandler(result);
    }
}

export default Gtp;