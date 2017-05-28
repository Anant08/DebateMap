import {GetNodeView} from "../../../../Store/main/mapViews";
import {Vector2i} from "../../../../Frame/General/VectorStructs";
import {Map} from "../../../../Store/firebase/maps/@Map";
import {MapNodeView} from "../../../../Store/main/mapViews/@MapViews";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {RootState} from "../../../../Store";
import {GetNodeChildren, GetNodeParents, GetParentNode} from "../../../../Store/firebase/nodes";
import {GetFillPercentForRatingAverage, GetRatingAverage, GetRatings} from "../../../../Store/firebase/nodeRatings";
import {CachedTransform} from "../../../../Frame/V/VCache";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import {URL} from "../../../../Frame/General/URLs";
import Link from "../../../../Frame/ReactComponents/Link";
import {BaseComponent, BaseProps, Pre, FindDOM} from "../../../../Frame/UI/ReactGlobals";
import {MapNode} from "../../../../Store/firebase/nodes/@MapNode";
import {GetNodeDisplayText, GetRatingTypesForNode} from "../../../../Store/firebase/nodes/$node";
import NodeUI_Inner from "./NodeUI_Inner";
import DefinitionsPanel from "./NodeUI/DefinitionsPanel";
import SocialPanel from "./NodeUI/SocialPanel";
import TagsPanel from "./NodeUI/TagsPanel";
import DetailsPanel from "./NodeUI/DetailsPanel";
import OthersPanel from "./NodeUI/OthersPanel";
import DiscussionPanel from "./NodeUI/DiscussionPanel";
import RatingsPanel from "./NodeUI/RatingsPanel";
import ScrollView from "react-vscrollview";

let childrenPlaceholder = [];

function GetCrawlerURLStrForNode(node: MapNode) {
	let result = GetNodeDisplayText(node).toLowerCase().replace(/[^a-z]/g, "-");
	// need to loop, in some cases, since regex doesn't reprocess "---" as two sets of "--".
	while (result.Contains("--")) {
		result = result.replace(/--/g, "-");
	}
	result = result.TrimStart("-").TrimEnd("-") + "." + node._id.toString();
	return result;
}

type Props = {map: Map, node: MapNode}
	& Partial<{nodeParents: MapNode[], nodeChildren: MapNode[]}>;
@Connect((state: RootState, {node}: Props)=> ({
	nodeParents: GetNodeParents(node),
	nodeChildren: GetNodeChildren(node),
}))
export default class NodeUI_ForBots extends BaseComponent<Props, {}> {
	render() {
		let {map, node, nodeParents, nodeChildren} = this.props;
		if (nodeParents.Any(a=>a == null) || nodeChildren.Any(a=>a == null)) return <div/>;

		// just list one of the parents as the "current parent", so code relying on a parent doesn't error
		let path = `${nodeParents.length ? nodeParents[0]._id + "/" : ""}${node._id}`;
		let parent = GetParentNode(path);
		let nodeEnhanced = node.Extended({finalType: node.type, link: null});
		return (
			<ScrollView ref="scrollView"
					//backgroundDrag={true} backgroundDragMatchFunc={a=>a == FindDOM(this.refs.scrollView.refs.content) || a == this.refs.mapUI}
					scrollVBarStyle={{width: 10}} contentStyle={{willChange: "transform"}}>
				<Row>
					<Pre>Parents: </Pre>{nodeParents.map((parent, index)=> {
						let toURL = URL.Current(true);
						if (parent._id == map.rootNode)
							toURL.pathNodes.RemoveAt(1);
						else
							toURL.pathNodes[1] = GetCrawlerURLStrForNode(parent);
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString({domain: false})}>
									{GetNodeDisplayText(parent)} ({parent._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<Row>
					<Pre>Children: </Pre>{nodeChildren.map((child, index)=> {
						let toURL = URL.Current(true);
						toURL.pathNodes[1] = GetCrawlerURLStrForNode(child);
						toURL.queryVars = [];
						return (
							<span key={index}>
								{index > 0 ? ", " : ""}
								<Link to={toURL.toString({domain: false})}>
									{GetNodeDisplayText(child)} ({child._id})
								</Link>
							</span>
						);
					})}
				</Row>
				<article>
					{/*<Row>ID: {node._id}</Row>
					<Row>Title: {GetNodeDisplayText(node)}</Row>*/}
					Main box:
					<NodeUI_Inner ref="innerBox" map={map} node={nodeEnhanced} nodeView={{}} path={path} width={null} widthOverride={null}/>
					Panels:
					{GetRatingTypesForNode(nodeEnhanced).map((ratingInfo, index)=> {
						let ratings = GetRatings(node._id, ratingInfo.type);
						return <RatingsPanel key={index} node={node} path={path} ratingType={ratingInfo.type} ratings={ratings}/>;
					})}
					<DefinitionsPanel node={node} path={path}/>
					<DiscussionPanel/>
					<SocialPanel/>
					<TagsPanel/>
					<DetailsPanel node={nodeEnhanced} path={path}/>
					<OthersPanel node={nodeEnhanced} path={path}/>
				</article>
			</ScrollView>
		);
	}
}