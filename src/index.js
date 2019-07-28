import './index.css';
import GoBoardController from './GoBoardController';
import * as serviceWorker from './serviceWorker';

const controller = new GoBoardController();
controller.start(19);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
