// class/function tags
// ==========

/*export function Global(...args) {
	if (!(args[0] instanceof Function)) { // if decorator's being early-called, to provide args
		var [receiveClassFunc] = args;
		return (...args2)=> {
			var [target] = args2;
			receiveClassFunc(target);
			Global(...args2);
		};
	}

	var [target] = args as [Function];

	var name = target.GetName();
	//console.log("Globalizing: " + name);
	g[name] = target;
}*/
export function Global(target: Function) {
	var name = target.GetName();
	//console.log("Globalizing: " + name);
	g[name] = target;
}

export function Grab(grabFunc) {
	return target=>grabFunc(target);
}

/*export function SimpleShouldUpdate(target) {
	target.prototype.shouldComponentUpdate = function(newProps, newState) {
	    return ShallowCompare(this, newProps, newState);
		/*var result = ShallowCompare(this, newProps, newState);
		g.Log(result + ";" + g.ToJSON(this.props) + ";" + g.ToJSON(newProps));
		return result;*#/
	}
}*/

// property tags
// ==========

// add to prop to say "don't set the attachPoint prop, and don't call the PreAdd, PostAdd, and such methods)
export class NoAttach {}
export function _NoAttach() {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new NoAttach());
    };
};

export class ByPath extends NoAttach {
    constructor(saveNormallyForParentlessNode = false) {
        super();
        this.saveNormallyForParentlessNode = saveNormallyForParentlessNode;
    }
	saveNormallyForParentlessNode = false;
};
export function _ByPath(saveNormallyForParentlessNode = false) {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new ByPath(saveNormallyForParentlessNode));
    };
};

// maybe temp
export class ByPathStr extends ByPath {
    constructor(saveNormallyForParentlessNode = false) {
        super(saveNormallyForParentlessNode);
    }
};
export function _ByPathStr(saveNormallyForParentlessNode = false) {
	return (target, name)=> {
		var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
	    propInfo.AddTags(new ByPathStr(saveNormallyForParentlessNode));
	};
};

// save name of Node in prop, rather than the actual data in that Node
export class ByName extends NoAttach {}
export function _ByName() {
    return (target, name)=> {
        var propInfo = VDFTypeInfo.Get(target.constructor).GetProp(name);
        propInfo.AddTags(new ByName());
    };
};

// method tags
// ==========

export class IgnoreStartData {}
export function _IgnoreStartData() {
    return (target, name)=>target[name].AddTags(new IgnoreStartData());
};
export class IgnoreSetItem {}

// others
// ==========

export var vsInitFuncs = [];

// polyfills for constants
// ==========

if (Number.MIN_SAFE_INTEGER == null)
	(Number as any).MIN_SAFE_INTEGER = -9007199254740991;
if (Number.MAX_SAFE_INTEGER == null)
	(Number as any).MAX_SAFE_INTEGER = 9007199254740991;

//function Break() { debugger; };
export function Debugger(...args) { debugger; }
export function Debugger_Wrap(arg1, ...args) { debugger; return arg1; }
export function Debugger_True(...args) { debugger; return true; }
export function Debugger_If(condition, ...args) {
    if (condition)
        debugger;
}
export function WrapWithDebugger(func, ...args) {
	return function() {
		debugger;
		func.apply(this, arguments);
	};
}
G({Debugger, Debugger_Wrap, Debugger_True, Debugger_If, WrapWithDebugger});

//var quickIncrementValues = {};
export function QuickIncrement(name = new Error().stack.split("\n")[2]) {
	QuickIncrement["values"][name] = (QuickIncrement["values"][name]|0) + 1;
	return QuickIncrement["values"][name];
}
QuickIncrement["values"] = [];
G({QuickIncrement});

// general
// ==========

G({E});
export function E(...objExtends: any[]) {
    var result = {};
    for (var extend of objExtends)
        result.Extend(extend);
	return result;
	//return StyleSheet.create(result);
}
// for react-native-chart modifications...

// methods: url writing/parsing
// ==================

export var inFirefox = navigator.userAgent.toLowerCase().Contains("firefox");

// others
// ==================

/*export var inTestMode = true; //GetUrlVars(CurrentUrl()).inTestMode == "true";
export function InTestMode() { return inTestMode; }*/

export var blockCSCalls = false;

export var loadTime = Date.now();
/*setTimeout(()=> {
	$(()=> {
		loadTime = Date.now();
	});
});*/
export function GetTimeSinceLoad() {
	return (Date.now() - loadTime) / 1000;
}

//window.evalOld = window.eval;
//window.eval = function() { try { evalOld.apply(this, arguments); } catch(error) { Log("JS error: " + error); }};

/*window.evalOld = eval;
window.eval = function(code) {
    if (true) { //new Error().stack.Contains("Packages/VDF")) //!code.Contains(";") && code != "CallCS_Callback")
        window.lastSpecialEvalExpression = code;
        window.lastSpecialEvalStack = new Error().stack;
        //window.evalStacks = window.evalStacks || [];
        //window.evalStacks.push(new Error().stack);
        window.evalExpressionsStr += code + "\n";
        window.evalStacksStr += new Error().stack + "\n";
    }
    return evalOld.apply(this, arguments);
};*/

/*export function EStrToInt(eStr: string) {
	return parseInt(eStr.substr(1));
}
export function IntToEStr(int: number) {
	return "e" + int;
}*/

// another way to require at runtime -- with full paths
//g.RequireTest = (require as any).context("../../", true, /\.tsx?$/);