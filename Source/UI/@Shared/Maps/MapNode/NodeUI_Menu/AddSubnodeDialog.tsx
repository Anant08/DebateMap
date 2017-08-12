import {MapNodeType, MapNodeType_Info, GetMapNodeTypeDisplayName} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {GetEntries} from "../../../../../Frame/General/Enums";
import {MapNode, ThesisForm, ChildEntry, MapNodeEnhanced, ThesisType, ImageAttachment} from "../../../../../Store/firebase/nodes/@MapNode";
import {ShowMessageBox, BoxController} from "../../../../../Frame/UI/VMessageBox";
import Select from "../../../../../Frame/ReactComponents/Select";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import {Div, Pre, BaseComponent, GetInnerComp, FindDOM, GetErrorMessagesUnderElement} from "../../../../../Frame/UI/ReactGlobals";
import Row from "../../../../../Frame/ReactComponents/Row";
import Column from "../../../../../Frame/ReactComponents/Column";
import keycode from "keycode";
import Button from "../../../../../Frame/ReactComponents/Button";
import {E} from "../../../../../Frame/General/Globals_Free";
import {MetaThesis_ThenType, MetaThesis_IfType, MetaThesis_ThenType_Info, GetMetaThesisIfTypeDisplayText} from "../../../../../Store/firebase/nodes/@MetaThesisInfo";
import AddNode from "../../../../../Server/Commands/AddNode";
import Editor from "react-md-editor";
import QuoteInfoEditorUI from "../QuoteInfoEditorUI";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {CleanUpdatedContentNode} from "../QuoteInfoEditorUI";
import CheckBox from "../../../../../Frame/ReactComponents/CheckBox";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import NodeDetailsUI from "../NodeDetailsUI";
import {ReverseMapNodeType, GetThesisType} from "../../../../../Store/firebase/nodes/$node";
import {ACTMapNodeExpandedSet} from "../../../../../Store/main/mapViews/$mapView/rootNodeViews";
import {Equation} from "../../../../../Store/firebase/nodes/@Equation";
import { IsUserAdmin, IsUserMod } from "../../../../../Store/firebase/userExtras";
import {GetLayers} from "../../../../../Store/firebase/layers";
import {Connect} from "Frame/Database/FirebaseConnect";
import {GetUserID} from "Store/firebase/users";
import {Layer} from "Store/firebase/layers/@Layer";
import AddSubnode from "../../../../../Server/Commands/AddSubnode";

export function ShowAddSubnodeDialog(mapID: number, anchorNode: MapNodeEnhanced, anchorNodePath: string) {
	let dialog: AddSubnodeDialog;
	let boxController: BoxController = ShowMessageBox({
		title: `Add subnode (to layer)`, cancelButton: true,
		messageUI: ()=><AddSubnodeDialog Ref={c=>dialog = c} {...{mapID, anchorNode, anchorNodePath, boxController}}/>,
		onOK: ()=>dialog.OnOK(),
	});
}

type Props = {mapID: number, anchorNode: MapNode, anchorNodePath: string, boxController: BoxController} & Partial<{layers: Layer[]}>;
@Connect((state, {}: Props)=> ({
	layers: GetLayers(),
}))
class AddSubnodeDialog extends BaseComponent<Props, {layer: Layer, newNode: MapNode, newLink: ChildEntry, validationError: string}> {
	constructor(props) {
		super(props);
		let newNode = new MapNode({
			titles: {},
			type: MapNodeType.Thesis,
			relative: false,
			//contentNode: new ContentNode(),
			approved: true,
		});
		let newLink = E({_: true}, newNode.type == MapNodeType.Thesis && {form: ThesisForm.Base}) as ChildEntry; // not actually used
		this.state = {newNode, newLink} as any;

		this.UpdateOKButton();
	}
	UpdateOKButton() {
		let {boxController} = this.props;
		let {validationError} = this.state;
		// update ok-button
		boxController.options.okButtonClickable = validationError == null;
	}

	nodeEditorUI: NodeDetailsUI;
	render() {
		let {boxController, layers} = this.props;
		let {layer, newNode, newLink, validationError} = this.state;
		
		let thesisTypes = GetEntries(ThesisType);
		thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.MetaThesis));
		if (!IsUserMod(GetUserID())) {
			thesisTypes.Remove(thesisTypes.find(a=>a.value == ThesisType.Image));
		}

		this.UpdateOKButton();

		let layerOptions = [{name: "", value: null}].concat(layers.map(a=>({name: a.name, value: a})));
		return (
			<Column style={{padding: "10px 0", width: 600}}>
				<Row>
					<Pre>Layer: </Pre>
					<Select options={layerOptions} value={layer} onChange={val=>this.SetState({layer: val})}/>
				</Row>
				{newNode.type == MapNodeType.Thesis &&
					<Row mt={5}>
						<Pre>Type: </Pre>
						<Select displayType="button bar" options={thesisTypes} style={{display: "inline-block"}}
							value={GetThesisType(newNode)}
							onChange={val=> {
								newNode.Extend({equation: null, contentNode: null, image: null});
								if (val == ThesisType.Normal) {
								} else if (val == ThesisType.Equation) {
									newNode.equation = new Equation();
								} else if (val == ThesisType.Quote) {
									newNode.contentNode = new ContentNode();
								} else {
									newNode.image = new ImageAttachment();
								}
								this.Update();

								let oldError = validationError;
								setTimeout(()=> {
									validationError = this.GetValidationError();
									if (validationError != oldError) {
										this.Update();
									}
								});
							}}/>
					</Row>}
				<NodeDetailsUI ref={c=>this.nodeEditorUI = GetInnerComp(c) as any} parent={null}
					baseData={newNode.Extended({finalType: newNode.type, link: null})} baseLinkData={this.state.newLink} forNew={true}
					onChange={(newNodeData, newLinkData, comp)=> {
						this.SetState({newNode: newNodeData, validationError: this.GetValidationError()});
					}}/>
			</Column>
		);
	}
	GetValidationError() {
		if (this.nodeEditorUI && this.nodeEditorUI.GetValidationError()) return this.nodeEditorUI.GetValidationError();
		let {layer} = this.state;
		if (layer == null) return "A layer must be selected.";
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	async OnOK() {
		let {mapID, anchorNode, anchorNodePath} = this.props;
		let {layer, newNode, newLink} = this.state;

		/*if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		}*/

		let newNodeID = await new AddSubnode({layerID: layer._id, anchorNodeID: anchorNode._id, subnode: newNode}).Run();
		//store.dispatch(new ACTMapNodeExpandedSet_InLayer({mapID, anchorNodePath, layerID: layer._id, layerPath: newNodeID, expanded: true, recursive: false}));
	}
}