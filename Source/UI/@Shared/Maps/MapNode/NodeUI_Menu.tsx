import {MapNode, MetaThesis_IfType, MetaThesis_ThenType, MetaThesis_ThenType_Info} from "../../../../Store/firebase/nodes/@MapNode";
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
import {GetNode, IsLinkValid, ForDelete_GetError, ForUnlink_GetError} from "../../../../Store/firebase/nodes";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {SignInPanel, ShowSignInPopup} from "../../NavBar/UserPanel";
import {IsUserBasicOrAnon, IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";

type Props = {node: MapNode, path: string} & Partial<{permissionGroups: PermissionGroupSet, parentNode: MapNode, copiedNode: MapNode}>;
@Connect((state: RootState, {path}: Props)=> {
	let pathNodeIDs = path.split("/").Select(a=>parseInt(a));
	return {
		//userID: GetUserID(), // not needed in Connect(), since permissionGroups already watches its data
		permissionGroups: GetUserPermissionGroups(GetUserID()), 
		parentNode: GetNode(pathNodeIDs.XFromLast(1)),
		copiedNode: GetNode(state.main.copiedNode),
	};
})
export default class NodeUI_Menu extends BaseComponent<Props, {}> {
	render() {
		let {node, permissionGroups, parentNode, copiedNode} = this.props;
		let userID = GetUserID();
		let firebase = store.firebase.helpers;
		//let validChildTypes = MapNodeType_Info.for[node.type].childTypes;
		let validChildTypes = GetValues<MapNodeType>(MapNodeType).filter(type=>IsLinkValid(node, {type} as any));

		return (
			<VMenuStub>
				{IsUserBasicOrAnon(userID) && validChildTypes.map(childType=> {
					let childTypeInfo = MapNodeType_Info.for[childType];
					return (
						<VMenuItem key={childType} text={`Add ${childTypeInfo.displayName}`} style={styles.vMenuItem} onClick={e=> {
							if (e.button != 0) return;
							if (userID == null) return ShowSignInPopup();

							let isArgument = childType == MapNodeType.SupportingArgument || childType == MapNodeType.OpposingArgument;
							let thenTypes = childType == MapNodeType.SupportingArgument
								? GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Take(2)
								: GetEntries(MetaThesis_ThenType, name=>MetaThesis_ThenType_Info.for[name].displayText).Skip(2);

							let title = "";
							let metaThesis_ifType = MetaThesis_IfType.All;
							let metaThesis_thenType = childType == MapNodeType.SupportingArgument ? MetaThesis_ThenType.StrengthenParent : MetaThesis_ThenType.WeakenParent;
							let boxController = ShowMessageBox({
								title: `Add ${childTypeInfo.displayName}`, cancelButton: true,
								messageUI: ()=>(
									<div style={{padding: "10px 0"}}>
										Title: <TextInput ref={a=>a && WaitXThenRun(0, ()=>a.DOM.focus())} style={{width: 500}}
											onKeyDown={e=> {
												if (e.keyCode != keycode.codes.enter) return;
												boxController.options.onOK();
												boxController.Close();
											}}
											value={title} onChange={val=>DN(title = val, boxController.UpdateUI())}/>
										{isArgument &&
											<Div mt={5}>
												<Pre>Type: If </Pre>
												<Select options={GetEntries(MetaThesis_IfType, name=>name.toLowerCase())}
													value={metaThesis_ifType} onChange={val=>(metaThesis_ifType = val, boxController.UpdateUI())}/>
												<Pre> premises below are true, they </Pre>
												<Select options={thenTypes} value={metaThesis_thenType} onChange={val=>(metaThesis_thenType = val, boxController.UpdateUI())}/>
												<Pre>.</Pre>
											</Div>}
									</div>
								),
								onOK: ()=> {
									firebase.Ref("nodes").transaction(nodes=> {
										if (!nodes) return nodes;

										let newID = nodes.Props.filter(a=>a.name != "_").map(a=>parseInt(a.name)).Max().KeepAtLeast(99) + 1;
										nodes[node._id].children = {...nodes[node._id].children, [newID]: {_: true}};
										let newNode = new MapNode({
											type: childType, title,
											creator: userID, approved: true,
										});
										nodes[newID] = newNode;

										if (isArgument) {
											let metaThesisID = newID + 1;
											let metaThesisNode = new MapNode({
												type: MapNodeType.Thesis,
												metaThesis: true, metaThesis_ifType, metaThesis_thenType,
												creator: userID, approved: true,
											});
											nodes[metaThesisID] = metaThesisNode;
											newNode.children = {...newNode.children, [metaThesisID]: {_: true}};
										}

										return nodes;
									}, undefined, false);
								}
							});
						}}/>
					);
				})}
				{IsUserBasicOrAnon(userID) &&
					//<VMenuItem text={copiedNode ? "Copy (right-click to clear)" : "Copy"} style={styles.vMenuItem}
					<VMenuItem text={copiedNode ? <span>Copy <span style={{fontSize: 10, opacity: .7}}>(right-click to clear)</span></span> as any : "Copy"} style={styles.vMenuItem}
						onClick={e=> {
							if (e.button == 0)
								store.dispatch(new ACTNodeCopy(node._id));
							else
								store.dispatch(new ACTNodeCopy(null));
						}}/>}
				{IsUserBasicOrAnon(userID) && copiedNode && IsLinkValid(node, copiedNode) &&
					<VMenuItem text={`Paste "${copiedNode.title.KeepAtMost(30)}"`} style={styles.vMenuItem} onClick={e=> {
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
						ShowMessageBox({
							title: `Unlink child "${node.title}"`, cancelButton: true,
							message: `Unlink the child "${node.title}" from its parent "${parentNode.title}"?`,
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
							title: `Delete "${node.title}"`, cancelButton: true,
							message: `Delete the node "${node.title}"`
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