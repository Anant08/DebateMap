import "./Start_0"; // fake/empty import, so this module is correctly seen as module (rather than raw js script)

// special, early, definitely-safe codes
var g = window as any;
declare global { const g; } g.g = g;
/*var JQuery = require("../../../Source/Frame/JQuery/JQuery3.1.0"); // maybe temp; moved here for $().append testing
g.JQuery = JQuery;
g.jQuery = JQuery;
g.$ = JQuery;*/

let isBot = /bot|crawler|spider|robot|crawling|google|bing|duckduckgo|msn|slurp|yandex|baidu|aolbuild|teoma/i.test(navigator.userAgent);
//declare global { const isBot: string; } g.Extend({isBot});
declare global { const isBot: string; } g.isBot = isBot;

// browser-check
var GetBrowser = require("./UserAgent").GetBrowser;
var supportedBrowsers = require("./UserAgent").supportedBrowsers;
var browser = GetBrowser().name || navigator.userAgent;
if (supportedBrowsers.indexOf(browser) == -1 && !isBot) {
	var message = "Sorry! Your browser (" + browser + ") is not supported. Please use a supported browser such as Chrome, Firefox, or Safari.";
	setTimeout(()=> {
		try {
			store.dispatch(new g.ACTNotificationMessageAdd(new g.NotificationMessage(message)));
		} catch (ex) {
			alert(message);
		}
	});
}

// special, early codes
Object.freeze = obj=>obj; // mwahahaha!! React can no longer freeze its objects, so we can do as we please
Object.isFrozen = obj=>true;

// set this up, so we can see Googlebot errors! (in "Fetch as Google" panel)
if (isBot) {
	g.onerror = function(message, url, line, column, error) {
		console.log(arguments);

		let container = document.createElement("div");
		container.style.color = "red";
		container.style.position = "fixed";
		container.style.background = "#eee";
		container.style.padding = "2em";
		container.style.top = "1em";
		container.style.left = "1em";

		let msg = document.createElement("pre");
		msg.innerText = [
			"Message: " + message,
			"URL: " + url,
			"Line: " + line,
			"Column: " + column,
			"Stack: " + (error && error.stack)
		].join("\n");
		container.appendChild(msg);

		document.body.appendChild(container);
	};
}

declare global { function G(...globalHolders); } g.G = G;
function G(...globalHolders) {
	for (let globalHolder of globalHolders)
		g.Extend(globalHolder);
}