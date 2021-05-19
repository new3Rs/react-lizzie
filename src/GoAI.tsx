/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from "react";
import jssgf from "jssgf";
import { updateMessage } from "./utilities";
import StdStream from "./StdStream";
import SituationBar from "./SituationBar";
import GoBoard from "./GoBoard";
import NavigationBar from "./NavigationBar";
import GoPosition, { PASS, BLACK, xy2coord, GoMove } from "./GoPosition";
import GtpController, { KataInfo } from "./GtpController";
import SGFCursor from "./SGFCursor";

function appendScript(URL: string, onload: (() => void) | null = null) {
	var el = document.createElement('script');
    el.src = URL;
    el.onload = onload;
	document.body.appendChild(el);
}

interface Props {
    gtp: string;
    sgf: string;
}

interface State {
    disabled: boolean;
    percent: number;
    black: string;
    white: string;
    model: GoPosition;
    history: GoMove[];
    candidates: KataInfo[];
    ownership: number[];
}

class GoAI extends React.Component<Props, State> {
    byoyomi: number;
    gtp!: GtpController;
    size: number;
    cursor: SGFCursor;

    constructor(props: Props) {
        super(props);
        this.byoyomi = 3;
        const collection = jssgf.fastParse(this.props.sgf);
        this.cursor = new SGFCursor(collection);
        this.size = parseInt(collection[0]["SZ"]);
        this.state = {
            disabled: true,
            percent: 50,
            black: "",
            white: "",
            model: GoPosition.fromSgf(this.props.sgf, 0),
            history: [],
            candidates: [],
            ownership: []
        };
        updateMessage("ローディング中...少々お待ちください");
        if (this.props.gtp === "katago") {
            if (typeof SharedArrayBuffer === "undefined") {
                updateMessage("SharedArrayBuffer, which is necessary for KataGo, is not available. Trying to connect localhost websocket server...", "yellow");
                this.start("ws://localhost:5001");
            } else {
                window.katagoStatusHandler = (status: number) => {
                    switch (status) {
                        case 1:
                        setTimeout(() => {
                            this.start("katago");
                        }, 0);
                        break;
                        case -1:
                        console.log("KataGo failed to start");
                        break;
                    }
                }
                if (typeof window.Module === "undefined") {
                    window.Module = {};
                }
                if (!("preRun" in window.Module)) {
                    window.Module["preRun"] = [];
                }
                if (!("arguments" in window.Module)) {
                    window.Module["arguments"] = [];
                }
                window.Module["preRun"].push(() => {
                    const params = new URL(window.location.toString()).searchParams;
                    const cfgFile = params.get("config") || `gtp_${this.size}x${this.size}.cfg`;
                    FS.createPreloadedFile(
                        FS.cwd(),
                        cfgFile,
                        cfgFile,
                        true, // 読み込み許可
                        false // 書き込み許可
                    );
                    window.Module["arguments"].push(params.get("subcommand") || "gtp");
                    window.Module["arguments"].push("-model");
                    window.Module["arguments"].push(params.get("model") || `web_model_${this.size}x${this.size}`);
                    window.Module["arguments"].push("-config");
                    window.Module["arguments"].push(cfgFile);
                
                    const stdio = new StdStream();
                    FS.init(stdio.input.bind(stdio), stdio.output.bind(stdio), stdio.error.bind(stdio));
                    window.Module["input"] = stdio;
                });
                appendScript("katago.js");
            }
        } else {
            this.start(this.props.gtp);
        }
    }

    start(url: string) {
        try {
            const socket = url === "katago" ? window.Module["input"] : new WebSocket(url);
            this.gtp = new GtpController(socket, async () => {
                if (url === "katago") {
                    const filename = "tmp.sgf";
                    FS.writeFile(filename, this.props.sgf);
                    await this.gtp.loadsgf(filename, 0);
                } else {
                    await this.gtp.loadsgfAsHereDocument(this.props.sgf, 0);
                }
                updateMessage("");
                this.setState({ disabled: false });
                this.kataAnalyze();
            }, (err) => {
                updateMessage(`failed to connect ${(err?.target as WebSocket).url}`, "red");
            });
        } catch(e) {
            updateMessage(e.toString(), "red");
        }
    }

    render() {
        const size = `${Math.min(window.innerWidth, window.innerHeight)}px`;
        return (
            <div>
                <SituationBar
                    width={size}
                    blackPercent={this.state.percent}
                    blackInfo={this.state.black}
                    whiteInfo={this.state.white}
                />
                <GoBoard
                    width={size}
                    height={size}
                    w={this.size}
                    h={this.size}
                    candidates={this.state.candidates}
                    model={this.state.model}
                    onClickIntersection={(x, y) => {
                        if (this.state.disabled) {
                            return;
                        }
                        if (this.state.history[this.state.history.length - 1]?.point === this.state.model.xyToPoint(x, y)) {
                            this.undo();
                        } else {
                            this.play(x, y);
                        }
                    }}
                />
                <NavigationBar
                    width={size}
                    disabled={this.state.disabled}
                    moveNumber={this.state.model.moveNumber}
                    rewind={() => { this.rewind(); }}
                    back={() => { this.back(); }}
                    pause={() => { this.pause(); }}
                    forward={() => { this.forward(); }}
                    fastForward={() => { this.fastForward(); }}
                />
                <div style={{clear: "left"}}></div>
            </div>
        );
    }

    lzAnalyze() {
        this.gtp.lzAnalyze(100, result => {
            const first = result[0];
            const blackWinrate = (this.state.model.turn === BLACK ? first.winrate : 1 - first.winrate) * 100;
            this.setState({
                candidates: result,
                percent: blackWinrate,
                black: `${blackWinrate.toFixed(1)}%`,
                white: `${(100 - blackWinrate).toFixed(1)}%`
            });
        });
    }

    kataAnalyze() {
        this.gtp.kataAnalyze(100, result => {
            if (result.info.length === 0) {
                return;
            }
            const first = result.info[0];
            const blackWinrate = (this.state.model.turn === BLACK ? first.winrate : 1.0 - first.winrate) * 100;
            const blackScore = (this.state.model.turn === BLACK ? first.scoreMean : 1.0 - first.scoreMean).toFixed(1);
            const scoreStdev = first.scoreStdev.toFixed(1);
            let black;
            let white;
            if (blackWinrate >= 50) {
                black = `${blackWinrate.toFixed(1)}%(${blackScore}±${scoreStdev})`;
                white = `${(100 - blackWinrate).toFixed(1)}%`;
            } else {
                black = `${blackWinrate.toFixed(1)}%`;
                white = `${(100 - blackWinrate).toFixed(1)}%(${-blackScore}±${scoreStdev})`;
            }
            this.setState({
                candidates: result.info,
                ownership: result.ownership,
                percent: blackWinrate,
                black,
                white 
            });
        });
    }

    async play(x: number, y: number) {
        this.cursor.play(this.state.model.turn === BLACK ? "B" : "W", this.state.model.xyToMove(x, y));
        await this._play(x, y);
        this.kataAnalyze();
    }

    async _play(x: number, y: number) {
        try {
            const turn = this.state.model.turn;
            this.setState((state, props) => {
                const move = state.model.play(state.model.xyToPoint(x, y));
                if (move != null) {
                    state.history.push(move);
                }
                return {
                    model: state.model,
                    history: state.history,
                    candidates: [],
                    ownership: []
                };
            });
            await this.gtp.play(turn === BLACK ? "black" : "white", xy2coord(x, y));
        } catch (e) {
            console.log(e);
        }
    }

    async undo() {
        if (this.cursor.hasNext()) {
            this.cursor.back();
        } else {
            this.cursor.removeCurrent();
        }
        await this._undo();
        this.kataAnalyze();
    }

    async _undo() {
        try {
            this.setState((state, props) => {
                const move = state.history.pop();
                if (move != null) {
                    state.model.undoPlay(move);
                }
                return {
                    model: state.model,
                    history: state.history,
                    candidates: [],
                    ownership: []
                };
            });
            await this.gtp.undo();
        } catch (e) {
            console.log(e);
        }
    }

    async rewind() {
        for (let i = 0; i < 10; i++) {
            await this._back();
        }
        this.kataAnalyze();
    }

    async back() {
        await this._back();
        this.kataAnalyze();
    }

    async _back() {
        const node = this.cursor.back();
        if (node == null) {
            return;
        }
        await this._undo();
    }

    async forward() {
        await this._forward();
        this.kataAnalyze();
    }

    async _forward() {
        while (true) {
            const node = this.cursor.forward();
            if (node == null) {
                return;
            }
            const move = node["B"] || node["W"];
            if (move == null) {
                continue;
            } else {
                const xy = this.state.model.moveToXy(move);
                if (xy === -1) {
                    await this.state.model.play(PASS);
                } else {
                    await this._play(xy[0], xy[1]);
                }
                break;
            }
        }
    }

    async fastForward() {
        for (let i = 0; i < 10; i++) {
            await this._forward();
        }
        this.kataAnalyze();
    }

    async pause() {
        await this.gtp.stop();
    }
}

export default GoAI;
