import {BaseComponent, Pre} from "../UI/ReactGlobals";
import {ButtonProps} from "./Button";
import Button from "./Button";
import ReactTooltip from "react-tooltip";

type EffectType = "float" | "solid";
class TooltipInfo {
	constructor(text: string, effect: EffectType) {
		this.text = text;
		this.effect =	effect;
		this.id = ++lastTipID;
	}
	id: number;
	get IDStr() { return "tooltip_" + this.id; }
	text: string;
	effect: EffectType;
}
let tooltips = [] as TooltipInfo[];

let lastTipID = -1;
export default class InfoButton extends BaseComponent<{text: string, effect?: EffectType} & ButtonProps, {}> {
	static defaultProps = {effect: "solid"};

	ComponentWillMountOrReceiveProps(props) {
		if (this.tooltip) this.DestroyTooltip();
		this.CreateTooltip(props);
	}
	ComponentWillUnmount() {
		this.DestroyTooltip();
	}

	tooltip: TooltipInfo;
	DestroyTooltip() {
		tooltips.Remove(this.tooltip);
		this.tooltip = null;
	}
	CreateTooltip(props) {
		let {text, effect} = props;
		this.tooltip = new TooltipInfo(text, effect);
		tooltips.push(this.tooltip);
		if (InfoButton_TooltipWrapper.main) {
			InfoButton_TooltipWrapper.main.Update(()=>ReactTooltip.rebuild());
		}
	}

	render() {
		let {text, effect, ...rest} = this.props;
		return (
			<Button {...rest as any} size={13} iconSize={13} iconPath="/Images/Buttons/Info.png"
					useOpacityForHover={true} style={{position: `relative`, zIndex: 1, marginLeft: 1, backgroundColor: null, boxShadow: null}}
					//title={text}
					data-tip data-for={this.tooltip.IDStr}>
				{/*<ReactTooltip id={tipID} effect={effect}>
					<Pre>{text}</Pre>
				</ReactTooltip>*/}
			</Button>
		);
	}
}

// we have to use an outside-of-scrollview tooltip-wrapper, because "position: fixed" does not work under an element with "willChange: transform" 
export class InfoButton_TooltipWrapper extends BaseComponent<{}, {}> {
	static main: InfoButton_TooltipWrapper;
	ComponentDidMount() {
		InfoButton_TooltipWrapper.main = this;
	}
	ComponentWillUnmount() {
		InfoButton_TooltipWrapper.main = null;
	}
	render() {
		return (
			<div>
				{tooltips.map((tooltip, index)=> {
					return (
						<ReactTooltip key={index} id={tooltip.IDStr} effect={tooltip.effect}>
							<Pre>{tooltip.text}</Pre>
						</ReactTooltip>
					);
				})}
			</div>
		);
	}
}