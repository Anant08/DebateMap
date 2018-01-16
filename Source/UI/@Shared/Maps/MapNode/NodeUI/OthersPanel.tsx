import {Column, CheckBox} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {IsUserCreatorOrMod} from "../../../../../Store/firebase/userExtras";
import {MapNodeL2, ClaimType, ClaimForm, MapNodeL3} from "../../../../../Store/firebase/nodes/@MapNode";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {GetLinkUnderParent, GetNodeDisplayText, GetClaimType} from "../../../../../Store/firebase/nodes/$node";
import {GetUserPermissionGroups, GetUserID, GetUser} from "Store/firebase/users";
import {GetParentNode, GetParentNodeID} from "Store/firebase/nodes";
import {Pre, Row} from "react-vcomponents";
import {Button} from "react-vcomponents";
import UpdateNodeDetails from "Server/Commands/UpdateNodeDetails";
import {ShowMessageBox} from "react-vmessagebox";
import ReverseArgumentPolarity from "../../../../../Server/Commands/ReverseArgumentPolarity";
import {GetValues, GetEntries} from "../../../../../Frame/General/Enums";
import {CanConvertFromClaimTypeXToY} from "./../../../../../Server/Commands/ChangeClaimType";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {Select} from "react-vcomponents";
import ChangeClaimType from "./../../../../../Server/Commands/ChangeClaimType";
import { GetNodeViewers } from "Store/firebase/nodeViewers";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import Moment from "moment";
import UpdateLink from "../../../../../Server/Commands/UpdateLink";
import {User} from "../../../../../Store/firebase/users/@User";

type Props = {map?: Map, node: MapNodeL3, path: string} & Partial<{creator: User, viewers: string[]}>;
@Connect((state, {node, path}: Props)=>({
	_: GetUserPermissionGroups(GetUserID()),
	creator: GetUser(node.creator),
	viewers: GetNodeViewers(node._id),
}))
export default class OthersPanel extends BaseComponent<Props, {convertToType: ClaimType}> {
	render() {
		let {map, node, path, creator, viewers} = this.props;
		let mapID = map ? map._id : null;
		let {convertToType} = this.state;
		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), node);

		let convertToTypes = GetEntries(ClaimType).filter(pair=>CanConvertFromClaimTypeXToY(GetClaimType(node), pair.value));
		convertToType = convertToType || convertToTypes.map(a=>a.value).FirstOrX();

		return (
			<Column sel style={{position: "relative"}}>
				<InfoTable node={node} creator={creator}/>
				<Row>Parents: {node.parents == null ? "none" : node.parents.VKeys(true).join(", ")}</Row>
				<Row>Children: {node.children == null ? "none" : node.children.VKeys(true).join(", ")}</Row>
				<Row>Viewers: {viewers.length || "..."} <InfoButton text="The number of registered users who have had this node displayed in-map at some point."/></Row>
				{node.type == MapNodeType.Argument && creatorOrMod &&
					<Row>
						<Button mt={3} text="Reverse argument polarity" onLeftClick={()=> {
							ShowMessageBox({
								title: `Reverse argument polarity?`, cancelButton: true,
								message: `Reverse polarity of argument "${GetNodeDisplayText(node)}"?\n\nAll impact-premise ratings will be deleted.`,
								onOK: ()=> {
									new ReverseArgumentPolarity(E(mapID && {mapID}, {nodeID: node._id, path})).Run();
								}
							});
						}}/>
					</Row>}
				{node.type == MapNodeType.Claim && convertToTypes.length > 0 &&
					<Row>
						<Pre>Convert to: </Pre>
						<Select options={convertToTypes} value={convertToType} onChange={val=>this.SetState({convertToType: val})}/>
						<Button ml={5} text="Convert" onClick={()=> {
							new ChangeClaimType(E({mapID}, {nodeID: node._id, newType: convertToType})).Run();
						}}/>
					</Row>}
				<AtThisLocation node={node} path={path}/>
			</Column>
		);
	}
}

class InfoTable extends BaseComponent<{node: MapNodeL3, creator: User}, {}> {
	render() {
		let {node, creator} = this.props;
		return (
			<table className="selectableAC lighterBackground" style={{marginBottom: 5, /*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
				<thead>
					<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
				</thead>
				<tbody>
					<tr>
						<td>{node._id}</td>
						<td>{creator ? creator.displayName : `n/a`}</td>
						<td>{Moment(node.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
					</tr>
				</tbody>
			</table>
		);
	}
}

class AtThisLocation extends BaseComponent<{node: MapNodeL3, path: string}, {}> {
	render() {
		let {node, path} = this.props;
		if (node.type != MapNodeType.Claim) return <div/>;
		if (path.split("/").length == 0) return <div/>; // if the root of a map, or subnode

		let claimType = GetClaimType(node);
		let canSetAsNegation = claimType == ClaimType.Normal && !node.current.impactPremise && node.link.form != ClaimForm.YesNoQuestion;
		let canSetAsSeriesAnchor = claimType == ClaimType.Equation && !node.current.equation.isStep; //&& !creating;
		if (!canSetAsNegation && !canSetAsSeriesAnchor) return <div/>;
		
		return (
			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>At this location:</Row>
				<Row>Path: {path}</Row>
				{canSetAsNegation &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as negation: </Pre>
						<CheckBox checked={node.link.form == ClaimForm.Negation}
							onChange={val=> {
								new UpdateLink({
									linkParentID: GetParentNodeID(path), linkChildID: node._id,
									linkUpdates: {form: val ? ClaimForm.Negation : ClaimForm.Base}
								}).Run();
							}}/>
					</Row>}
				{canSetAsSeriesAnchor &&
					<Row style={{display: "flex", alignItems: "center"}}>
						<Pre>Show as series anchor: </Pre>
						<CheckBox checked={node.link.seriesAnchor}
							//onChange={val=>Change(val ? newLinkData.isStep = true : delete newLinkData.isStep)}/>
							onChange={val=> {
								new UpdateLink({
									linkParentID: GetParentNodeID(path), linkChildID: node._id,
									linkUpdates: {seriesAnchor: val || null}
								}).Run();
							}}/>
					</Row>}
			</Column>
		);
	}
}