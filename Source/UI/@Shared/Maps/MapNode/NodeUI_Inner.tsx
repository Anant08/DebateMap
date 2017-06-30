import {Image} from "../../../../Store/firebase/images/@Image";
import {GetImage} from "../../../../Store/firebase/images";
import {connect} from "react-redux";
import { BaseComponent, Div, AddGlobalStyle, Pre, GetInnerComp, FindDOM_ } from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_LeftBox from "./NodeUI_LeftBox";
import VMenu from "react-vmenu";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN, Debugger} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import Button from "../../../../Frame/ReactComponents/Button";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import keycode from "keycode";
import NodeUI_Menu from "./NodeUI_Menu";
import V from "../../../../Frame/V/V";
import {RatingsRoot} from "../../../../Store/firebase/nodeRatings/@RatingsRoot";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {ImageAttachment, MapNode, MapNodeEnhanced, ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeRatingsRoot, GetRatings, GetFillPercentForRatingAverage, GetRatingAverage, GetRatingValue, ShouldRatingTypeBeReversed} from "../../../../Store/firebase/nodeRatings";
import {GetUserID} from "../../../../Store/firebase/users";
import {MapNodeType_Info, MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";
import {RootState} from "../../../../Store/index";
import {RatingType_Info, RatingType} from "../../../../Store/firebase/nodeRatings/@RatingType";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {ACTMapNodeSelect, ACTMapNodeExpandedSet, ACTMapNodePanelOpen, ACTMapNodeTermOpen} from "../../../../Store/main/mapViews/$mapView/rootNodeViews";
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
import {GetFontSizeForNode, GetPaddingForNode, GetNodeDisplayText, GetRatingTypesForNode, GetNodeForm, GetFinalNodeTypeAtPath, IsContextReversed, GetNodeEnhanced} from "../../../../Store/firebase/nodes/$node";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {URL} from "../../../../Frame/General/URLs";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import {GetTerm, GetTermVariantNumber} from "../../../../Store/firebase/terms";
import {Term} from "../../../../Store/firebase/terms/@Term";
import {ParseSegmentsForPatterns} from "../../../../Frame/General/RegexHelpers";
import {GetParentNode} from "../../../../Store/firebase/nodes";
import {SlicePath} from "./NodeUI/RatingsPanel";
import classNames from "classnames";
import { GetEquationStepNumber } from "../../../../Store/firebase/nodes/$node/equation";
import NodeMathUI from "UI/@Shared/Maps/MapNode/NodeMathUI";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {TermPlaceholder} from "./NodeUI_Inner/TermPlaceholder";

/*AddGlobalStyle(`
.NodeUI_Inner
`);*/

//export type NodeHoverExtras = {panel?: string, term?: number};

type Props = {map: Map, node: MapNodeEnhanced, nodeView: MapNodeView, path: string, width: number, widthOverride?: number}
	& Partial<{finalNodeType: MapNodeType, form: ThesisForm, ratingsRoot: RatingsRoot, mainRating_average: number, userID: string}>;
//@FirebaseConnect((props: Props)=>((props[`holder`] = props[`holder`] || {}), [
/*@FirebaseConnect((props: Props)=>[
	...GetPaths_NodeRatingsRoot(props.node._id),
])*/
@Connect((state: RootState, {node, path, ratingsRoot}: Props)=> ({
	finalNodeType: GetFinalNodeTypeAtPath(node, path),
	form: GetNodeForm(node, path),
	ratingsRoot: GetNodeRatingsRoot(node._id),
	mainRating_average: GetRatingAverage(node._id, GetRatingTypesForNode(node).FirstOrX(null, {}).type),
	userID: GetUserID(),
}))
export default class NodeUI_Inner extends BaseComponent<Props, {hovered: boolean, hoverPanel: string, hoverTermID: number}> {
	render() {
		let {map, node, nodeView, path, width, widthOverride, finalNodeType, form, ratingsRoot, mainRating_average, userID} = this.props;
		let {hovered, hoverPanel, hoverTermID} = this.state;
		let nodeTypeInfo = MapNodeType_Info.for[finalNodeType];
		let barSize = 5;
		let pathNodeIDs = path.split(`/`).Select(a=>parseInt(a));
		let mainRatingType = GetRatingTypesForNode(node).FirstOrX(null, {}).type;

		let parentNode = GetNodeEnhanced(GetParentNode(path), SlicePath(path, 1));
		let nodeReversed = form == ThesisForm.Negation;
		let contextReversed = IsContextReversed(node, parentNode);
		let ratingReversed = ShouldRatingTypeBeReversed(mainRatingType, nodeReversed, contextReversed);

		let mainRating_mine = GetRatingValue(node._id, mainRatingType, userID);
		let mainRating_fillPercent = GetFillPercentForRatingAverage(node, mainRating_average, form == ThesisForm.Negation);
		let mainRating_myFillPercent = mainRating_mine != null ? GetFillPercentForRatingAverage(node, mainRating_mine, form == ThesisForm.Negation) : null;

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = hoverPanel || (nodeView && nodeView.openPanel);
		let subPanelShow = node.type == MapNodeType.Thesis && (node.contentNode || node.image);
		let bottomPanelShow = leftPanelShow && panelToShow;
		let expanded = nodeView && nodeView.expanded;

		return (
			<div className={classNames("NodeUI_Inner", pathNodeIDs.length == 0 && " root")} style={{
						display: "flex", position: "relative", borderRadius: 5, cursor: "default",
						boxShadow: "rgba(0,0,0,1) 0px 0px 2px", width, minWidth: widthOverride,
					}}
					/*onMouseEnter={()=>$(".scrolling").length == 0 && this.SetState({hovered: true})}
					onMouseLeave={()=>this.SetState({hovered: false})}*/
					onClick={e=> {
						if ((e.nativeEvent as any).ignore) return;
						if (nodeView == null || !nodeView.selected) {
							store.dispatch(new ACTMapNodeSelect({mapID: map._id, path}));
						}
					}}>
				{leftPanelShow &&
					<MapNodeUI_LeftBox {...{map, path, node, nodeView, ratingsRoot}}
						onPanelButtonHover={panel=>this.SetState({hoverPanel: panel})}
						onPanelButtonClick={panel=>store.dispatch(new ACTMapNodePanelOpen({mapID: map._id, path, panel}))}
						backgroundColor={nodeTypeInfo.backgroundColor} asHover={hovered}/>}
				{/* fixes click-gap */}
				{leftPanelShow && <div style={{position: "absolute", right: "100%", width: 1, top: 0, bottom: 0}}/>}

				<div style={{display: "flex", width: "100%", background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer"}}>
					<Div style={{position: "relative", width: "100%", padding: GetPaddingForNode(node)}}>
						<div style={{
							position: "absolute", left: 0, top: 0, bottom: 0,
							width: mainRating_fillPercent + "%", background: `rgba(${nodeTypeInfo.backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
						}}/>
						{mainRating_mine != null &&
							<div style={{
								position: "absolute", left: mainRating_myFillPercent + "%", top: 0, bottom: 0,
								width: 2, background: "rgba(0,255,0,.5)",
							}}/>}
						<TitlePanel {...{parent: this, map, node, nodeView, path}}/>
						{subPanelShow && <SubPanel node={node}/>}
						<NodeUI_Menu {...{map, node, path}}/>
					</Div>
					<Button //text={expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, //minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
								padding: 0,
								fontSize: expanded ? 23 : 17,
								lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(`,`).map(a=>(parseInt(a) * .8).RoundTo(1)).join(`,`)},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(`,`).map(a=>(parseInt(a) * .9).RoundTo(1)).join(`,`)},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path, expanded: !expanded, recursive: expanded && e.altKey}));
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
								//return false;
							}}>
						{expanded ? "-" : "+"}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
								padding: 5, background: "rgba(0,0,0,.7)", borderRadius: 5, boxShadow: "rgba(0,0,0,1) 0px 0px 2px",
							}}>
						<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
						{RatingType_Info.for[panelToShow] && (()=> {
							let ratings = GetRatings(node._id, panelToShow as RatingType);
							return <RatingsPanel node={node} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
						})()}
						{panelToShow == "definitions" &&
							<DefinitionsPanel ref={c=>this.definitionsPanel = c} {...{node, path, hoverTermID}}
								openTermID={nodeView.openTermID}
								onHoverTerm={termID=>this.SetState({hoverTermID: termID})}
								onClickTerm={termID=>store.dispatch(new ACTMapNodeTermOpen({mapID: map._id, path, termID: termID}))}/>}
						{panelToShow == "discussion" && <DiscussionPanel/>}
						{panelToShow == "social" && <SocialPanel/>}
						{panelToShow == "tags" && <TagsPanel/>}
						{panelToShow == "details" && <DetailsPanel node={node} path={path}/>}
						{panelToShow == "others" && <OthersPanel node={node} path={path}/>}
					</div>}
			</div>
		);
	}
	definitionsPanel: DefinitionsPanel;
	ComponentDidMount() {
		// we have to use native/jquery hover/mouseenter+mouseleave, to fix that in-equation term-placeholders would cause "mouseleave" to be triggered
		let dom = FindDOM_(this);
		//dom.off("mouseenter mouseleave");
		$(dom).hover(()=> {
			if ($(".scrolling").length == 0) {
				this.SetState({hovered: true});
			}
		}, ()=> {
			this.SetState({hovered: false})
		});
	}
}

type TitlePanelProps = {parent: NodeUI_Inner, map: Map, node: MapNodeEnhanced, nodeView: MapNodeView, path: string} & Partial<{equationNumber: number}>;
@Connect((state, {node, path}: TitlePanelProps)=> ({
	$1: node.image && GetImage(node.image.id),
	equationNumber: node.equation ? GetEquationStepNumber(path) : null,
}))
class TitlePanel extends BaseComponent<TitlePanelProps, {}> {
	render() {
		let {map, node, nodeView, path, equationNumber} = this.props;
		let latex = node.equation && node.equation.latex;
		return (
			//<Row style={{position: "relative"}}>
			<Div style={{position: "relative"}}>
				{equationNumber != null &&
					<Pre>{equationNumber}) </Pre>}
				<span style={E(
					{position: "relative", fontSize: GetFontSizeForNode(node), whiteSpace: "initial"},
					node.metaThesis && {margin: "4px 0 1px 0"},
				)}>
					{latex && <NodeMathUI text={node.equation.text} onTermHover={this.OnTermHover} onTermClick={this.OnTermClick}/>}
					{!latex && this.RenderNodeDisplayText(GetNodeDisplayText(node, path))}
				</span>
				{node.equation && node.equation.explanation &&
					<Pre style={{
						fontSize: 11, color: "rgba(255,255,255,.5)",
						//marginLeft: "auto",
						marginLeft: 15, marginTop: 3, float: "right",
					}}>
						{node.equation.explanation}
					</Pre>}
				{node.note &&
					<Pre style={{
						fontSize: 11, color: "rgba(255,255,255,.5)",
						marginLeft: 15, marginTop: 3, float: "right",
					}}>
						{node.note}
					</Pre>}
				{node.type == MapNodeType.Thesis && node.contentNode &&
					<InfoButton text="Allowed exceptions are: bold and [...] (collapsed segments)"/>}
			</Div>
		);
	}

	OnTermHover(termID: number, hovered: boolean) {
		let {parent} = this.props;
		parent.SetState({hoverPanel: hovered ? "definitions" : null, hoverTermID: hovered ? termID : null});
	}
	OnTermClick(termID: number) {
		let {parent, map, path} = this.props;
		//parent.SetState({hoverPanel: "definitions", hoverTermID: termID});
		store.dispatch(new ACTMapNodePanelOpen({mapID: map._id, path, panel: "definitions"}));
		store.dispatch(new ACTMapNodeTermOpen({mapID: map._id, path, termID: termID}));
	}

	RenderNodeDisplayText(text: string) {
		let {parent, map, path} = this.props;

		//let segments = ParseSegmentsFromNodeDisplayText(text);
		let segments = ParseSegmentsForPatterns(text, [
			{name: "term", regex: /{(.+?)\}\[(.+?)\]/}
		]);

		let elements = [];
		for (let [index, segment] of segments.entries()) {
			if (segment.patternMatched == null) {
				elements.push(<span key={index}>{segment.textParts[0]}</span>);
			} else if (segment.patternMatched == "term") {
				let refText = segment.textParts[1];
				let termID = segment.textParts[2].ToInt();
				elements.push(
					<TermPlaceholder key={index} refText={refText} termID={termID} onHover={hovered=>this.OnTermHover(termID, hovered)} onClick={()=>this.OnTermClick(termID)}/>
				);
			} else {
				Assert(false);
			}
		}
		return elements;
	}
}

class SubPanel extends BaseComponent<{node: MapNode}, {}> {
	render() {
		let {node} = this.props;
		return (
			<div style={{position: "relative", margin: "5px -5px -5px -5px", padding: "6px 5px 5px 5px",
				//border: "solid rgba(0,0,0,.5)", borderWidth: "1px 0 0 0"
				background: "rgba(0,0,0,.5)", borderRadius: "0 0 0 5px",
			}}>
				{node.contentNode &&
					<SubPanel_Quote contentNode={node.contentNode} fontSize={GetFontSizeForNode(node)}/>}
				{node.image &&
					<SubPanel_Image imageAttachment={node.image}/>}
			</div>
		);
	}
}
var Markdown = require("react-remarkable");
export class SubPanel_Quote extends BaseComponent<{contentNode: ContentNode, fontSize: number}, {}> {
	render() {
		let {contentNode, fontSize} = this.props;
		return (
			<div style={{position: "relative", fontSize, whiteSpace: "initial"}}>
				{/*<div>{`"${node.quote.text}"`}</div>*/}
				{/*<VReactMarkdown className="selectable Markdown" source={`"${contentNode.content}"`}
					containerProps={{style: E()}}
					renderers={{
						Text: props=> {
							//return <span {...props}>{props.literal}</span>;
							//return React.DOM.span(null, props.literal, props);
							//return React.createElement("section", props.Excluding("literal", "nodeKey"), props.literal);
							return "[text]" as any;
						},
						Link: props=><span/>,
					}}
				/>*/}
				<Markdown container="div" source={contentNode.content}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={contentNode.sourceChains}/>
			</div>
		);
	}
}
type SubPanel_ImageProps = {imageAttachment: ImageAttachment} & Partial<{image: Image}>;
@Connect((state, {imageAttachment}: SubPanel_ImageProps)=> ({
	image: GetImage(imageAttachment.id),
}))
export class SubPanel_Image extends BaseComponent<SubPanel_ImageProps, {}> {
	render() {
		let {image} = this.props;
		if (image == null) return <div/>;
		return (
			<div style={{position: "relative"}}>
				<img src={image.url} style={{width: image.previewWidth != null ? `${image.previewWidth}%` : null, maxWidth: "100%"}}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={image.sourceChains}/>
			</div>
		);
	}
}

export class SourcesUI extends BaseComponent<{sourceChains: SourceChain[]}, {}> {
	render() {
		let {sourceChains} = this.props;
		return (
			<Column mt={3} style={{whiteSpace: "normal"}}>
				<Row style={{color: "rgba(255,255,255,.5)"}}>Sources:</Row>
				{sourceChains.map((chain: SourceChain, index)=> {
					let linkTitle = chain.map((source, index)=> {
						if (source.link) {
							// if this is the first source, it's the most important, so show the link's whole url
							if (index == 0) {
								return URL.Parse(source.link, false).toString({domain_protocol: false});
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