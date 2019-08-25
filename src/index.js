/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import './index.css';
import GoBoardController from './GoBoardController';
import * as serviceWorker from './serviceWorker';

if (typeof SharedArrayBuffer !== "undefined") {
    window.goBoardController = new GoBoardController();
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
