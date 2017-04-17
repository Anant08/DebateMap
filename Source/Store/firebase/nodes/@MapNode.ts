import V from "../../../Frame/V/V";
import {_Enum, Enum, GetValues} from "../../../Frame/General/Enums";
import {MapNodeType, MapNodeType_Info} from "./@MapNodeType";
import {RatingType} from "../nodeRatings/@RatingType";
import {GetParentNode, IsLinkValid, IsNewLinkValid} from "../nodes";
import {PermissionGroupSet} from "../userExtras/@UserExtraInfo";

export enum AccessLevel {
	Basic = 10,
	Verified = 20,
	Mod = 30,
	Admin = 40,
}

export enum ThesisForm {
	Base = 10,
	Negation = 20,
	YesNoQuestion = 30,
}

export enum MetaThesis_IfType {
	Any = 10,
	AnyTwo = 15,
	All = 20,
}
export function GetMetaThesisIfTypeDisplayText(ifType: MetaThesis_IfType) {
	return MetaThesis_IfType[ifType].replace(/[a-z][A-Z]/, m=>m[0] + " " + m[1].toLowerCase()).toLowerCase();
}

export enum MetaThesis_ThenType {
	StrengthenParent = 10,
	GuaranteeParentTrue = 20,
	WeakenParent = 30,
	GuaranteeParentFalse = 40,
}
export class MetaThesis_ThenType_Info {
	static for = {
		StrengthenParent: {displayText: "strengthen the parent"},
		GuaranteeParentTrue: {displayText: "guarantee the parent true"},
		WeakenParent: {displayText: "weaken the parent"},
		GuaranteeParentFalse: {displayText: "guarantee the parent false"},
	} as {[key: string]: MetaThesis_ThenType_Info};

	displayText: string;
}

export class MapNode {
	constructor(initialData: {type: MapNodeType, creator: string} & Partial<MapNode>) {
		this.Extend(initialData);
		this.createdAt = Date.now();
	}

	_id?: number;
	type?: MapNodeType;
	titles: {[key: string]: string};

	creator?: string;
	createdAt: number;
	approved = false;
	accessLevel = AccessLevel.Basic;
	voteLevel = AccessLevel.Basic;

	quote: QuoteInfo;
	metaThesis: {
		ifType: MetaThesis_IfType;
		thenType: MetaThesis_ThenType;		
	};

	// averages from server
	/*agrees = 0;
	degree = 0;
	disagrees = 0;
	weight = 0;*/
	
	children = new ChildCollection();
	talkRoot: number;
}

export function GetFontSizeForNode(node: MapNode) {
	return node.metaThesis ? 11 : 14;
}
export function GetPaddingForNode(node: MapNode) {
	return node.metaThesis ? "1px 4px 2px" : "5px 5px 4px";
}
export function GetMainRatingTypesForNode(node: MapNode): RatingType[] {
	if (node._id < 100) // if static category, don't have any voting
		return [];
	if (node.metaThesis) {
		if (node.metaThesis.thenType == MetaThesis_ThenType.StrengthenParent || node.metaThesis.thenType == MetaThesis_ThenType.WeakenParent)
			return ["adjustment"];
		return ["probability"];
	}
	return MapNodeType_Info.for[node.type].mainRatingTypes;
}

export class QuoteInfo {
	author = "";
	text = "";
	sources = {[0]: ""} as {[key: number]: string};
}

export class ChildCollection {
	[key: number]: {_?, form?: ThesisForm};
}
/*export interface ChildInfo {
	id: number;
	type;
}*/

export function GetThesisFormAtPath(node: MapNode, path: string): ThesisForm {
	let parent = GetParentNode(path);
	if (parent == null) return ThesisForm.Base;
	let link = parent.children[node._id];
	return link.form;
}

export function IsNodeTitleValid_GetError(node: MapNode, title: string) {
	if (title.trim().length == 0) return "Title cannot be empty.";
	return null;
}

export function GetNodeDisplayText(node: MapNode, formOrPath: ThesisForm | string) {
	if (node.type == MapNodeType.Thesis) {
		if (node.quote)
			return `The statement below was made by ${node.quote.author}, and is unmodified.`;
		if (node.metaThesis) {
			return `If ${GetMetaThesisIfTypeDisplayText(node.metaThesis.ifType)} premises below are true, they ${
				MetaThesis_ThenType_Info.for[MetaThesis_ThenType[node.metaThesis.thenType]].displayText}.`;
		}

		let form = typeof formOrPath == "string" ? GetThesisFormAtPath(node, formOrPath) : formOrPath;
		if (form == ThesisForm.Negation)
			return node.titles["negation"] || "";
		if (form == ThesisForm.YesNoQuestion)
			return node.titles["yesNoQuestion"] || "";
	}
	return node.titles["base"] || "";
}

export function GetValidChildTypes(nodeType: MapNodeType, path: string) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsLinkValid(nodeType, path, {type} as any));
	return validChildTypes;
}
export function GetValidNewChildTypes(nodeType: MapNodeType, path: string, permissions: PermissionGroupSet) {
	let nodeTypes = GetValues<MapNodeType>(MapNodeType);
	let validChildTypes = nodeTypes.filter(type=>IsNewLinkValid(nodeType, path, {type} as any, permissions));
	return validChildTypes;
}