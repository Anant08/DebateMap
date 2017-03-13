import {BaseComponent, FirebaseDatabase} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {Map} from "./Map";
import MapNodeUI from "./MapNodeUI";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./MapNode";
import {EStrToInt} from "../../../Frame/General/Globals_Free";
import {PropTypes} from "react";
var ScrollView = require("react-free-scrollbar").default;

@firebaseConnect(({map}: {map: Map})=> [
	map && DBPath(`nodes/${map.rootNode}`),
].Where(a=>!!a))
@(connect(({firebase}, {map}: {map: Map})=> ({
	rootNode: map && helpers.dataToJS(firebase, DBPath(`nodes/${map.rootNode}`)),
})) as any)
export default class MapUI extends BaseComponent<{map: Map, rootNode?: MapNode}, {}> {
	/*static childContextTypes = {
		//mapID: PropTypes.number.isRequired,
		map: PropTypes.object,
	};
	getChildContext() {
		let {map} = this.props;
		return {map};
	}*/
	render() {
		let {map, rootNode} = this.props;
		if (map == null)
			return <div>Loading map...</div>;
		if (rootNode == null)
			return <div>Loading root node...</div>;
		return (
			<ScrollView scrollVBarStyles={{width: 10}} backgroundDrag={true}>
				<div style={{margin: "150px 870px"}}>
					<MapNodeUI map={map} nodeID={EStrToInt(map.rootNode)} node={rootNode}/>
				</div>
			</ScrollView>
		);
	}
}