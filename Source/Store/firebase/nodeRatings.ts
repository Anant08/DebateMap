import {GetArgumentStrengthPseudoRatings, CalculateArgumentStrength, GetArgumentStrengthPseudoRating} from "../../Frame/Store/RatingProcessor";
import {RatingType} from "../../Store/firebase/nodeRatings/@RatingType";
import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {CachedTransform} from "../../Frame/V/VCache";
import {MapNode, MetaThesis_ThenType} from "../../Store/firebase/nodes/@MapNode";
import {RatingsRoot, Rating} from "./nodeRatings/@RatingsRoot";
import {GetNodeChildren, GetNode} from "./nodes";

export function GetPaths_NodeRatingsRoot(nodeID: number) {
	return [`nodeRatings/${nodeID}`];
}
export function GetNodeRatingsRoot(nodeID: number) {
	//RequestPaths(GetPaths_NodeRatingsRoot(nodeID));
	return GetData(GetPaths_NodeRatingsRoot(nodeID)[0]) as RatingsRoot;
}

export function GetRatingSet(nodeID: number, ratingType: RatingType) {
	let ratingsRoot = GetNodeRatingsRoot(nodeID);
	return ratingsRoot ? ratingsRoot[ratingType] : null;
}
export function GetRatings(nodeID: number, ratingType: RatingType): Rating[] {
	if (ratingType == "strength")
		return GetArgumentStrengthPseudoRatings(GetNodeChildren(GetNode(nodeID)));
	let ratingSet = GetRatingSet(nodeID, ratingType);
	return CachedTransform({nodeID, ratingType}, {ratingSet},
		()=>ratingSet ? ratingSet.Props.filter(a=>a.name != "_key").map(a=>a.value as Rating) : []);
}
export function GetRating(nodeID: number, ratingType: RatingType, userID: string) {
	let ratingSet = GetRatingSet(nodeID, ratingType);
	if (ratingSet == null) return null;
	return ratingSet[userID];
}
export function GetRatingValue(nodeID: number, ratingType: RatingType, userID: string, allowGetPseudoRating = true, resultIfNoData = null): number {
	let rating = GetRating(nodeID, ratingType, userID);
	if (ratingType == "strength" && allowGetPseudoRating)
		return (GetArgumentStrengthPseudoRating(GetNodeChildren(GetNode(nodeID)), userID) || {} as any).value;
	return rating ? rating.value : resultIfNoData;
}
export function GetRatingAverage(nodeID: number, ratingType: RatingType, resultIfNoData = null): number {
	if (ratingType == "strength")
		return CalculateArgumentStrength(GetNodeChildren(GetNode(nodeID)));
	let ratings = GetRatings(nodeID, ratingType);
	if (ratings.length == 0) return resultIfNoData as any;
	return CachedTransform({nodeID, ratingType}, {ratings}, ()=>ratings.map(a=>a.value).Average().RoundTo(1));
}

/*export function GetPaths_MainRatingSet(node: MapNode) {
	let mainRatingType = MapNode.GetMainRatingTypes(node)[0];
	return [`nodeRatings/${node._id}/${mainRatingType}`];
}
export function GetPaths_MainRatingAverage(node: MapNode) {
	let result = GetPaths_MainRatingSet(node);
	if (node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument)
		result.AddRange(GetPaths_CalculateArgumentStrength(node, GetNodeChildren(node)));
	return result;
}*/
export function GetMainRatingAverage(node: MapNode, resultIfNoData = null): number {
	// if static category, always show full bar
	if (node._id < 100)
		return 100;
	return GetRatingAverage(node._id, MapNode.GetMainRatingTypes(node)[0], resultIfNoData);
}
//export function GetPaths_MainRatingFillPercent(node: MapNode) { return GetPaths_MainRatingAverage(node); }
export function GetMainRatingFillPercent(node: MapNode) {
	let mainRatingAverage = GetMainRatingAverage(node);
	if (node.metaThesis && (node.metaThesis_thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis_thenType == MetaThesis_ThenType.WeakenParent))
		return mainRatingAverage != null ? mainRatingAverage.Distance(50) * 2 : 0;
	return mainRatingAverage || 0;
}