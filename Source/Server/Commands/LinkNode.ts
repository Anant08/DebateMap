import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, Polarity} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {MapEdit} from "Server/CommandMacros";
import {UserEdit} from "../CommandMacros";

@MapEdit
@UserEdit
export default class LinkNode extends Command<{mapID: number, parentID: number, childID: number, childForm: ClaimForm, childPolarity: Polarity}> {
	Validate_Early() {
		let {parentID, childID} = this.payload
		Assert(parentID != childID, "Parent-id and child-id cannot be the same!");
	}
	
	parent_oldChildrenOrder: number[];
	/*async Prepare(parent_oldChildrenOrder_override?: number[]) {
		let {parentID, childID, childForm} = this.payload;
		this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
	}*/
	async Prepare() {
		let {parentID, childID} = this.payload;
		this.parent_oldChildrenOrder = await GetDataAsync("nodes", parentID, "childrenOrder") as number[];
	}
	async Validate() {
		let {parentID, childID} = this.payload;
		Assert(this.parent_oldChildrenOrder == null || !this.parent_oldChildrenOrder.Contains(childID), `Node #${childID} is already a child of node #${parentID}.`);
	}

	GetDBUpdates() {
		let {parentID, childID, childForm, childPolarity} = this.payload;

		let updates = {};
		// add parent as parent-of-child
		updates[`nodes/${childID}/parents/${parentID}`] = {_: true};
		// add child as child-of-parent
		updates[`nodes/${parentID}/children/${childID}`] = E(
			{_: true},
			childForm && {form: childForm},
			childPolarity && {polarity: childPolarity},
		);
		if (this.parent_oldChildrenOrder) {
			updates[`nodes/${parentID}/childrenOrder`] = this.parent_oldChildrenOrder.concat([childID]);
		}
		return updates;
	}
}