// status-  1: ready, -1: fail
function katagoStatusHandler(status) {
    switch (status) {
        case 1:
        setTimeout(function() {
            if (window.goAI) {
                window.goAI.start("katago");
            }
        }, 0);
        break;
        case -1:
        console.log("KataGo failed to start");
        break;
    }
}

class StdStream {
    constructor() {
        this.stdin = "";
        this.stdout = "";
        this.stderr = "";
        this.onopen = null;
        this.onmessage = null;
        this.onerror = null;
        this.resolve = null;
        this.reject = null;
    }

    send(str) {
        this.stdin += str;
        if (this.resolve != null) {
            this.resolve();
        }
    }

    input() {
        if (this.stdin.length === 0) {
            return null;
        }
        const code = this.stdin.charCodeAt(0);
        this.stdin = this.stdin.substr(1);
        return code;
    }

    wait() {
        return new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }

    output(code) {
        switch (code) {
            case 10: // "\n"
            this.stdout += String.fromCharCode(code);
            // no break;
            case 0: // NULL
            this.flushStdout();
            break;
            default:
            this.stdout += String.fromCharCode(code);
        }
    }

    flushStdout() {
        if (this.onmessage) {
            const event = new CustomEvent("message");
            event.data = this.stdout;
            this.stdout = "";
            setTimeout(() => { this.onmessage(event); }, 0);
        }
    }

    error(code) {
        if (code !== 0) {
            this.stderr += String.fromCharCode(code);
        }
        if (code === 10) { // "\n"
            if (this.stderr.includes("GTP ready")) {
                const message = "GTP ready\n";
                for (let i = 0; i < message.length; i++) {
                    this.output(message.charCodeAt(i));
                }
            }
            this.stderr = "";
        }
    }
}

if (typeof Module === "undefined") {
    Module = {};
}
if (!("preRun" in Module)) {
    Module["preRun"] = [];
}
if (!("arguments" in Module)) {
    Module["arguments"] = [];
}
Module["preRun"].push(function() {
    const params = new URL(location).searchParams;
    const cfgFile = params.get("config") || "gtp_auto.cfg";
    FS.createPreloadedFile(
        FS.cwd(),
        cfgFile,
        cfgFile,
        true, // 読み込み許可
        false // 書き込み許可
    );
    Module["arguments"].push(params.get("subcommand") || "gtp");
    Module["arguments"].push("-model");
    Module["arguments"].push(params.get("model") || "web_model");
    Module["arguments"].push("-config");
    Module["arguments"].push(cfgFile);

    const stdio = new StdStream();
    FS.init(stdio.input.bind(stdio), stdio.output.bind(stdio), stdio.error.bind(stdio));
    Module["input"] = stdio;
});