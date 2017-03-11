import {BaseComponent, BaseProps} from "../../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import Button from "../../Frame/ReactComponents/Button";
import VMessageBox from "../../Frame/UI/VMessageBox";
import {MapNode} from "../@Shared/Maps/MapNode";
import {ShowConfirmationBox, ShowMessageBox} from "../../Frame/UI/VMessageBox";

let dbRootVersion = 1;
function DBPath(path: string) {
	return `v${dbRootVersion}/` + path;
}

//interface Object { Ref: ()=>firebase.Database; }
declare global { class FirebaseDatabase_Extensions {
	Ref: (path: string)=>firebase.DatabaseReference;
}}
Object.prototype._AddFunction_Inline = function Ref(path: string) {
	let finalPath = DBPath(path);
	return this.ref(finalPath);
}

@firebaseConnect()
export default class AdminUI extends BaseComponent<{}, {}> {
	render() {
		let {firebase} = this.props;
		return (
			<div>
				<Button text="Reset database" onClick={()=> {
					ShowConfirmationBox({
						title: "Reset database?", message: "This will clear all existing data.",
						onOK: async ()=> {
							await firebase.Ref("nodes").remove();
							let rootNode: MapNode = {
								type: "category",
								title: "Root",
								agrees: 0,
								degree: 0,
								disagrees: 0,
								weight: 0,
								creator: null,
								approved: true,
								accessLevel: 0,
								voteLevel: 0,
								supportChildren: {},
								opposeChildren: {},
								talkChildren: {},
							};
							await firebase.Ref("nodes").push(rootNode);
							ShowMessageBox({message: "Done!"});
						}
					});
				}}/>
			</div>
		);
	}
}