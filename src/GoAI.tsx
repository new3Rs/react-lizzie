/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from "react";
import { updateMessage } from "./utilities";
import StdStream from "./StdStream";
import SituationBar from "./SituationBar";
import GoBoard from "./GoBoard";
import GoPosition, { BLACK, xy2coord, GoMove } from "./GoPosition";
import GtpController, { KataInfo } from "./GtpController";

function appendScript(URL: string, onload: (() => void) | null = null) {
	var el = document.createElement('script');
    el.src = URL;
    el.onload = onload;
	document.body.appendChild(el);
}

interface Props {
    gtp: string;
    size: number;
}

interface State {
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
    constructor(props: Props) {
        super(props);
        this.byoyomi = 3;
        this.state = {
            percent: 50,
            black: "",
            white: "",
            model: new GoPosition(this.props.size, 0),
            history: [],
            candidates: [],
            ownership: []
        };
        document.getElementById("sgf")!.addEventListener("change", (event) => {
            if (event == null) {
                return;
            }
            if (event.currentTarget == null) {
                return;
            }
            const target = event.currentTarget as any;
            if (target.files.length === 0) {
                return;
            }
            const reader = new FileReader();
            reader.onload = async (event: Event) => {
                const target = event.target as any;
                const sgf = target.result;
                const filename = "tmp.sgf";
                FS.writeFile(filename, sgf);
                await this.gtp.command(`loadsgf ${filename}`);
                const model = GoPosition.fromSgf(sgf);
                this.setState({ model: model });
                this.kataAnalyze();
            };
            reader.readAsText(target.files[0]);
        }, false);
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
                    const cfgFile = params.get("config") || `gtp_${this.props.size}x${this.props.size}.cfg`;
                    FS.createPreloadedFile(
                        FS.cwd(),
                        cfgFile,
                        cfgFile,
                        true, // 読み込み許可
                        false // 書き込み許可
                    );
                    window.Module["arguments"].push(params.get("subcommand") || "gtp");
                    window.Module["arguments"].push("-model");
                    window.Module["arguments"].push(params.get("model") || `web_model_${this.props.size}x${this.props.size}`);
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
            this.gtp = new GtpController(socket, () => {
                updateMessage("");
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
                    w={this.props.size}
                    h={this.props.size}
                    candidates={this.state.candidates}
                    model={this.state.model}
                    onClickIntersection={(x, y) => {
                        if (this.state.history[this.state.history.length - 1]?.point === this.state.model.xyToPoint(x, y)) {
                            this.undo();
                        } else {
                            this.play(x, y);
                        }
                    }}
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
            this.kataAnalyze();
        } catch (e) {
            console.log(e);
        }
    }

    async undo() {
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
            this.kataAnalyze();
        } catch (e) {
            console.log(e);
        }
    }
}

export default GoAI;
