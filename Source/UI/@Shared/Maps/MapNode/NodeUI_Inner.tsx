import {connect} from "react-redux";
import {BaseComponent, Div, AddGlobalStyle, Pre} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_LeftBox from "./NodeUI_LeftBox";
import VMenu from "react-vmenu";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN, E, Debugger} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import Button from "../../../../Frame/ReactComponents/Button";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import * as keycode from "keycode";
import NodeUI_Menu from "./NodeUI_Menu";
import V from "../../../../Frame/V/V";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeRatingsRoot, GetRatings, GetFillPercentForRatingAverage, GetRatingAverage, GetRatingValue} from "../../../../Store/firebase/nodeRatings";
import {GetUserID} from "../../../../Store/firebase/users";
import {MapNodeType_Info, MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RootState} from "../../../../Store/index";
import {RatingType_Info, RatingType} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {ACTMapNodeSelect, ACTMapNodeExpandedSet} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import Column from "../../../../Frame/ReactComponents/Column";
import DefinitionsPanel from "./NodeUI/DefinitionsPanel";
import QuestionsPanel from "./NodeUI/QuestionsPanel";
import TagsPanel from "./NodeUI/TagsPanel";
import DetailsPanel from "./NodeUI/DetailsPanel";
import OthersPanel from "./NodeUI/OthersPanel";
import SocialPanel from "./NodeUI/SocialPanel";
import RatingsPanel from "./NodeUI/RatingsPanel";
import DiscussionPanel from "./NodeUI/DiscussionPanel";
import Row from "../../../../Frame/ReactComponents/Row";
import VReactMarkdown from "../../../../Frame/ReactComponents/VReactMarkdown";
import {GetFontSizeForNode, GetPaddingForNode, GetNodeDisplayText, GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";
import {ContentNode, SourceChain} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {URL} from "../../../../Frame/General/URLs";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";

/*AddGlobalStyle(`
.NodeUI_Inner
`);*/

type Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number, widthOverride?: number}
	& Partial<{ratingsRoot: RatingsRoot, mainRating_average: number, userID: string}>;
//@FirebaseConnect((props: Props)=>((props[`holder`] = props[`holder`] || {}), [
/*@FirebaseConnect((props: Props)=>[
	...GetPaths_NodeRatingsRoot(props.node._id),
])*/
@Connect(()=> {
	return (state: RootState, {node, ratingsRoot}: Props)=> ({
		ratingsRoot: GetNodeRatingsRoot(node._id),
		mainRating_average: GetRatingAverage(node._id, GetRatingTypesForNode(node).FirstOrX(null, {}).type),
		userID: GetUserID(),
	});
})
export default class NodeUI_Inner extends BaseComponent<Props, {hovered: boolean, openPanel_preview: string}> {
	render() {
		let {map, node, nodeView, path, width, widthOverride, ratingsRoot, mainRating_average, userID} = this.props;
		let firebase = store.firebase.helpers;
		let {hovered, openPanel_preview} = this.state;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];
		let barSize = 5;
		let pathNodeIDs = path.split(`/`).Select(a=>parseInt(a));
		//let parentNode = GetParentNode(path);

		let mainRating_mine = GetRatingValue(node._id, GetRatingTypesForNode(node).FirstOrX(null, {}).type, userID);
		let mainRating_fillPercent = GetFillPercentForRatingAverage(node, mainRating_average);
		let mainRating_myFillPercent = mainRating_mine != null ? GetFillPercentForRatingAverage(node, mainRating_mine) : null;

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = openPanel_preview || (nodeView && nodeView.openPanel);
		let subPanelShow = node.type == MapNodeType.Thesis && node.contentNode;
		let bottomPanelShow = leftPanelShow && panelToShow;
		let expanded = nodeView && nodeView.expanded;

		return (
			<div className={`NodeUI_Inner${pathNodeIDs.length == 0 ? ` root` : ``}`} style={{
						display: `flex`, position: `relative`, borderRadius: 5, cursor: `default`,
						boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, width, minWidth: widthOverride,
					}}
					onMouseEnter={()=>$(`.scrolling`).length == 0 && this.SetState({hovered: true})}
					onMouseLeave={()=>this.SetState({hovered: false})}
					onClick={e=> {
						if ((e.nativeEvent as any).ignore) return;
						if (nodeView == null || !nodeView.selected) {
							store.dispatch(new ACTMapNodeSelect({mapID: map._id, path}));
						}
					}}>
				{leftPanelShow &&
					<MapNodeUI_LeftBox parent={this} map={map} path={path} node={node} nodeView={nodeView} ratingsRoot={ratingsRoot}
						backgroundColor={nodeTypeInfo.backgroundColor} asHover={hovered}/>}
				{/* fixes click-gap */}
				{leftPanelShow && <div style={{position: `absolute`, right: `100%`, width: 1, top: 0, bottom: 0}}/>}

				<div style={{display: `flex`, width: `100%`, background: `rgba(0,0,0,.7)`, borderRadius: 5, cursor: `pointer`}}>
					<Div style={{position: `relative`, width: `100%`, padding: GetPaddingForNode(node)}}>
						<div style={{
							position: `absolute`, left: 0, top: 0, bottom: 0,
							width: mainRating_fillPercent + `%`, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`, borderRadius: `5px 0 0 5px`
						}}/>
						{mainRating_mine != null &&
							<div style={{
								position: `absolute`, left: mainRating_myFillPercent + `%`, top: 0, bottom: 0,
								width: 2, background: `rgba(0,255,0,.5)`,
							}}/>}
						<span style={{position: `relative`, fontSize: GetFontSizeForNode(node), whiteSpace: `initial`}}>
							{GetNodeDisplayText(node, path)}
						</span>
						{node.type == MapNodeType.Thesis && node.contentNode &&
							<InfoButton text="Allowed exceptions are: bold and [...] (collapsed segments)"/>}
						{subPanelShow && <SubPanel node={node}/>}
						<NodeUI_Menu node={node} path={path}/>
					</Div>
					<Button //text={expanded ? `-` : `+`} size={28}
							style={{
								display: `flex`, justifyContent: `center`, alignItems: `center`, borderRadius: `0 5px 5px 0`,
								width: 18, padding: 0,
								fontSize: expanded ? 23 : 17,
								lineHeight: `1px`, // keeps text from making meta-theses too tall
								backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(`,`).map(a=>(parseInt(a) * .8).RoundTo(1)).join(`,`)},.7)`,
								boxShadow: `none`,
								":hover": {backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(`,`).map(a=>(parseInt(a) * .9).RoundTo(1)).join(`,`)},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path, expanded: !expanded, recursive: expanded && e.altKey}));
								e.nativeEvent.ignore = true; // for some reason, `return false` isn't working
								//return false;
							}}>
						{expanded ? `-` : `+`}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: `absolute`, top: `calc(100% + 1px)`, width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
								padding: 5, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
							}}>
						<div style={{position: `absolute`, left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
						{RatingType_Info.for[panelToShow] && (()=> {
							let ratings = GetRatings(node._id, panelToShow as RatingType);
							return <RatingsPanel node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
						})()}
						{panelToShow == `definitions` && <DefinitionsPanel/>}
						{panelToShow == `discussion` && <DiscussionPanel/>}
						{panelToShow == `social` && <SocialPanel/>}
						{panelToShow == `tags` && <TagsPanel/>}
						{panelToShow == `details` && <DetailsPanel node={node} path={path} userID={userID}/>}
						{panelToShow == `others` && <OthersPanel/>}
					</div>}
			</div>
		);
	}
}

class SubPanel extends BaseComponent<{node: MapNode}, {}> {
	render() {
		let {node} = this.props;
		return (
			<div style={{position: `relative`, margin: `5px -5px -5px -5px`, padding: `6px 5px 5px 5px`,
				//border: `solid rgba(0,0,0,.5)`, borderWidth: `1px 0 0 0`
				background: `rgba(0,0,0,.5)`, borderRadius: `0 0 0 5px`,
			}}>
				<SubPanel_Inner contentNode={node.contentNode} fontSize={GetFontSizeForNode(node)}/>
			</div>
		);
	}
}
export class SubPanel_Inner extends BaseComponent<{contentNode: ContentNode, fontSize: number}, {}> {
	render() {
		let {contentNode, fontSize} = this.props;
		return (
			<div style={{position: `relative`, fontSize, whiteSpace: `initial`}}>
				{/*<div>{``${node.quote.text}``}</div>*/}
				<VReactMarkdown className="selectable Markdown" source={`"${contentNode.content}"`}
					containerProps={{style: E()}}
					renderers={{
						Text: props=> {
							//return <span {...props}>{props.literal}</span>;
							//return React.DOM.span(null, props.literal, props);
							//return React.createElement(`section`, props.Excluding(`literal`, `nodeKey`), props.literal);
							return `[text]` as any;
						},
						Link: props=><span/>,
					}}
				/>
				<SourcesUI contentNode={contentNode}/>
			</div>
		);
	}
}

export class SourcesUI extends BaseComponent<{contentNode: ContentNode}, {}> {
	render() {
		let {contentNode} = this.props;
		return (
			<Column mt={3}>
				<Row style={{color: "rgba(255,255,255,.5)"}}>Sources:</Row>
				{contentNode.sourceChains.map((chain: SourceChain, index)=> {
					let linkTitle = chain.map((source, index)=> {
						if (source.link) {
							// if this is the first source, it's the most important, so show the link's whole url
							if (index == 0) {
								return URL.Parse(source.link, false).toString({domain_protocol: false, forceSlashAfterDomain: false});
							}
							// else, show just the domain-name
							let urlMatch = source.link.match(/https?:\/\/(?:www\.)?([^/]+)/);
							if (urlMatch == null) return source.link; // temp, while updating data
							return urlMatch[1];
						}
						return (source.name || "") + (source.author ? ` (${source.author})` : ""); 
					}).join(" <- ");
					return (
						<Row key={index}>
							<a href={chain.Last().link} style={{wordBreak: "break-word"}} onContextMenu={e=>e.nativeEvent["passThrough"] = true}>{linkTitle}</a>
						</Row>
					);
				})}	
			</Column>
		);
	}
}