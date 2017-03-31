import {ACTMapNodeSelect, ACTViewCenterChange, GetFocusNode, GetViewOffset} from "../../../Store/main/mapViews";
import {BaseComponent, FirebaseDatabase, FindDOM, FindReact} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {DBPath, FirebaseConnect, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger} from "../../../Frame/General/Globals_Free";
import {PropTypes} from "react";
import {Assert, Log} from "../../../Frame/Serialization/VDF/VDF";
import V from "../../../Frame/V/V";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {Vector2i, VRect} from "../../../Frame/General/VectorStructs";
import NodeUI from "./MapNode/NodeUI";
import ScrollView from "react-vscrollview";
import {GetDistanceBetweenRectAndPoint} from "../../../Frame/General/Geometry";
import NodeUI_Inner from "./MapNode/NodeUI_Inner";
//import ReactResizeDetector from "react-resize-detector"; // this one doesn't seem to work reliably -- at least for the map-ui
import ResizeSensor from "react-resize-sensor";
import {WaitXThenRun} from "../../../Frame/General/Timers";
import {MapNode} from "../../../Store/firebase/nodes/@MapNode";
import {Map} from "../../../Store/firebase/maps/@Map";
import {RootState} from "../../../Store/index";
import {GetMapView} from "../../../Store/main/mapViews";
import {GetUserID} from "../../../Store/firebase/users";

type Props = {map: Map} & Partial<{rootNode: MapNode, focusNode: string, viewOffset: {x: number, y: number}}>;
@FirebaseConnect(({map}: {map: Map})=> [
	map && `nodes/${map.rootNode}`,
].Where(a=>!!a))
@(connect((state: RootState, {map}: Props)=> ({
	rootNode: map && GetData(`nodes/${map.rootNode}`),
	/*focusNode: GetMapView(state, {map}) ? GetMapView(state, {map}).focusNode : null,
	viewOffset: GetMapView(state, {map}) ? GetMapView(state, {map}).viewOffset : null,*/
	/*focusNode_available: (GetMapView(state, {map}) && GetMapView(state, {map}).focusNode) != null,
	viewOffset_available: (GetMapView(state, {map}) && GetMapView(state, {map}).viewOffset) != null,*/
})) as any)
export default class MapUI extends BaseComponent<Props, {} | void> {
	downPos: Vector2i;

	hasLoadedScroll = false;
	render() {
		//let {map, rootNode, focusNode: focusNode_target, viewOffset: viewOffset_target} = this.props;
		let {map, rootNode} = this.props;
		if (map == null || GetUserID() == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading map...</div>;
		Assert(map._id, "map._id is null!");
		if (rootNode == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading root node...</div>;
		return (
			<ScrollView ref="scrollView" backgroundDrag={true} backgroundDragMatchFunc={a=>a == this.refs.content}
					scrollVBarStyle={{width: 10}} contentStyle={{willChange: "transform"}}
					onScrollEnd={pos=> {
						let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);

						let nodeUIInners = $(".NodeUI_Inner").ToList();
						let selectedNodeBox = nodeUIInners.FirstOrX(a=>FindReact(a[0]).props.node.selected);
						let focusNodeBox = selectedNodeBox || nodeUIInners.Min(nodeBox=>GetDistanceBetweenRectAndPoint(nodeBox.GetScreenRect(), viewCenter_onScreen));
						let focusNodeBoxComp = FindReact(focusNodeBox[0]) as NodeUI_Inner;

						let viewOffset = viewCenter_onScreen.Minus(focusNodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
						store.dispatch(new ACTViewCenterChange({mapID: focusNodeBoxComp.props.map._id, focusNode: focusNodeBoxComp.props.path, viewOffset}));
					}}>
				<div id="MapUI" ref="content"
						style={{
							position: "relative", display: "flex", padding: "150px 5000px 5000px 870px", whiteSpace: "nowrap",
							filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 10px)",
						}}
						onMouseDown={e=>this.downPos = new Vector2i(e.clientX, e.clientY)}
						onClick={e=> {
							if (e.target != this.refs.content) return;
							if (new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
							let mapView = store.getState().main.mapViews[store.getState().main.openMap];
							let isNodeSelected = GetTreeNodesInObjTree(mapView).Any(a=>a.prop == "selected" && a.Value);
							if (isNodeSelected)
								store.dispatch(new ACTMapNodeSelect({mapID: map._id, path: null}));
						}}
						onContextMenu={e=> {
							e.preventDefault();
						}}>
					<NodeUI map={map} node={rootNode} path={rootNode._id.toString()}/>
					{/*<ReactResizeDetector handleWidth handleHeight onResize={()=> {*/}
					<ResizeSensor onResize={()=> {
						if (this.hasLoadedScroll) return;
						let state = store.getState();
						let focusNode_target = GetFocusNode(GetMapView(map._id));
						let viewOffset_target = GetViewOffset(GetMapView(map._id));
						//Log(`Resizing:${focusNode_target};${viewOffset_target}`);
						if (focusNode_target == null || viewOffset_target == null) return;

						// load scroll from store
						let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
						let focusNodeBox = $(".NodeUI_Inner").ToList().FirstOrX(nodeBox=>(FindReact(nodeBox[0]) as NodeUI_Inner).props.path == focusNode_target);
						if (focusNodeBox == null) return;

						let viewOffset_current = viewCenter_onScreen.Minus(focusNodeBox.GetScreenRect().Position);

						let viewOffset_changeNeeded = new Vector2i(viewOffset_target).Minus(viewOffset_current);
						//Log("Loading!" + viewOffset_changeNeeded);
						/*this.refs.scrollView.refs.content.scrollLeft += viewOffset_changeNeeded.x;
						this.refs.scrollView.refs.content.scrollTop += viewOffset_changeNeeded.y;*/
						(this.refs.scrollView as ScrollView).ScrollBy(viewOffset_changeNeeded);
						this.hasLoadedScroll = true;
					}}/>
				</div>
			</ScrollView>
		);
	}
}

declare global { interface JQuery { ToList(): JQuery[]; }}
$.fn.ToList = function(this: JQuery) { return this.toArray().map(a=>$(a)); }
/*declare global { interface JQuery { PositionFrom(referenceControl: JQuery): Vector2i; }}
//$.fn.positionFrom = function(referenceControl, useCloneToCalculate = false) {
$.fn.PositionFrom = function(referenceControl) {
	/*if (useCloneToCalculate) { // 'this' must be descendent of 'referenceControl', for this code to work
		$(this).attr("positionFrom_temp_controlB", true);
		//$(this).data("positionFrom_temp_controlB", true);
		if (!$(this).parents().toArray().Contains(referenceControl[0]))
			throw new Error("'this' must be descendent of 'referenceControl'.");
		var referenceControl_clone = referenceControl.clone(true).appendTo("#hiddenTempHolder");
		var this_clone = referenceControl_clone.find("[positionFrom_temp_controlB]");
		//var this_clone = referenceControl_clone.find(":data(positionFrom_temp_controlB)");
		var result = this_clone.positionFrom(referenceControl_clone);
		referenceControl_clone.remove();
		$(this).attr("positionFrom_temp_controlB", null);
		//$(this).data("positionFrom_temp_controlB", null);
		return result;
	}*#/

	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return new Vector2i(offset.left - referenceControlOffset.left, offset.top - referenceControlOffset.top);
};*/
declare global { interface JQuery { GetOffsetRect(): VRect; }}
$.fn.GetOffsetRect = function(this: JQuery) {
	return new VRect(this[0].clientLeft, this[0].clientTop, this.outerWidth(), this.outerHeight());
};
declare global { interface JQuery { GetScreenRect(): VRect; }}
$.fn.GetScreenRect = function(this: JQuery) {
	var clientRect = this[0].getBoundingClientRect();
	return new VRect(clientRect.left, clientRect.top, clientRect.width, clientRect.height);
};