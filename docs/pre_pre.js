// status-  1: ready, -1: fail
function katagoStatusHandler(status) {
    const command = document.getElementById("input").command
    switch (status) {
        case 1:
        command.removeAttribute("disabled");
        command.setAttribute("placeholder", "Input a GTP command");
        command.focus();
        setTimeout(function() {
            if (window.goAI) {
                window.goAI.kataAnalyze();
            }
        }, 0);
        break;
        case -1:
        command.setAttribute("placeholder", "Engine failed loading a weight");
    }
}

class Input {
    constructor() {
        this.buffer = "";

        document.getElementById("input").addEventListener("submit", event => {
            event.preventDefault();
            this.buffer += event.currentTarget.command.value + "\n";
            document.getElementById("log").value += event.currentTarget.command.value + "\n";
            event.currentTarget.command.value = "";
            if (this.resolve) {
                this.resolve();
            }
        }, false);
    }

    callback() {
        if (!this.buffer) {
            return null;
        }
        const c = this.buffer[0];
        this.buffer = this.buffer.substr(1);
        return c.charCodeAt(0);
    }
    
    wait() {
        return new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
}

class Output {
    constructor() {
        this.buffer = "";
    }

    callback(char) {
        switch (char) {
            case 0: // NULL
            case 10: // "\n"
            const output = document.getElementById("output")
            output.value += this.buffer;
            document.getElementById("log").value += this.buffer + "\n";
            output.dispatchEvent(new CustomEvent("message"));
            this.buffer = "";
            break;
            case 13: // "\r"
            break;
            default:
            this.buffer += String.fromCharCode(char);
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

    const input = new Input();
    const output = new Output();
    FS.init(input.callback.bind(input), output.callback.bind(output), null);
    Module["input"] = input;
    Module["output"] = output;
});