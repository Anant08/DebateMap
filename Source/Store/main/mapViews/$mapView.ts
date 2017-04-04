import {CombineReducers} from "../../index";
import {RootNodeViewsReducer} from "./$mapView/rootNodeViews";
import Action from "../../../Frame/General/Action";
import {MapView} from "./@MapViews";
import {Equals_Shallow} from "../../../Frame/UI/ReactGlobals";
import {FromJSON, ToJSON} from "../../../Frame/General/Globals";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {IsPrimitive} from "../../../Frame/General/Types";
import u from "updeep";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";

/*export let MapViewReducer = CombineReducers(()=>({rootNodeViews: {}}), {
	rootNodeViews: RootNodeViewsReducer,
});*/

export class ACTMapViewMerge extends Action<{mapView: MapView}> {}

export function MapViewReducer(state = {rootNodeViews: {}}, action: Action<any>) {
	if (action.Is(ACTMapViewMerge)) {
		let newState = state;
		let updatePrimitiveTreeNodes = GetTreeNodesInObjTree(action.payload.mapView).Where(a=>IsPrimitive(a.Value) || a.Value == null);
		for (let updatedNode of updatePrimitiveTreeNodes)
			newState = u.updateIn(updatedNode.PathStr_Updeep, updatedNode.Value, newState);
		return newState;
	}

	let newState = {...state, rootNodeViews: RootNodeViewsReducer(state.rootNodeViews, action)};
	if (!Equals_Shallow(state, newState))
		return newState;
	return state;
}