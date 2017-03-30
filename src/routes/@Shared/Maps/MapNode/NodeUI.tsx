import {BaseComponent, Div, Span, Instant, FindDOM, SimpleShouldUpdate, BaseProps, GetInnerComp, ShallowCompare, RenderSource, FindDOM_} from "../../../../Frame/UI/ReactGlobals";
import {MapNode} from "../MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath, GetData} from "../../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, E, GetTimeSinceLoad} from "../../../../Frame/General/Globals_Free";
import Button from "../../../../Frame/ReactComponents/Button";
import {PropTypes, Component} from "react";
import Action from "../../../../Frame/General/Action";
import {Map} from "../Map";
import {Log} from "../../../../Frame/General/Logging";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import V from "../../../../Frame/V/V";
import * as VMenuTest1 from "react-vmenu";
import VMenu, {VMenuItem} from "react-vmenu";
import Select from "../../../../Frame/ReactComponents/Select";
import {GetEntries} from "../../../../Frame/General/Enums";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN, ToJSON} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {createSelector} from "reselect";
import NodeUI_Inner from "./NodeUI_Inner";
import {createMarkupForStyles} from "react/lib/CSSPropertyOperations";
import NodeConnectorBackground from "./NodeConnectorBackground";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {MapNodeType_Info, MapNodeType} from "../MapNodeType";
import {MakeGetNodeChildIDs, FirebaseConnect, GetNodeChildren} from "../../../../store/Root/Firebase";
import {MakeGetNodeView} from "../../../../store/Root/Main";
import {RootState} from "../../../../store/Root";
import {MapNodeView} from "../../../../store/Root/Main/MapViews";

// modified version which only requests paths that do not yet exist in the store
/*export function FirebaseConnect(innerFirebaseConnect) {
	return firebaseConnect(props=> {
		let firebase = store.getState().firebase;

		let innerPaths = innerFirebaseConnect(props) as string[];
		// if inner-paths are all already loaded, don't request the paths this time
		let innerPaths_unrequested = innerPaths.Where(path=>GetData(firebase, path) == null);
		/*Log(innerPaths.length + ";" + innerPaths_unrequested.length + "\n" + innerPaths + "\n" + innerPaths_unrequested);
		if (GetTimeSinceLoad() > 5)
			debugger;*#/
		return innerPaths_unrequested;
	});
}*/

type Props = {map: Map, node: MapNode, path?: string, widthOverride?: number, onHeightOrPosChange?: ()=>void} & Partial<{nodeView: MapNodeView, nodeChildren: MapNode[]}>;
type State = {hasBeenExpanded: boolean, childrenWidthOverride: number, childrenCenterY: number, svgInfo: {mainBoxOffset: Vector2i, oldChildBoxOffsets: Vector2i[]}};
@FirebaseConnect(({node}: {node: MapNode})=>[
	...MakeGetNodeChildIDs()({}, {node}).Select(a=>`nodes/${a}`)
])
@(connect(()=> {
	var getNodeView = MakeGetNodeView();
	return ((state: RootState, {node, path, map}: Props & BaseProps)=> {
		var path = path || node._id.toString();
		var firebase = store.getState().firebase;
		let nodeChildren = GetNodeChildren(node);
		return {
			path,
			nodeView: getNodeView(state, {firebase, map, path}),
			nodeChildren: CachedTransform({nodeID: node._id}, nodeChildren, ()=>nodeChildren.All(a=>a != null) ? nodeChildren : []), // only pass nodeChildren when all are loaded
		};
	}) as any;
}) as any)
export default class NodeUI extends BaseComponent<Props, State> {
	constructor(props) {
		super(props);
		this.state = {svgInfo: {}} as any;
	}
	ComponentWillReceiveProps(newProps) {
		let {nodeView} = newProps;
		if (nodeView && nodeView.expanded)
			this.SetState({hasBeenExpanded: true});
	}

	render() {
		let {map, node, path, widthOverride, nodeView, nodeChildren, children} = this.props;
		let {hasBeenExpanded, childrenWidthOverride, childrenCenterY, svgInfo} = this.state;
		//Log(`Updating NodeUI (${RenderSource[this.lastRender_source]}):${node._id};PropsChanged:${this.GetPropsChanged()};StateChanged:${this.GetStateChanged()}`);

		let separateChildren = node.type == MapNodeType.Thesis;
		let upChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.SupportingArgument) : [];
		let downChildren = node.type == MapNodeType.Thesis ? nodeChildren.Where(a=>a.type == MapNodeType.OpposingArgument) : [];

		let {width, expectedHeight} = this.GetMeasurementInfo(this.props, this.state);
		let innerBoxOffset = ((childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);

		this.childBoxes = [];
		return (
			<div className="NodeUI clickThrough" style={{position: "relative", display: "flex", alignItems: "flex-start", padding: "5px 0", opacity: widthOverride != 0 ? 1 : 0}}>
				<div ref="innerBoxHolder" className="innerBoxHolder clickThrough" style={{
					paddingTop: innerBoxOffset,
				}}>
					<NodeUI_Inner ref="innerBox" /*ref={c=>(this as any).innerBox = c}*/ map={map} node={node} nodeView={nodeView} path={path} width={width} widthOverride={widthOverride}/>
				</div>
				{hasBeenExpanded && !separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={nodeChildren} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						{nodeChildren.map((child, index)=> {
							return <NodeUI key={index} ref={c=>this.childBoxes.push(c)} map={map} node={child}
								path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
						})}
					</div>}
				{hasBeenExpanded && separateChildren &&
					<div ref="childHolder" className="childHolder clickThrough" style={{
						display: nodeView && nodeView.expanded ? "flex" : "none", flexDirection: "column", marginLeft: 30,
						//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: nodeView && nodeView.expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
					}}>
						{svgInfo.mainBoxOffset &&
							<NodeConnectorBackground node={node} mainBoxOffset={svgInfo.mainBoxOffset} shouldUpdate={this.lastRender_source == RenderSource.SetState}
								childNodes={upChildren.concat(downChildren)} childBoxOffsets={svgInfo.oldChildBoxOffsets}/>}
						<div ref="upChildHolder" className="upChildHolder clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{upChildren.map((child, index)=> {
								return <NodeUI key={"up_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child}
									path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
							})}
						</div>
						<div ref="downChildHolder" className="clickThrough" style={{display: "flex", flexDirection: "column"}}>
							{downChildren.map((child, index)=> {
								return <NodeUI key={"down_" + index} ref={c=>this.childBoxes.push(c)} map={map} node={child}
									path={path + "/" + child._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}/>;
							})}
						</div>
					</div>}
			</div>
		);
	}
	childBoxes: NodeUI[];

	GetMeasurementInfo(props: Props, state: State) {
		let {node} = this.props;

		let fontSize = MapNode.GetFontSize(node);
		let expectedTextWidth = V.GetContentWidth($(`<a style='${createMarkupForStyles({fontSize, whiteSpace: "nowrap"})}'>${node.title}</a>`));
		//let expectedOtherStuffWidth = 26;
		let expectedOtherStuffWidth = 28;
		let expectedBoxWidth = expectedTextWidth + expectedOtherStuffWidth;

		let nodeTypeInfo = MapNodeType_Info.for[node.type];
		let width = expectedBoxWidth.KeepBetween(nodeTypeInfo.minWidth, nodeTypeInfo.maxWidth);

		let maxTextWidth = width - expectedOtherStuffWidth;
		let expectedTextHeight = V.GetContentHeight($(`<a style='${
			createMarkupForStyles({fontSize, whiteSpace: "initial", display: "inline-block", width: maxTextWidth})
		}'>${node.title}</a>`));
		let expectedHeight = expectedTextHeight + 10; // * + top-plus-bottom-padding
		//this.Extend({expectedTextWidth, maxTextWidth, expectedTextHeight, expectedHeight}); // for debugging

		return {width, expectedHeight};
	}

	lastHeight = 0;
	lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = FindDOM_(this).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (height != this.lastHeight || pos != this.lastPos) {
			this.OnHeightOrPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
		this.lastPos = pos;
	}
	onHeightOrPosChangeQueued = false;
	OnChildHeightOrPosChange() {
		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.onHeightOrPosChangeQueued) {
			this.onHeightOrPosChangeQueued = true;
			requestAnimationFrame(()=> {
				this.OnHeightOrPosChange();
				this.onHeightOrPosChangeQueued = false;
			});
		}
	}

	OnHeightOrPosChange() {
		//Log(`OnHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id};centerY:${this.state.childrenCenterY}`);
		this.UpdateState(true);
		let {onHeightOrPosChange} = this.props;
		if (onHeightOrPosChange) onHeightOrPosChange();
	}
	UpdateState(forceUpdate = false) {
		let {nodeView} = this.props;
		//let {childHolder, upChildHolder} = this.refs;
		let childHolder = FindDOM_(this).children(".childHolder");
		let upChildHolder = childHolder.children(".upChildHolder");

		let newState = E(
			nodeView && nodeView.expanded &&
				{childrenWidthOverride: this.childBoxes.Any(a=>a != null)
					? this.childBoxes.Where(a=>a != null).Select(a=> {
						var childDOM = FindDOM(GetInnerComp(a).refs.innerBox);
						var oldMinWidth = childDOM.style.minWidth;
						childDOM.style.minWidth = 0 + "px";
						var result = childDOM.clientWidth;
						childDOM.style.minWidth = oldMinWidth;
						return result;
					}).Max()
					: 0},
			/*{childrenCenterY: upChildHolder
				? (upChildHolder && upChildHolder.style.display != "none" ? upChildHolder.clientHeight : 0)
				: (childHolder && childHolder.style.display != "none" ? childHolder.clientHeight / 2 : 0)}*/
			{childrenCenterY: upChildHolder.length
				? (upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0)
				: (childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0)}
		) as State;

		let {expectedHeight} = this.GetMeasurementInfo(this.props, E(this.state, newState) as State);

		let innerBoxOffset = ((newState.childrenCenterY|0) - (expectedHeight / 2)).KeepAtLeast(0);
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		if (this.refs.childHolder) {
			let holderOffset = new Vector2i(FindDOM_(this.refs.childHolder).offset());
			let innerBox = FindDOM_(this.refs.innerBox);
			//var mainBoxOffset = new Vector2i(innerBox.offset()).Minus(holderOffset);
			let mainBoxOffset = new Vector2i(0, innerBoxOffset);
			//mainBoxOffset = mainBoxOffset.Plus(new Vector2i(innerBox.width(), innerBox.outerHeight() / 2));
			mainBoxOffset = mainBoxOffset.Plus(new Vector2i(-30, innerBox.outerHeight() / 2));
			let oldChildBoxOffsets = this.childBoxes.Where(a=>a != null).Select(child=> {
				let childBox = FindDOM_(child).find("> div:first-child > div"); // get inner-box of child
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			newState.svgInfo = {mainBoxOffset, oldChildBoxOffsets};
		}

		var changedState = this.SetState(newState, null, !forceUpdate);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
}

/*interface JQuery {
	positionFrom(referenceControl): void;
}*/
/*setTimeout(()=>$.fn.positionFrom = function(referenceControl) {
	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return {left: offset.left - referenceControlOffset.left, top: offset.top - referenceControlOffset.top};
});*/