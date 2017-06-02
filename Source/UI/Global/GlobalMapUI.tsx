import {firebaseConnect, helpers} from "react-redux-firebase";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import {DBPath, GetData} from "../../Frame/Database/DatabaseHelpers";
import {connect} from "react-redux";
import MapUI from "../@Shared/Maps/MapUI";
import {Debugger, Debugger_Wrap} from "../../Frame/General/Globals_Free";
import ScrollView from "react-vscrollview";
import {RootState} from "../../Store/index";
import {Map} from "../../Store/firebase/maps/@Map";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {GetMap} from "../../Store/firebase/maps";

@Connect(state=> ({
	map: GetMap(1),
}))
export default class GlobalMapUI extends BaseComponent<Partial<{map: Map}>, {}> {
	render() {
		let {map} = this.props;
		return (
			<MapUI map={map} subNavBarWidth={104}/>
		);
	}
}