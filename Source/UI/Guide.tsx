import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";

export default class GuideUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Guide page is under development.
			</Div>
		);
	}
}