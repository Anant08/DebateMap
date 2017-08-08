import {BaseComponent, RouteProps, Div} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import AdminUI from "./More/Admin";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {IsUserAdmin} from "../Store/firebase/userExtras";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUserID, GetUserPermissionGroups, GetUsers} from "../Store/firebase/users";
import {styles} from "../Frame/UI/GlobalStyles";
import {connect} from "react-redux";
import {RootState} from "../Store/index";
import LinksUI from "./More/Links";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";
import Switch from "Frame/ReactComponents/Switch";
import {Fragment} from "redux-little-router";

type Props = {} & Partial<{currentSubpage: string, userCount: number}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.more.subpage),
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
	userCount: (GetUsers() || []).length,
}))
export default class MoreUI extends BaseComponent<Props, {}> {
	render() {
		let {userCount, currentSubpage, children} = this.props;
		let page = "more";
		let admin = IsUserAdmin(GetUserID());
		return (
			<Column style={{flex: 1}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="links" text="Links"/>
					{admin && <SubNavBarButton {...{page}} subpage="admin" text="Admin"/>}
				</SubNavBar>
				<ScrollView style={{flex: 1} /*styles.fillParent_abs*/} scrollVBarStyle={{width: 10}}>
					<Switch>
						{/*<Fragment forRoute="/admin">
							<AdminUI/>
						</Fragment>*/}
						{/*<Route path="/more/admin"><AdminUI/></Route>*/}
						{currentSubpage == "admin" && <AdminUI/>}
						<LinksUI/>
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}