import Socket from "./Socket";

class StdStream implements Socket {
    stdin: string;
    stdout: string;
    stderr: string;
    onopen: ((event: Event) => any) | null;
    onerror: ((event: ErrorEvent) => any) | null;
    onmessage: ((event: MessageEvent) => any) | null;
    resolve?: (value: unknown) => void;
    reject?: () => void;

    constructor() {
        this.stdin = "";
        this.stdout = "";
        this.stderr = "";
        this.onopen = null;
        this.onerror = null;
        this.onmessage = null;
    }

    send(str: string) {
        this.stdin += str;
        if (this.resolve != null) {
            this.resolve(undefined);
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

    output(code: number) {
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
            const event = new MessageEvent("stdstream", {
                data: this.stdout
            });
            this.stdout = "";
            setTimeout(() => {
                if (this.onmessage) {
                    this.onmessage(event);
             }
            }, 0);
        }
    }

    error(code: number) {
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

export default StdStream;
