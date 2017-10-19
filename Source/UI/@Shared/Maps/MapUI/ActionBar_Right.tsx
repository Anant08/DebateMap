import {Map, MapType} from "../../../../Store/firebase/maps/@Map";
import {Connect} from "Frame/Database/FirebaseConnect";
import {IsUserCreatorOrMod} from "../../../../Store/firebase/userExtras";
import {GetUserID} from "Store/firebase/users";
import {BaseComponent, GetInnerComp, Pre} from "../../../../Frame/UI/ReactGlobals";
import Row from "Frame/ReactComponents/Row";
import Button from "Frame/ReactComponents/Button";
import {ACTDebateMapSelect} from "../../../../Store/main/debates";
import MapDetailsUI from "../MapDetailsUI";
import DropDown from "../../../../Frame/ReactComponents/DropDown";
import {DropDownContent, DropDownTrigger} from "../../../../Frame/ReactComponents/DropDown";
import Column from "../../../../Frame/ReactComponents/Column";
import {GetUpdates} from "../../../../Frame/General/Others";
import UpdateMapDetails from "../../../../Server/Commands/UpdateMapDetails";
import {GetNodeAsync, GetChildCount} from "Store/firebase/nodes";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import DeleteMap from "../../../../Server/Commands/DeleteMap";
import {colors} from "../../../../Frame/UI/GlobalStyles";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import {ACTSetInitialChildLimit} from "../../../../Store/main";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import { ShareDropDown } from "UI/@Shared/Maps/MapUI/ActionBar_Right/ShareDropDown";
import {LayoutDropDown} from "./ActionBar_Right/LayoutDropDown";

export class ActionBar_Right extends BaseComponent<{map: Map, subNavBarWidth: number}, {}> {
	render() {
		let {map, subNavBarWidth} = this.props;
		let tabBarWidth = 104;
		return (
			<nav style={{
				position: "absolute", zIndex: 1, left: `calc(50% + ${subNavBarWidth / 2}px)`, right: 0, top: 0, textAlign: "center",
				//background: "rgba(0,0,0,.5)", boxShadow: "3px 3px 7px rgba(0,0,0,.07)",
			}}>
				<Row style={{
					justifyContent: "flex-end", background: "rgba(0,0,0,.7)", boxShadow: colors.navBarBoxShadow,
					width: "100%", height: 30, borderRadius: "0 0 0 10px",
				}}>
					<ShareDropDown map={map}/>
					<LayoutDropDown/>
				</Row>
			</nav>
		);
	}
}