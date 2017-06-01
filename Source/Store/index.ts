import {Assert} from "../Frame/General/Assert";
import {VMenuReducer, VMenuState} from "react-vmenu";
import {combineReducers} from "redux";
import {firebaseStateReducer, helpers} from "react-redux-firebase";
//import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions, MessageBoxReducer, MessageBoxState} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {createSelector} from "reselect";
import {DBPath, GetData} from "../Frame/Database/DatabaseHelpers";
import {QuickIncrement, Debugger} from "../Frame/General/Globals_Free";
import {GetTreeNodesInObjTree, DeepGet} from "../Frame/V/V";
import {Set} from "immutable";
import {MainState, MainReducer} from "./main";
import {LocationDescriptorObject} from "history";
import * as Immutable from "immutable";
import {ACTDebateMapSelect} from "./main/debates";
import * as u from "updeep";
import {URL} from "../Frame/General/URLs";

//import {browserHistory} from "react-router";
import {browserHistory} from "../Frame/Store/CreateStore";

export function InjectReducer(store, {key, reducer}) {
	store.asyncReducers[key] = reducer;
	store.replaceReducer(MakeRootReducer(store.asyncReducers));
}

// class is used only for initialization
export class RootState {
	main: MainState;
	//firebase: FirebaseDatabase;
	//firebase: Immutable.Map<any, any>;
	firebase: any;
	//form: any;
	router: RouterState;
	messageBox: MessageBoxState;
	vMenu: VMenuState;
}
export function MakeRootReducer(asyncReducers?) {
	return combineReducers({
		main: MainReducer,
		firebase: firebaseStateReducer,
		//form: formReducer,
		router: RouterReducer,
		messageBox: MessageBoxReducer,
		vMenu: VMenuReducer,
		...asyncReducers
	});
}

function RouterReducer(state = {location: null}, action) {
	let oldURL = URL.FromState(state.location);
	let newURL = oldURL.Clone();
	if (action.Is(ACTDebateMapSelect) && action.payload.id == null) {
		newURL.pathNodes.length = 1;
	}
	if (oldURL.toString() != newURL.toString()) {
		browserHistory.push(newURL.toString({domain: false}));
		return {...state, location: newURL.ToState()};
	}

	return routerReducer(state, action);
}

interface RouterState {
	location: LocationDescriptorObject & {hash: string}; // typing must be outdated, as lacks hash prop
	history: any;
}