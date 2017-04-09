import {GetFocusNode, GetViewOffset, GetSelectedNodePath} from "../../../Store/main/mapViews";
import {BaseComponent, FindDOM, FindReact} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
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
import {WaitXThenRun, Timer} from "../../../Frame/General/Timers";
import {MapNode} from "../../../Store/firebase/nodes/@MapNode";
import {Map} from "../../../Store/firebase/maps/@Map";
import {RootState} from "../../../Store/index";
import {GetMapView} from "../../../Store/main/mapViews";
import {GetUserID} from "../../../Store/firebase/users";
import {ACTMapNodeSelect, ACTViewCenterChange} from "../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../Frame/Database/FirebaseConnect";

export function GetNodeBoxForPath(path: string) {
	return $(".NodeUI_Inner").ToList().FirstOrX(a=>FindReact(a[0]).props.path == path);
}
export function GetNodeBoxClosestToViewCenter() {
	let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return $(".NodeUI_Inner").ToList().Min(nodeBox=>GetDistanceBetweenRectAndPoint(nodeBox.GetScreenRect(), viewCenter_onScreen));
}
export function GetViewOffsetForNodeBox(nodeBox: JQuery) {
	let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
	return viewCenter_onScreen.Minus(nodeBox.GetScreenRect().Position).NewX(x=>x.RoundTo(1)).NewY(y=>y.RoundTo(1));
}

export function UpdateFocusNodeAndViewOffset(mapID: number) {
	let selectedNodePath = GetSelectedNodePath(mapID);
	let focusNodeBox = selectedNodePath ? GetNodeBoxForPath(selectedNodePath) : GetNodeBoxClosestToViewCenter();
	if (focusNodeBox == null) return; // can happen if node was just deleted
	let focusNodeBoxComp = FindReact(focusNodeBox[0]) as NodeUI_Inner;
	let viewOffset = GetViewOffsetForNodeBox(focusNodeBox);
	store.dispatch(new ACTViewCenterChange({mapID, focusNode: focusNodeBoxComp.props.path, viewOffset}));
}

type Props = {map: Map} & Partial<{rootNode: MapNode, focusNode: string, viewOffset: {x: number, y: number}}>;
@Connect((state: RootState, {map}: Props)=> ({
	rootNode: map && GetData(`nodes/${map.rootNode}`),
	/*focusNode: GetMapView(state, {map}) ? GetMapView(state, {map}).focusNode : null,
	viewOffset: GetMapView(state, {map}) ? GetMapView(state, {map}).viewOffset : null,*/
	/*focusNode_available: (GetMapView(state, {map}) && GetMapView(state, {map}).focusNode) != null,
	viewOffset_available: (GetMapView(state, {map}) && GetMapView(state, {map}).viewOffset) != null,*/
}))
export default class MapUI extends BaseComponent<Props, {} | void> {
	static padding = {topAndBottom: 1000, leftAndRight: 2000};

	downPos: Vector2i;

	render() {
		//let {map, rootNode, focusNode: focusNode_target, viewOffset: viewOffset_target} = this.props;
		let {map, rootNode} = this.props;
		if (map == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading map...</div>;
		Assert(map._id, "map._id is null!");
		if (rootNode == null)
			return <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 25}}>Loading root node...</div>;
		return (
			<ScrollView ref="scrollView" backgroundDrag={true} backgroundDragMatchFunc={a=>a == FindDOM(this.refs.scrollView.refs.content) || a == this.refs.content}
					scrollVBarStyle={{width: 10}} contentStyle={{willChange: "transform"}}
					onScrollEnd={pos=> {
						UpdateFocusNodeAndViewOffset(map._id);
					}}>
				<style>{`
				.MapUI > :first-child:after {
					content: ".";
					font-size: 0;
					opacity: 0;
					visibility: hidden;
					display: block;
					height: ${MapUI.padding.topAndBottom}px;
					width: 100%;
					margin-right: ${MapUI.padding.leftAndRight}px;
					pointer-events: none;
				}
				`}</style>
				<div className="MapUI" ref="content"
						style={{
							position: "relative", display: "flex", padding: `${MapUI.padding.topAndBottom}px ${MapUI.padding.leftAndRight}px`, whiteSpace: "nowrap",
							filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))",
						}}
						onMouseDown={e=>this.downPos = new Vector2i(e.clientX, e.clientY)}
						onClick={e=> {
							if (e.target != this.refs.content) return;
							if (new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
							let mapView = store.getState().main.mapViews[store.getState().main.openMap];
							let isNodeSelected = GetTreeNodesInObjTree(mapView).Any(a=>a.prop == "selected" && a.Value);
							if (isNodeSelected) {
								store.dispatch(new ACTMapNodeSelect({mapID: map._id, path: null}));
								UpdateFocusNodeAndViewOffset(map._id);
							}
						}}
						onContextMenu={e=> {
							e.preventDefault();
						}}>
					<NodeUI map={map} node={rootNode} path={rootNode._id.toString()}/>
					{/*<ReactResizeDetector handleWidth handleHeight onResize={()=> {*/}
					{/*<ResizeSensor ref="resizeSensor" onResize={()=> {
						this.LoadScroll();
					}}/>*/}
				</div>
			</ScrollView>
		);
	}

	ComponentDidMount() {
		let lastRenderCount = 0;
		let timer = new Timer(100, ()=> {
			if (!this.mounted) return timer.Stop();

			// if more nodes have been rendered (ie, new nodes have come in)
			if (NodeUI.renderCount > lastRenderCount)
				this.LoadScroll();
			lastRenderCount = NodeUI.renderCount;

			let timeSinceLastNodeUIRender = Date.now() - NodeUI.lastRenderTime;
			if (NodeUI.renderCount > 0 && timeSinceLastNodeUIRender >= 1500) {
				this.OnLoadComplete();
				timer.Stop();
			}
		}).Start();

		// start scroll at root // (this doesn't actually look as good)
		/*if (this.refs.scrollView)
			(this.refs.scrollView as ScrollView).ScrollBy({x: MapUI.padding.leftAndRight, y: MapUI.padding.topAndBottom});*/
	}
	OnLoadComplete() {
		console.log(`NodeUI render count: ${NodeUI.renderCount} (${NodeUI.renderCount / $(".NodeUI").length} per visible node)`);
		this.LoadScroll();
	}

	/*PostRender() {
		let {map, rootNode} = this.props;
		if (map == null || rootNode == null) return;
		this.StartLoadingScroll();
	}
	hasLoadedScroll = false;
	StartLoadingScroll() {
		let timer = new Timer(200, ()=> {
			if (!this.mounted) return timer.Stop();
			this.LoadScroll();
			if (this.hasLoadedScroll) {
				//WaitXThenRun(0, this.LoadScroll, 300); // do it once more, in case of ui late-tweak
				timer.Stop();
			}
		}).Start();
		WaitXThenRun(10000, ()=>timer.Stop()); // stop trying after 10s
	}*/

	// load scroll from store
	LoadScroll() {
		let {map, rootNode} = this.props;
		if (this.refs.scrollView == null) return;

		// if user is already scrolling manually, return so we don't interrupt that process
		if ((this.refs.scrollView as ScrollView).state.scrollOp_bar) return;

		let state = store.getState();
		let focusNode_target = GetFocusNode(GetMapView(map._id)); // || map.rootNode.toString();
		let viewOffset_target = GetViewOffset(GetMapView(map._id)); // || new Vector2i(200, 0);
		//Log(`Resizing:${focusNode_target};${viewOffset_target}`);
		if (focusNode_target == null || viewOffset_target == null) return;

		let focusNodeBox;
		let nextPathTry = focusNode_target;
		while (true) {
			focusNodeBox = $(".NodeUI_Inner").ToList().FirstOrX(nodeBox=>(FindReact(nodeBox[0]) as NodeUI_Inner).props.path == nextPathTry);
			if (focusNodeBox || !nextPathTry.Contains("/")) break;
			nextPathTry = nextPathTry.substr(0, nextPathTry.lastIndexOf("/"));
		}
		if (focusNodeBox == null) return;

		let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
		let viewOffset_current = viewCenter_onScreen.Minus(focusNodeBox.GetScreenRect().Position);
		let viewOffset_changeNeeded = new Vector2i(viewOffset_target).Minus(viewOffset_current);
		(this.refs.scrollView as ScrollView).ScrollBy(viewOffset_changeNeeded);
		//Log("Loading scroll: " + Vector2i.prototype.toString.call(viewOffset_target));

		/*if (nextPathTry == focusNode_target)
			this.hasLoadedScroll = true;*/
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