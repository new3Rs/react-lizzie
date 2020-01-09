/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */
/* global FS */

import './index.css';
import GoBoardController from './GoBoardController';
import GoPosition from './GoPosition';
import * as serviceWorker from './serviceWorker';

if (typeof SharedArrayBuffer !== "undefined") {
    const goBoardController = new GoBoardController(document.getElementById('root'));
    window.goBoardController = goBoardController
    document.getElementById("sgf").addEventListener("paste", async function(e) {
        const sgf = (e.clipboardData || window.clipboardData).getData('text');
        const file = "tmp.sgf";
        FS.writeFile(file, sgf);
        await goBoardController.gtp.command(`loadsgf ${file}`);
        goBoardController.model = GoPosition.fromSgf(sgf);
        goBoardController.kataAnalyze();
    }, false);
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
