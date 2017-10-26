import {Log} from "../General/Logging";
// React stuff
// ==========

import React from "react";
import {Component} from "react";
import ReactDOM from "react-dom";
import {WaitXThenRun, Timer} from "../General/Timers";
import autoBind from "react-autobind";
import {IsString} from "../General/Types";
import {Assert} from "../General/Assert";
import {E, Global, QuickIncrement} from "../General/Globals_Free";
import ShallowCompare from "react/lib/shallowCompare";
import {FirebaseApplication} from "firebase";
import V from "../V/V";
import classNames from "classnames";
export {ShallowCompare};

//var ReactInstanceMap = require("react/lib/ReactInstanceMap");
g.Extend({ShallowCompare});
g.Extend({React, Text});

export function FindDOM(comp) { return ReactDOM.findDOMNode(comp) as HTMLElement; };
export function FindDOM_(comp) { return $(FindDOM(comp)) as JQuery; };
g.Extend({FindDOM, FindDOM_});
export function FindReact(dom) {
    for (var key in dom)
        if (key.startsWith("__reactInternalInstance$")) {
            var compInternals = dom[key]._currentElement;
			var compWrapper = compInternals._owner;
            var comp = compWrapper._instance;
            //return comp as React.Component<any, any>;
            return comp as BaseComponent<any, any>;
        }
    return null;
}
g.Extend({FindReact});
// needed for wrapper-components that don't provide way of accessing inner-component
export function GetInnerComp(wrapperComp: React.Component<any, any>) {
	return FindReact(FindDOM(wrapperComp)) as any;
}
g.Extend({GetInnerComp});

type numberOrSuch = number | string;
export interface BaseProps {
	m?: numberOrSuch; ml?: numberOrSuch; mr?: numberOrSuch; mt?: numberOrSuch; mb? : numberOrSuch;
	mlr?: numberOrSuch | "margin left-right"; mtb?: numberOrSuch | "margin top-bottom";
	p?: numberOrSuch; pl?: numberOrSuch; pr?: numberOrSuch; pt?: numberOrSuch; pb?: numberOrSuch;
	plr?: numberOrSuch | "padding left-right"; ptb?: numberOrSuch | "padding top-bottom";
	sel?: boolean; ct?: boolean;

	tabLabel?: string; active?: boolean;

	page?; match?;
	//firebase?: FirebaseDatabase;

	// removed, because ReactJS does not recognize "Ref" as special prop like "ref" is 
	//Ref?: (comp: any)=>any;
}
export var basePropFullKeys = {
	m: "margin", ml: "marginLeft", mr: "marginRight", mt: "marginTop", mb: "marginBottom",
	mlr: null, mtb: null,
	p: "padding", pl: "paddingLeft", pr: "paddingRight", pt: "paddingTop", pb: "paddingBottom",
	plr: null, ptb: null,
	sel: null, // selectable
	ct: null, // clickthrough

	tabLabel: null, active: null,

	page: null, match: null,
	firebase: null,
};
function RemoveBasePropKeys(restObj) {
	for (let key in basePropFullKeys)
		delete restObj[key];
}
export function BasicStyles(props) {
	var result: any = {};

	for (let key in props) {
		if (basePropFullKeys[key] != null) {
			let fullKey = basePropFullKeys[key];
			result[fullKey] = props[key];
		} else if (key == "mlr") {
			result.marginLeft = props[key];
			result.marginRight = props[key];
		} else if (key == "mtb") {
			result.marginTop = props[key];
			result.marginBottom = props[key];
		} else if (key == "plr") {
			result.paddingLeft = props[key];
			result.paddingRight = props[key];
		} else if (key == "ptb") {
			result.paddingTop = props[key];
			result.paddingBottom = props[key];
		}
	}

	return result;
}
export function ApplyBasicStyles(target: React.ComponentClass<any>) {
	let oldRender = target.prototype.render;
	target.prototype.render = function() {
		let result = oldRender.call(this) as JSX.Element;

		let props = this.props;
		result.props.className = classNames({selectable: props.sel, clickThrough: props.ct}, result.props.className);
		result.props.style = E(BasicStyles(props), result.props.style);
		RemoveBasePropKeys(result.props);
		
		return result;
	}
}
/*export function ApplyBasicStyles(target: React.ComponentClass<any>, funcName: string) {
	let oldRender = target.prototype.render;
	target.prototype.render = function() {
		let result = oldRender.call(this) as JSX.Element;
		result.props.style = E(BasicStyles(result.props), result.props.style);
		RemoveBasePropKeys(result.props);
		return result;
	}
}*/

export enum RenderSource {
	Mount, // first render, after creation
	PropChange, // from prop-change, and ancestor re-renders (e.g. ancestor.forceUpdate(), ancestor.setState())
	SetState, // from this.SetState()
	Update, // from this.Update()
}
export class BaseComponent<P, S> extends Component<P & BaseProps, S> {
	constructor(props) {
		super(props);
		autoBind(this);
		// if had @Radium decorator, then "this" is actually an instance of a class-specific "RadiumEnhancer" derived-class
		//		so reach in to original class, and set up auto-binding for its prototype members as well
		if (this.constructor.name == "RadiumEnhancer")
			autoBind(Object.getPrototypeOf(this));
		this.state = this.state || {} as any;

		// if using PreRender, wrap render func
		if (this.PreRender != BaseComponent.prototype.PreRender) {
			let oldRender = this.render;
			this.render = function() {
				this.PreRender();
				return oldRender.apply(this, arguments);
			};
		}

		// you know what, let's just always wrap the render() method, in this project; solves the annoying firebase-gobbling-errors issue
		/*let oldRender = this.render;
		this.render = function() {
			try {
				this.PreRender();
				return oldRender.apply(this, arguments);
			} catch (ex) {
				debugger;
				throw ex;
			}
		};*/
	}

	refs;
	timers = [] as Timer[];

	get DOM() { return this.mounted ? FindDOM(this) : null; }
	get DOM_() { return this.mounted ? $(this.DOM) : null; }
	// needed for wrapper-components that don't provide way of accessing inner-component
	//get InnerComp() { return FindReact(this.DOM); }

	// make all these optional, so fits Component type definition/shape
	get FlattenedChildren() {
	    var children = children instanceof Array ? this.props.children : [this.props.children];
	    return React.Children.map((children as any).Where(a=>a), a=>a);
	}

	// helper for debugging
	private GetPropsChanged_lastProps = {};
	GetPropsChanged() {
		let keys = Object.keys(this.props).concat(Object.keys(this.GetPropsChanged_lastProps)).Distinct();
		let result = keys.Where(key=>!Object.is(this.props[key], this.GetPropsChanged_lastProps[key]));
		this.GetPropsChanged_lastProps = {...this.props as any};
		return result;
	}
	GetPropsChanged_Data() {
		return ToJSON(this.props.Including(...this.GetPropsChanged()));
	}
	private GetStateChanged_lastState = {};
	GetStateChanged() {
		let keys = Object.keys(this.state).concat(Object.keys(this.GetStateChanged_lastState)).Distinct();
		let result = keys.Where(key=>!Object.is((this.state as any)[key], this.GetStateChanged_lastState[key]));
		this.GetStateChanged_lastState = {...this.state as any};
		return result;
	}
	GetStateChanged_Data() {
		return ToJSON(this.state.Including(...this.GetStateChanged()));
	}

	forceUpdate(_: ()=>"Do not call this. Call Update() instead.") {
		throw new Error("Do not call this. Call Update() instead.");
	}
	Update(postUpdate?) {
		//if (!this.Mounted) return;
		this.lastRender_source = RenderSource.Update;
		//this.forceUpdate(postUpdate);
		Component.prototype.forceUpdate.call(this, postUpdate);
	}
	Clear(postClear?) {
		var oldRender = this.render;
		this.render = function() {
			this.render = oldRender;
			//WaitXThenRun(0, this.Update);
			WaitXThenRun(0, ()=>this.Update());
			return <div/>;
		};
		postClear();
	}
	ClearThenUpdate() {
		//this.Clear(this.Update);
		this.Clear(()=>this.Update());
	}
	/** Shortcut for "()=>(this.forceUpdate(), this.ComponentWillMountOrReceiveProps(props))". */
	UpdateAndReceive(props) {
		return ()=> {
			//if (!this.Mounted) return;
			//this.forceUpdate();
			Component.prototype.forceUpdate.apply(this, arguments);
			if (this.autoRemoveChangeListeners)
				this.RemoveChangeListeners();
			this.ComponentWillMountOrReceiveProps(props)
		};
	}

	//setState(_: ()=>"Do not call this. Call SetState() instead.") {
	/*setState() {
		throw new Error("Do not call this. Call SetState() instead.");
	}*/
	setState(): "Do not call this. Call SetState() instead." { return null as any; }
	SetState(newState: Partial<S>, callback?: ()=>any, cancelIfStateSame = true, deepCompare = false) {
		if (cancelIfStateSame) {
			// we only care about new-state's keys -- setState() leaves unmentioned keys untouched
			let oldState_forNewStateKeys = this.state.Including(...newState.VKeys());
			if (deepCompare) {
				if (ToJSON(newState) == ToJSON(oldState_forNewStateKeys)) return [];
			} else {
				//if (ShallowEquals(newState, oldState_forNewStateKeys)) return [];
				// use a looser comparison (we want a missing prop to be equivalent to null and undefined)
				let same = true;
				for (let key of this.state.VKeys().concat(newState.VKeys()).Distinct()) {
					let valA = this.state[key as any];
					let valB = newState[key as any];
					if (valA == null && valB == null) continue;

					if (valA !== valB) {
						same = false;
						break;
					}
				}
				if (same) return [];
			}
		}
		
		this.lastRender_source = RenderSource.SetState;
		//this.setState(newState as S, callback);
		Component.prototype.setState.apply(this, arguments);
	}

	changeListeners = [];
	AddChangeListeners(host, ...funcs) {
		if (host == null) return; // maybe temp

	    /*host.extraMethods = funcs;
	    for (let func of funcs)
			this.changeListeners.push({host: host, func: func});*/
	    for (let func of funcs) {
			if (IsString(func))
				func = (func as any).Func(this.Update);
			// if actual function, add it (else, ignore entry--it must have been a failed conditional)
			if (func instanceof Function) {
				//if (!host.HasExtraMethod(func)) {
				host.extraMethod = func;
				this.changeListeners.push({host: host, func: func});
			}
		}
	}
	RemoveChangeListeners() {
		//this.changeListeners = this.changeListeners || []; // temp fix for odd "is null" issue
	    for (let changeListener of this.changeListeners)
	        changeListener.host.removeExtraMethod = changeListener.func;
	    this.changeListeners = [];
	}
	RemoveChangeListenersFor(host) {
	    var changeListenersToRemove = this.changeListeners.Where(a=>a.host == host);
	    for (let changeListener of changeListenersToRemove)
			changeListener.host.removeExtraMethod = changeListener.func;
	    this.changeListeners.RemoveAll(changeListenersToRemove);
	}

	autoRemoveChangeListeners = true;
	ComponentWillMount(): void {};
	ComponentWillMountOrReceiveProps(newProps: any, forMount?: boolean): void {};
	private componentWillMount() {
		if (this.autoRemoveChangeListeners)
			this.RemoveChangeListeners();
		this.ComponentWillMount(); 
		this.ComponentWillMountOrReceiveProps(this.props, true);
		this.lastRender_source = RenderSource.Mount;
	}

	ComponentDidMount(...args: any[]): void {};
	ComponentDidMountOrUpdate(lastProps?: Readonly<P & BaseProps & {children?}>, lastState?: S): void {};
	ComponentDidMountOrUpdate_lastProps: Readonly<P & BaseProps & {children?}>;
	ComponentDidMountOrUpdate_lastState: S;

	mounted = false;
	private componentDidMount(...args) {
		this.ComponentDidMount(...args);
		this.ComponentDidMountOrUpdate(this.ComponentDidMountOrUpdate_lastProps, this.ComponentDidMountOrUpdate_lastState);
		this.ComponentDidMountOrUpdate_lastProps = this.props;
		this.ComponentDidMountOrUpdate_lastState = this.state;
		/*let {Ref} = this.props;
		if (Ref) Ref(this);*/
		this.mounted = true;
		this.CallPostRender();
	}

	ComponentWillUnmount(): void {};
	private componentWillUnmount() {
		this.ComponentWillUnmount();
		for (let timer of this.timers) {
			timer.Stop();
		}
		this.timers = [];
		/*let {Ref} = this.props;
		if (Ref) Ref(null);*/
		this.mounted = false;
	}
	
	ComponentWillReceiveProps(newProps: any[]): void {};
	private componentWillReceiveProps(newProps) {
		if (this.autoRemoveChangeListeners)
			this.RemoveChangeListeners();
		this.ComponentWillReceiveProps(newProps);
		this.ComponentWillMountOrReceiveProps(newProps, false);
		this.lastRender_source = RenderSource.PropChange;
	}
	ComponentDidUpdate(...args: any[]): void {};
	private componentDidUpdate(...args) {
	    this.ComponentDidUpdate(...args);
		this.ComponentDidMountOrUpdate(this.ComponentDidMountOrUpdate_lastProps, this.ComponentDidMountOrUpdate_lastState);
		this.ComponentDidMountOrUpdate_lastProps = this.props;
		this.ComponentDidMountOrUpdate_lastState = this.state;
		this.CallPostRender();
	}

	// whether the current/upcoming render was triggered by a mount or prop-change (as opposed to setState() or forceUpdate())
	lastRender_source: RenderSource;
	private CallPostRender() {
		if (this.PostRender == BaseComponent.prototype.PostRender) return;

		let renderSource = this.lastRender_source;

		let ownPostRender = this.PostRender as any;
		// can be different, for wrapped components (apparently they copy the inner type's PostRender as their own PostRender -- except as a new function, for some reason)
		let prototypePostRender = this.constructor.prototype.PostRender;
		if (ownPostRender.instant || prototypePostRender.instant) {
			this.PostRender(renderSource);
		} else {
			/*if (QuickIncrement("PostRenderLog") <= 1)
				Log("Calling PostRender for: " + this.constructor.name + ";" + V.GetStackTraceStr());*/
			//Log("Calling PostRender for: " + this.constructor.name);
			WaitXThenRun(0, ()=>window.requestAnimationFrame(()=> {
			//WaitXThenRun(0, ()=>g.requestIdleCallback(()=> {
				if (!this.mounted) return;
				this.PostRender(renderSource);
			}));
			/*WaitXThenRun(0, ()=> {
				this.PostRender();
			});*/
		}
	}

	PreRender(): void {};
	PostRender(source?: RenderSource): void {};

	// maybe temp
	/*get Mounted() {
	    return ReactInstanceMap.get(this) != null;
	}*/
}
//global.Extend({Component2: Component, BaseComponent: Component});

export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
		/*if (ShallowCompare(this, newProps, newState))
			Log("Changed: " + this.props.Props().Where(a=>a.value !== newProps[a.name]).Select(a=>a.name) + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));*/
	    return ShallowCompare(this, newProps, newState);
	}
}
//export function SimpleShouldUpdate_Overridable(target: Component<{shouldUpdate: (newProps: React.Props<any>, newState: any)=>boolean}, {}>) {
export function SimpleShouldUpdate_Overridable(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
		let {shouldUpdate} = newProps;
		if (typeof shouldUpdate == "boolean")
			return shouldUpdate;
		if (typeof shouldUpdate == "function")
			return shouldUpdate(newProps, newState);
	    return ShallowCompare(this, newProps, newState);
	}
}

// for PostRender() func
export function Instant(target, name) {
	target[name].instant = true;
}

@Global
@ApplyBasicStyles
export class Span extends BaseComponent<{pre?} & React.HTMLProps<HTMLSpanElement>, {}> {
    render() {
		var {pre, style, ...rest} = this.props;
        return <span {...rest} style={E(style, pre && {whiteSpace: "pre"})}/>;
    }
}

@Global
@ApplyBasicStyles
export class Pre extends BaseComponent<{allowWrap?: boolean} & React.HTMLProps<HTMLSpanElement>, {}> {
	render() {
		let {allowWrap, style, children, ...rest} = this.props;
		return <span {...rest} style={E({whiteSpace: allowWrap ? "pre-wrap" : "pre"}, style)}>{children}</span>;
	}
}

@Global
//@SimpleShouldUpdate_Overridable // we can't make these "pure", as their children may need updating
@ApplyBasicStyles
export class Div extends BaseComponent<{shouldUpdate?} & React.HTMLProps<HTMLDivElement>, {}> {
	shouldComponentUpdate(nextProps, nextState) {
		let {shouldUpdate} = this.props;
		return shouldUpdate ? shouldUpdate(nextProps, nextState) : true;
		//return (shouldUpdate && shouldUpdate(nextProps, nextState)) || ShallowCompare(this, nextProps, nextState);
	}
	render() {
		let {shouldUpdate, style, ...rest} = this.props;
		return <div {...rest} style={style}/>;
	}
}

export function ShallowEquals(objA, objB) {
	if (objA === objB) return true;

	const keysA = Object.keys(objA || {});
	const keysB = Object.keys(objB || {});
	if (keysA.length !== keysB.length) return false;

	// Test for A's keys different from B.
	const hasOwn = Object.prototype.hasOwnProperty;
	for (let i = 0; i < keysA.length; i++) {
		if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
			return false;
		}

		const valA = objA[keysA[i]];
		const valB = objB[keysA[i]];
		if (valA !== valB) return false;
	}

	return true;
}
G({ShallowChanged});
export function ShallowChanged(objA, objB, ...propsToCompareMoreDeeply: string[]) {
	if (propsToCompareMoreDeeply.length) {
		if (ShallowChanged(objA.Excluding(...propsToCompareMoreDeeply), objB.Excluding(...propsToCompareMoreDeeply))) {
			return true;
		}

		for (let key of propsToCompareMoreDeeply) {
			// for "children", shallow-compare at two levels deeper
			if (key == "children") {
				for (let childKey of (objA.children || {}).VKeys().concat((objB.children || {}).VKeys())) {
					if (ShallowChanged(objA.children[childKey], objB.children[childKey])) return true;
				}
			} else {
				if (ShallowChanged(objA[key], objB[key])) return true;
			}
		}
		return false;
	}
	return !ShallowEquals(objA, objB);
}

//require("./GlobalStyles");

let loaded = false;
export function AddGlobalElement(html) {
	/*$(()=> {
        $(html).appendTo("#hidden_early");
    });*/
	let proceed = ()=> {
		loaded = true;
		let nodeType = html.trim().substring(1, html.trim().IndexOfAny(" ", ">"));
		let element = document.createElement(nodeType);
		document.querySelector("#hidden_early").appendChild(element);
		element.outerHTML = html;
	};
	if (loaded)
		proceed();
	else
		window.addEventListener("load", proceed);
};
export function AddGlobalStyle(str) {
    AddGlobalElement(`
<style>
${str}
</style>
	`);
};

/*AddGlobalStyle(`
*:not(.ignoreBaseCSS) {
	color: rgba(255,255,255,.7);
}
`);*/

//var classNames = require("classnames");
export function Classes(...entries: (string | {[s: string]: boolean})[]) {
	let result = "";
	for (let entry of entries) {
		if (IsString(entry)) {
			result += (result.length ? " " : "") + entry.trim();
		} else {
			for (let key in entry) {
				if (entry[key]) {
					result += (result.length ? " " : "") + key;
				}
			}
		}
	}
	return result;
}

/** Tunnels into Radium wrapper-class, and retrieves the original class, letting you access its static props. */
/*export function PreRadium<T>(typeGetterFunc: ()=>T, setFunc: Function): T {
	WaitXThenRun(0, ()=> {
		debugger;
		let type = typeGetterFunc() as any;
		setFunc(type.DecoratedComponent);
	});
	return {} as any;
}*/
/*export function PreRadium<T>(_: T, wrapperClass: Function): T {
	return (wrapperClass as any).DecoratedComponent;
}*/

export type RouteProps = {match};

export function GetErrorMessagesUnderElement(element) {
	return $(element).find(":invalid").ToList().map(node=>(node[0] as any).validationMessage || `Invalid value.`);
}

function HasSealedProps(target: Object) {
	let oldConstructor = target.constructor;
	target.constructor = function() {
		for (let key in target["prototype"]) {
			let method = target["prototype"][key];
			if (method.sealed) {
				Assert(this[key] == method, `Cannot override sealed method "${key}".`);
			}
		}
		return oldConstructor.apply(this, arguments);
	};
}
function Sealed(target: Object, key: string) {
	target[key].sealed = true;
}