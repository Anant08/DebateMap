import {Vector2i} from "../../Frame/General/VectorStructs";
import Action from "../../Frame/General/Action";
import {FromJSON, ToJSON} from "../../Frame/General/Globals";
import {GetTreeNodesInObjTree, GetTreeNodesInPath, VisitTreeNodesInPath, TreeNode} from "../../Frame/V/V";
import {IsNumberString} from "../../Frame/General/Types";
import {A, Assert} from "../../Frame/General/Assert";
import {MapViews, MapView, MapNodeView} from "./mapViews/@MapViews";
import {ToInt} from "../../Frame/General/Types";
import {GetMap, GetRootNodeID} from "../firebase/maps";
import * as u from "updeep";
import {MapViewReducer, ACTMapViewMerge} from "./mapViews/$mapView";
import {ShallowChanged} from "../../Frame/UI/ReactGlobals";
import {DBPath} from "../../Frame/Database/DatabaseHelpers";
import {CreateDemoMapView} from "../../UI/Home/Home";
import {URL} from "../../Frame/General/URLs";
import {ACTDebateMapSelect, ACTDebateMapSelect_WithData} from "./debates";

export function MapViewsReducer(state = new MapViews(), action: Action<any>) {
	/*if (action.Is(ACTOpenMapSet))
		return {...state, [action.payload]: state[action.payload] || new MapView()};*/

	let newState = {...state};

	// if demo map-view not added, add it (I know... this is not the best way... :-| )
	if (newState[-100] == null)
		newState[-100] = CreateDemoMapView();
	if (action.type == "@@reactReduxFirebase/SET" && action["data"]) {
		let match = action["path"].match("^" + DBPath("maps") + "/([0-9]+)");
		// if map-data was just loaded
		if (match) {
			let mapID = parseInt(match[1]);
			// and no map-view exists for it yet, create one (by expanding root-node, and changing focus-node/view-offset)
			//if (GetMapView(mapID) == null) {
			//if (state[mapID].rootNodeViews.VKeys().length == 0) {
			if (newState[mapID] == null) {
				//newState[mapID] = new MapView();
				newState[mapID] = {
					rootNodeViews: {
						[action["data"].rootNode]: new MapNodeView().VSet({expanded: true, focused: true, viewOffset: new Vector2i(200, 0)})
					}
				};
			}
		}
	}
	if (action.Is(ACTDebateMapSelect_WithData)) {
		if (newState[action.payload.id] == null) {
			//newState[action.payload.id] = new MapView();
			newState[action.payload.id] = {
				rootNodeViews: {
					[action.payload.rootNodeID]: new MapNodeView().VSet({expanded: true, focused: true, viewOffset: new Vector2i(200, 0)})
				}
			};
		}
	}
	/*if (action.type == LOCATION_CHANGED && URL.FromState(action.payload).pathNodes[0] == "global") {
		let mapID = 1, rootNode = 1;
		// if no map-view exists for it yet, create one (by expanding root-node, and changing focus-node/view-offset)
		if (newState[mapID] == null) {
			newState[mapID] = {
				rootNodeViews: {
					[rootNode]: new MapNodeView().VSet({expanded: true, focused: true, viewOffset: new Vector2i(200, 0)})
				}
			};
		}
	}*/
	if (action.Is(ACTMapViewMerge)) {
		if (newState[action.payload.mapID] == null) {
			newState[action.payload.mapID] = action.payload.mapView;
		}
	}

	for (let key in newState) {
		newState[key] = MapViewReducer(newState[key], action, parseInt(key));
	}
	return ShallowChanged(newState, state) ? newState : state;
}

// selectors
// ==========

export function GetPathNodes(path: string) {
	let pathSegments = path.split("/");
	Assert(pathSegments.All(a=>IsNumberString(a)), `Path contains non-number segments: ${path}`);
	return pathSegments.map(ToInt);
}

export function GetSelectedNodePathNodes(mapViewOrMapID: number | MapView): number[] {
	let mapView = IsNumber(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return [];
	let selectedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "selected" && a.Value);
	if (selectedTreeNode == null) return [];

	let selectedNodeView = selectedTreeNode.ancestorNodes.Last();
	return selectedNodeView.PathNodes.Where(a=>a != "children").map(ToInt);
}
export function GetSelectedNodePath(mapViewOrMapID: number | MapView): string {
	return GetSelectedNodePathNodes(mapViewOrMapID).join("/");
}
export function GetSelectedNodeID(mapID: number): number {
	return GetSelectedNodePathNodes(mapID).LastOrX();
}

export function GetFocusedNodePathNodes(mapViewOrMapID: number | MapView): number[] {
	let mapView = IsNumber(mapViewOrMapID) ? GetMapView(mapViewOrMapID) : mapViewOrMapID;
	if (mapView == null) return [];
	let focusedTreeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "focused" && a.Value);
	if (focusedTreeNode == null) return [];

	let focusedNodeView = focusedTreeNode.ancestorNodes.Last();
	return focusedNodeView.PathNodes.Where(a=>a != "children").map(ToInt);
}
export function GetFocusedNodePath(mapViewOrMapID: number | MapView): string {
	return GetFocusedNodePathNodes(mapViewOrMapID).join("/");
}
export function GetFocusedNodeID(mapID: number): number {
	return GetFocusedNodePathNodes(mapID).LastOrX();
}

export function GetMapView(mapID: number): MapView {
	return State([a=>a.main.mapViews, mapID]);
}
export function GetNodeView(mapID: number, path: string): MapNodeView {
	let pathNodeIDs = GetPathNodes(path);
	// this has better perf than the simpler approaches
	let childPath = pathNodeIDs.map(childID=>`${childID}/children`).join("/").slice(0, -"/children".length);
	let storePath = `main/mapViews/${mapID}/rootNodeViews/${childPath}`;
	return State(storePath);
}
export function GetViewOffset(mapView: MapView): Vector2i {
	if (mapView == null) return null;
	let treeNode = GetTreeNodesInObjTree(mapView.rootNodeViews).FirstOrX(a=>a.prop == "viewOffset" && a.Value);
	return treeNode ? treeNode.Value : null;
}