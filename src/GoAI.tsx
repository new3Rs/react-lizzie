/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from "react";
import SituationBar from "./SituationBar";
import GoBoard from "./GoBoard";
import GoPosition, { BLACK, xy2coord, GoMove } from "./GoPosition";
import Gtp, { KataInfo } from "./Gtp";

function appendScript(URL: string, onload: (() => void) | null = null) {
	var el = document.createElement('script');
    el.src = URL;
    el.onload = onload;
	document.body.appendChild(el);
}

function updateMessage(str: string, color: string = "black") {
    const dom = document.getElementById("message")!;
    dom.innerText = str;
    dom.style.color = color;
}

declare var FS: any;

declare global {
    interface Window {
        clipboardData?: any;
        goAI: GoAI;
        Module: any;
    }
}

interface Props {
    gtp: string;
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
    size: number;
    byoyomi: number;
    gtp!: Gtp;
    constructor(props: Props) {
        super(props)
        this.size = 19;
        this.byoyomi = 3;
        this.state = {
            percent: 50,
            black: "",
            white: "",
            model: new GoPosition(this.size, 0),
            history: [],
            candidates: [],
            ownership: []
        }
        document.getElementById("sgf")!.addEventListener("paste", async (e) => {
            const sgf = (e.clipboardData || window.clipboardData).getData("text");
            const file = "tmp.sgf";
            FS.writeFile(file, sgf);
            await this.gtp.command(`loadsgf ${file}`);
            const model = GoPosition.fromSgf(sgf);
            this.setState({ model: model });
            this.kataAnalyze();
        }, false);
        if (this.props.gtp === "katago") {
            if (typeof SharedArrayBuffer === "undefined") {
                updateMessage("SharedArrayBuffer, which is necessary for KataGo, is not available. Trying to connect localhost websocket server...", "yellow");
                this.start("ws://localhost:5001");
            } else {
                window.goAI = this; // KataGoが準備できたら(pre_pre.js) startをコールする
                appendScript("pre_pre.js", () => {
                    appendScript("katago.js");
                });
            }
        } else {
            this.start(this.props.gtp);
        }
    }

    start(url: string) {
        try {
            this.gtp = new Gtp(url, () => {
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
                        if (this.state.history[this.state.history.length - 1]?.point === this.state.model.xyToPoint(x, y)) {
                            this.undo();
                        } else {
                            this.play(x, y);
                        }
                    }}
                />
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
