import {BaseComponent, FindDOM, GetErrorMessagesUnderElement} from "../../../Frame/UI/ReactGlobals";
import {ThesisForm} from "../../../Store/firebase/nodes/@MapNode";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import {Pre, Div} from "../../../Frame/UI/ReactGlobals";
import {MapNodeType} from "../../../Store/firebase/nodes/@MapNodeType";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import Editor from "react-md-editor";
import Button from "../../../Frame/ReactComponents/Button";
import {Component} from "react";
import Icons from "react-md-editor/lib/icons";
import {GetNodeDisplayText} from "../../../Store/firebase/nodes/$node";
import {GetSourceNamePlaceholderText, GetSourceAuthorPlaceholderText} from "../../../Store/firebase/contentNodes/$contentNode";
import Select from "../../../Frame/ReactComponents/Select";
import {ContentNode} from "../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {GetEntries} from "../../../Frame/General/Enums";
import { MarkdownToolbar } from "UI/@Shared/MarkdownEditor/MarkdownToolbar";
import {Post} from "../../../Store/firebase/forum/@Post";

export default class PostEditorUI extends BaseComponent
		<{
			creating?: boolean, editing?: boolean, baseData: Post, showPreview: boolean, justShowed: boolean, onChange?: (newData: Post)=>void,
		},
		{newData: Post}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	
	render() {
		let {creating, editing, showPreview, justShowed, onChange} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};

		return (
			<div> {/* needed so GetInnerComp() work */}
			<Column>
				<Column mt={5}>
					<Pre>Text: </Pre>
					{(creating || editing) && <MarkdownToolbar editor={()=>this.refs.editor}/>}
					<Editor ref="editor" value={newData.text} onChange={val=>Change(newData.text = val)} options={{
						scrollbarStyle: `overlay`,
						lineWrapping: true,
						readOnly: !(creating || editing),
					}}/>
				</Column>
			</Column>
			</div>
		);
	}

	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}
	GetNewData() {
		let {newData} = this.state;
		return Clone(newData);
	}
}