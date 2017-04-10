import {
    GetNodeDisplayText,
    GetValidChildTypes,
	GetValidNewChildTypes,
    MapNode,
    MetaThesis_IfType,
    MetaThesis_ThenType,
    MetaThesis_ThenType_Info
} from "../../../../Store/firebase/nodes/@MapNode";
import {PermissionGroupSet} from "../../../../Store/firebase/userExtras/@UserExtraInfo";
import {VMenuStub} from "react-vmenu";
import {MapNodeType, MapNodeType_Info} from "../../../../Store/firebase/nodes/@MapNodeType";
import {Type} from "../../../../Frame/General/Types";
import {GetUserID, GetUserPermissionGroups} from "../../../../Store/firebase/users";
import {RootState} from "../../../../Store";
import VMenu from "react-vmenu";
import {BaseComponent, Pre, Div} from "../../../../Frame/UI/ReactGlobals";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import {DataSnapshot} from "firebase";
import {DN} from "../../../../Frame/General/Globals";
import keycode from "keycode";
import {firebaseConnect} from "react-redux-firebase";
import {connect} from "react-redux";
import {ACTNodeCopy} from "../../../../Store/main";
import Select from "../../../../Frame/ReactComponents/Select";
import {GetEntries, GetValues} from "../../../../Frame/General/Enums";
import {VMenuItem} from "react-vmenu/dist/VMenu";
import {GetNode, IsLinkValid, IsNewLinkValid, ForDelete_GetError, ForUnlink_GetError, GetParentNode} from "../../../../Store/firebase/nodes";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {SignInPanel, ShowSignInPopup} from "../../NavBar/UserPanel";
import {IsUserBasicOrAnon, IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {ThesisForm} from "../../../../Store/firebase/nodes/@MapNode";
import {ShowAddChildDialog} from "./NodeUI_Menu/AddChildDialog";

type Props = {node: MapNode, path: string} & Partial<{permissions: PermissionGroupSet, parentNode: MapNode, copiedNode: MapNode}>;
@Connect((state: RootState, {path}: Props)=> {
	let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
	return {
		//userID: GetUserID(), // not needed in Connect(), since permissions already watches its data
		permissions: GetUserPermissionGroups(GetUserID()), 
		parentNode: GetParentNode(path),
		copiedNode: GetNode(state.main.copiedNode),
	};
})
export default class NodeUI_Menu extends BaseComponent<Props, {}> {
	render() {
		let {node, path, permissions, parentNode, copiedNode} = this.props;
		let userID = GetUserID();
		let firebase = store.firebase.helpers;
		//let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValidNewChildTypes(node.type, path, permissions);

		let nodeText = GetNodeDisplayText(node, path);

		return (
			<VMenuStub>
				{IsUserBasicOrAnon(userID) && validChildTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					let displayName = childTypeInfo.displayName(node);
					return (
						<VMenuItem key={childType} text={`Add ${displayName}`} style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();

							ShowAddChildDialog(node, childType, userID);
						}}/>
					);
				})}
				{IsUserBasicOrAnon(userID) &&
					//<VMenuItem text={copiedNode ? "Copy (right-click to clear)" : "Copy"} style={styles.vMenuItem}
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : "Copy"} style={styles.vMenuItem}
						onClick={e=> {
							if (node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument)
								return void ShowMessageBox({title: "Cannot copy",
									message: "Sorry! For technical reasons, arguments cannot currently be copied. For now, copy the premises."});
							if (e.button == 0)
								store.dispatch(new ACTNodeCopy(node._id));
							else
								store.dispatch(new ACTNodeCopy(null));
						}}/>}
				{IsUserBasicOrAnon(userID) && copiedNode && IsNewLinkValid(node.type, path, copiedNode, permissions) &&
					<VMenuItem text={`Paste as link: "${copiedNode.titles["base"].KeepAtMost(50)}"`} style={styles.vMenuItem} onClick={e=> {
						if (e.button != 0) return;
						if (userID == null) return ShowSignInPopup();
						//Store.dispatch(new ACTNodeCopy(null));
						firebase.Ref(`nodes/${node._id}/children`).update({[copiedNode._id]: {_: true}});
					}}/>}
				{IsUserCreatorOrMod(userID, node) && <VMenuItem text="Unlink" style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;
					let error = ForUnlink_GetError(userID, node);
					if (error)
						return void ShowMessageBox({title: "Cannot unlink", message: error});

					firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
						let nodes = (snapshot.val() as Object).Props.Where(a=>a.name != "_").Select(a=>a.value.Extended({_id: a.name}));
						//let childNodes = node.children.Select(a=>nodes[a]);
						// todo: remove need for downloading all nodes, by have children store their parents (redundant, but practical)
						let parentNodes = nodes.Where(a=>a.children && a.children[node._id]);
						if (parentNodes.length <= 1)
							return void ShowMessageBox({title: "Cannot unlink", message: "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."});

						//let parent = parentNodes[0];
						let parentText = GetNodeDisplayText(parentNode, path.substr(0, path.lastIndexOf("/")));
						ShowMessageBox({
							title: `Unlink child "${nodeText}"`, cancelButton: true,
							message: `Unlink the child "${nodeText}" from its parent "${parentText}"?`,
							onOK: ()=> {
								firebase.Ref("nodes").transaction(nodes=> {
									if (!nodes) return nodes;
									nodes[parentNode._id].children[node._id] = null;
									return nodes;
								}, undefined, false);
							}
						});
					});
				}}/>}
				{IsUserCreatorOrMod(userID, node) && <VMenuItem text="Delete" style={styles.vMenuItem} onClick={e=> {
					if (e.button != 0) return;
					let error = ForDelete_GetError(userID, node);
					if (error)
						return void ShowMessageBox({title: "Cannot delete", message: error});

					firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
						let nodes = (snapshot.val() as Object).Props.Select(a=>a.value.Extended({_id: a.name}));
						//let childNodes = node.children.Select(a=>nodes[a]);
						let parentNodes = nodes.Where(a=>a.children && a.children[node._id]);
						let s_ifParents = parentNodes.length > 1 ? "s" : "";
						let metaThesisID = node.type == MapNodeType.SupportingArgument || node.type == MapNodeType.OpposingArgument ? node.children.VKeys()[0] : null;

						ShowMessageBox({
							title: `Delete "${nodeText}"`, cancelButton: true,
							message: `Delete the node "${nodeText}"`
								+ `${metaThesisID ? ", its 1 meta-thesis" : ""}`
								+ `, and its link${s_ifParents} with ${parentNodes.length} parent-node${s_ifParents}?`,
							onOK: ()=> {
								firebase.Ref("nodes").transaction(nodes=> {
									if (!nodes) return nodes;
									for (let parent of parentNodes)
										nodes[parent._id].children[node._id] = null;
									nodes[node._id] = null;
									// if has meta-thesis, delete it also
									//for (let childID of node.children)
									if (metaThesisID)
										nodes[metaThesisID] = null;
									return nodes;
								}, undefined, false);
							}
						});
					});
				}}/>}
			</VMenuStub>
		);
	}
}