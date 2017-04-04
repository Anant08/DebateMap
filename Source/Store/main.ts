import {ToInt} from "../Frame/General/Types";
import {CombineReducers, RootState} from "./index";
import {MapViews, MapNodeView, MapView} from "./main/mapViews/@MapViews";
import {combineReducers} from "redux";
import {firebaseStateReducer} from "react-redux-firebase";
import {reducer as formReducer} from "redux-form";
import {ACTMessageBoxShow, MessageBoxOptions} from "../Frame/UI/VMessageBox";
import Action from "../Frame/General/Action";
import {routerReducer} from "react-router-redux";
import {ToJSON, FromJSON, Debugger} from "../Frame/General/Globals";
import V from "../Frame/V/V";
import {Map} from "../Store/firebase/maps/@Map";
import {createSelector} from "reselect";
import {GetTreeNodesInObjTree} from "../Frame/V/V";
import {ProcessAction} from "../Frame/Store/ActionProcessor";
import {CachedTransform} from "../Frame/V/VCache";
import {MapViewsReducer} from "./main/mapViews";
import {RatingUIReducer, RatingUIState} from "./main/ratingUI";
import NotificationMessage from "./main/@NotificationMessage";

// class is used only for initialization
export class MainState {
	topLeftOpenPanel: string;
	topRightOpenPanel: string;
	ratingUI: RatingUIState;
	notificationMessages: NotificationMessage[];

	openMap: number;
	mapViews: MapViews;
	copiedNode: number;
}
export class ACTTopLeftOpenPanelSet extends Action<string> {}
export class ACTTopRightOpenPanelSet extends Action<string> {}
export class ACTNotificationMessageAdd extends Action<NotificationMessage> {}
export class ACTNotificationMessageRemove extends Action<number> {}
export class ACTNodeCopy extends Action<number> {}

let MainReducer_Real;
export function MainReducer(state, action) {
	MainReducer_Real = MainReducer_Real || CombineReducers({
		_: (state = null, action)=> {
			ProcessAction(action);
			return null;
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
		notificationMessages: (state = [] as NotificationMessage[], action)=> {
			if (action.Is(ACTNotificationMessageAdd))
				return [...state, action.payload];
			if (action.Is(ACTNotificationMessageRemove))
				return state.filter(a=>a.id != action.payload);
			NotificationMessage.lastID = Math.max(NotificationMessage.lastID, state.length ? state.map(a=>a.id).Max() : -1);
			return state;
		},
		openMap: (state = null, action)=> {
			if (action.type == "@@router/LOCATION_CHANGE" && action.payload.pathname == "/global")
				return 1;
			return state;
		},
		mapViews: MapViewsReducer,
		copiedNode: (state = null as number, action)=> {
			if (action.Is(ACTNodeCopy))
				return action.payload;
			return state;
		}
	});
	return MainReducer_Real(state, action);
}

// selectors
// ==========

export function GetOpenMapID() {
	return State().main.openMap;
}