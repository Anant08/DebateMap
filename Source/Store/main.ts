import {ToInt} from "../Frame/General/Types";
import {RootState} from "./index";
import {MapViews, MapNodeView, MapView} from "./main/mapViews/@MapViews";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {ToJSON, FromJSON, Debugger} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {Map} from "../Store/firebase/maps/@Map";
import {createSelector} from "reselect";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {PreDispatchAction} from "../Frame/Store/ActionProcessor";
import {CachedTransform} from "../Frame/V/VCache";
import {MapViewsReducer} from "./main/mapViews";
import {RatingUIReducer, RatingUIState} from "./main/ratingUI";
import NotificationMessage from "./main/@NotificationMessage";
import {URL} from "../Frame/General/URLs";
import {Global} from "../Frame/General/Globals_Free";
import {GetData} from "../Frame/Database/DatabaseHelpers";
import {GetTerms} from "./firebase/terms";
import {CombineReducers} from "../Frame/Store/ReducerUtils";
import {ContentReducer, Content} from "./main/content";
import {DebatesReducer, Debates} from "./main/debates";
import SubpageReducer from "./main/@Shared/$subpage";
import {LOCATION_CHANGED} from "redux-little-router";

// class is used only for initialization
export class MainState {
	page: string;
	envOverride: string;
	analyticsEnabled: boolean;
	topLeftOpenPanel: string;
	topRightOpenPanel: string;
	ratingUI: RatingUIState;
	notificationMessages: NotificationMessage[];

	// pages (and nav-bar panels)
	// ==========

	stream: {subpage: string};
	chat: {subpage: string};
	reputation: {subpage: string};

	users: {subpage: string};
	forum: {subpage: string};
	social: {subpage: string};
	more: {subpage: string};
	home: {subpage: string};
	content: Content;
	personal: {subpage: string};
	debates: Debates;
	global: {subpage: string};

	search: {subpage: string};
	guide: {subpage: string};
	profile: {subpage: string};

	// maps
	// ==========

	openMap: number;
	mapViews: MapViews;
	copiedNodePath: string;

	initialChildLimit: number;
}
export class ACTSetPage extends Action<string> {}
export class ACTSetSubpage extends Action<{page: string, subpage: string}> {}
export class ACTTopLeftOpenPanelSet extends Action<string> {}
export class ACTTopRightOpenPanelSet extends Action<string> {}
@Global
export class ACTNotificationMessageAdd extends Action<NotificationMessage> {}
export class ACTNotificationMessageRemove extends Action<number> {}
//export class ACTOpenMapSet extends Action<number> {}
export class ACTNodeCopy extends Action<{path: string}> {}
export class ACTSetInitialChildLimit extends Action<{value: number}> {}

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || CombineReducers({
		page: (state = null, action)=> {
			if (action.Is(ACTSetPage)) return action.payload;
			return state;
		},

		/*_: (state = null, action)=> {
			PreDispatchAction(action);
			return null;
		},*/
		envOverride: (state = null, action)=> {
			//if ((action.type == "@@INIT" || action.type == "persist/REHYDRATE") && startURL.GetQueryVar("env"))
			//if ((action.type == "PostRehydrate") && startURL.GetQueryVar("env"))
			if (action.type == LOCATION_CHANGED && URL.FromState(action.payload).GetQueryVar("env")) {
				let newVal = URL.FromState(action.payload).GetQueryVar("env");
				if (newVal == "null")
					newVal = null;
				return newVal;
			}
			return state;
		},
		analyticsEnabled: (state = true, action)=> {
			if (action.type == LOCATION_CHANGED && URL.FromState(action.payload).GetQueryVar("analytics") == "false")
				return false;
			if (action.type == LOCATION_CHANGED && URL.FromState(action.payload).GetQueryVar("analytics") == "true")
				return true;
			return state;
		},
		topLeftOpenPanel: (state = null, action)=> {
			if (action.Is(ACTTopLeftOpenPanelSet))
				return action.payload;
			return state;
		},
		topRightOpenPanel: (state = null, action)=> {
			if (action.Is(ACTTopRightOpenPanelSet))
				return action.payload;
			return state;
		},
		ratingUI: RatingUIReducer,
		notificationMessages: (state: NotificationMessage[] = [], action)=> {
			if (action.Is(ACTNotificationMessageAdd))
				return [...state, action.payload];
			if (action.Is(ACTNotificationMessageRemove))
				return state.filter(a=>a.id != action.payload);
			NotificationMessage.lastID = Math.max(NotificationMessage.lastID, state.length ? state.map(a=>a.id).Max(null, true) : -1);
			return state;
		},

		// pages (and nav-bar panels)
		// ==========

		stream: CombineReducers({subpage: SubpageReducer("stream")}),
		chat: CombineReducers({subpage: SubpageReducer("chat")}),
		reputation: CombineReducers({subpage: SubpageReducer("reputation")}),

		users: CombineReducers({subpage: SubpageReducer("users")}),
		forum: CombineReducers({subpage: SubpageReducer("forum")}),
		social: CombineReducers({subpage: SubpageReducer("social")}),
		more: CombineReducers({subpage: SubpageReducer("more")}),
		home: CombineReducers({subpage: SubpageReducer("home")}),
		content: ContentReducer,
		personal: CombineReducers({subpage: SubpageReducer("personal")}),
		debates: DebatesReducer,
		global: CombineReducers({subpage: SubpageReducer("global")}),

		search: CombineReducers({subpage: SubpageReducer("search")}),
		guide: CombineReducers({subpage: SubpageReducer("guide")}),
		profile: CombineReducers({subpage: SubpageReducer("profile")}),
		
		// maps
		// ==========

		openMap: (state = null, action)=> {
			if (action.type == LOCATION_CHANGED && URL.FromState(action.payload).pathNodes[0] == "global")
				return 1;
			/*if (action.Is(ACTOpenMapSet))
				return action.payload;*/
			return state;
		},
		mapViews: MapViewsReducer,
		copiedNodePath: (state = null as string, action)=> {
			if (action.Is(ACTNodeCopy))
				return action.payload.path;
			return state;
		},
		initialChildLimit: (state = 5, action)=> {
			if (action.Is(ACTSetInitialChildLimit)) return action.payload.value;
			return state;
		},
	});
	return MainReducer_Real(state, action);
}

// selectors
// ==========

export function GetOpenMapID() {
	return State(a=>a.main.openMap);
}