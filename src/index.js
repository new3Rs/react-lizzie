/**
 * @preserve Copyright 2019 ICHIKAWA, Yuji (New 3 Rs)
 */

import * as serviceWorker from './serviceWorker';
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import './index.css';

if (typeof SharedArrayBuffer !== "undefined") {
  render(<App />, document.getElementById('app-container'));
}

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
