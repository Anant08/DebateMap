import {Log} from "../Serialization/VDF/VDF";
import {ACTNotificationMessageAdd} from "../../Store/main";
import NotificationMessage from "../../Store/main/@NotificationMessage";
import {LogError} from "./Logging";

g.onerror = function(message: string, filePath: string, line: number, column: number, error: Error) {
	/*LogError(`JS) ${message} (at ${filePath}:${line}:${column})
Stack) ${error.stack}`);*/
	if (error != null)
		HandleError(error);
	else
		HandleError({stack: filePath + ":" + line + ":" + column, toString: ()=>message} as any);
};

export function HandleError(error: Error, fatal = false) {
	let message = error.message || error.toString();
	let stackWithoutMessage = error.stack && error.stack.substr(0, error.stack.IndexOfAny("\r", "\n")) == error.message
		? error.stack.substr(error.stack.indexOf("\n") + 1)
		: error.stack || "";

	//alert("An error occurred: " + error);
	let errorStr = `An error has occurred: ${message}${
stackWithoutMessage ? "\n" + stackWithoutMessage : ""}${
fatal ? "\n[fatal]" : ""}`;
	LogError(errorStr);
	store.dispatch(new ACTNotificationMessageAdd(new NotificationMessage(errorStr)));
}