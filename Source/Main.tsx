// "static" imports
import "webpack-runtime-require";
//import {Require} from "webpack-runtime-require";
import "./Frame/General/Start";
import "./Frame/General/CE";

import ReactDOM from "react-dom";
import {Store} from "redux";
import {RootState} from "./Store/index";
import {FirebaseApp} from "./Frame/Database/DatabaseHelpers";
import {GetUrlVars, CurrentUrl, URL} from "./Frame/General/URLs";
import Raven from "raven-js";
import {GetBrowser, supportedBrowsers} from "./Frame/General/UserAgent";
import injectTapEventPlugin from "react-tap-event-plugin";
import * as React from "react";
//import Promise from "bluebird";

// startup (non-hot)
// ==========

var JQuery = require("./Frame/JQuery/JQuery3.1.0");
g.Extend({JQuery, jQuery: JQuery});
g.$ = JQuery;

g.Extend({React});

//g.Extend({Promise});
/*function PromiseWrapper(...args) {
	//let promise = Promise.apply(this, ...args);
	let promise = new Promise(...args);

	//promise._setAsyncGuaranteed(false);
    //this._bitField = this._bitField | 134217728;
    promise._bitField = promise._bitField & (~134217728);
	return promise;
}
for (var key in Promise)
	PromiseWrapper[key] = Promise[key];
g.Extend({React, Promise: PromiseWrapper});*/

// Tap Plugin
injectTapEventPlugin();

let browser = GetBrowser().name;
if (!supportedBrowsers.Contains(browser)) {
	alert(`Sorry! Your browser (${browser}) is not supported. Please use a supported browser such as Chrome, Firefox, or Safari.`);
}

let startURL = URL.Current();
g.Extend({startURL}); declare global { export var startURL: URL; }

//let {version} = require("../../../package.json");
//mport {version, env, devEnv, prodEnv, testEnv} from "./BakedConfig";
let {version, env, devEnv, prodEnv, testEnv} = require("./BakedConfig");
//let version = "0.0.1", env = "development", devEnv = true, prodEnv = false, testEnv = false;
if (startURL.GetQueryVar("env") && startURL.GetQueryVar("env") != "null") {
	env = startURL.GetQueryVar("env");
	devEnv = env == "development";
	prodEnv = env == "production";
	testEnv = env == "test";
	//alert("Using env: " + env);
	console.log("Using env: " + env);
}
g.Extend({env, devEnv, prodEnv, testEnv});

if (prodEnv) {
	Raven.config("https://40c1e4f57e8b4bbeb1e5b0cf11abf9e9@sentry.io/155432", {
		release: version,
		environment: env,
	}).install();
}

if (devEnv) {
	// this logs warning if a component doesn't have any props or state change, yet is re-rendered
	const {whyDidYouUpdate} = require("why-did-you-update");
	whyDidYouUpdate(React, {
		exclude: new RegExp(
			`connect|Connect|Link`
			+ `|Animate|Animation|Dot|ComposedDataDecorator|Chart|Curve|Route|ReferenceLine|Text` // from recharts
			+ `|Div` // from ScrollView (probably temp)
			+ `|Button` // from react-social-button>react-bootstrap
		),
	});
}

// hot-reloading
// ==========

// this code is excluded from production bundle
if (__DEV__) {
	/*if (window.devToolsExtension)
		window.devToolsExtension.open();*/
	if (module.hot) {
		// setup hot module replacement
		module.hot.accept("./Main_Hot", () => {
			setTimeout(()=> {
				ReactDOM.unmountComponentAtNode(document.getElementById("root"));
				LoadHotModules();
			});
		});
	}
}

function LoadHotModules() {
	//Log("Reloading hot modules...");
	require("./Main_Hot");
}

//setTimeout(()=>LoadHotModules());
LoadHotModules();