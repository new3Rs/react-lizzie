/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import React from "react";
import SituationBar from "./SituationBar";
import GoBoard from "./GoBoard";
import GoPosition, { BLACK, xy2coord } from "./GoPosition";
import Gtp, { KataInfo } from "./Gtp";

function appendScript(URL: string, onload: (() => void) | null = null) {
	var el = document.createElement('script');
    el.src = URL;
    el.onload = onload;
	document.body.appendChild(el);
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
        if (this.props.gtp === "wasm") {
            window.goAI = this; // KataGoが準備できたらkataAnalyzeを始めるため(pre_pre.js)
            appendScript("pre_pre.js", () => {
                appendScript("katago.js");
            });
        } else {
            this.start();
        }
    }

    start() {
        this.gtp = new Gtp(this.props.gtp, () => {
            this.kataAnalyze();
        });
    }

    render() {
        const size = "500px";
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
                    onClickIntersection={(x, y) => this.play(x, y)}
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
                state.model.play(state.model.xyToPoint(x, y));
                return {
                    model: state.model,
                    candidates: [],
                    ownership: []
                };
            });
            await this.gtp.command(`play ${turn === BLACK ? "black" : "white"} ${xy2coord(x, y)}`);
            this.kataAnalyze();
        } catch (e) {
            console.log(e);
        }
    }
}

export default GoAI;
