import {NodeType} from "react-markdown";
import {Log} from "../General/Logging";
import {Assert} from "../../Frame/General/Assert";
import {IsPrimitive, IsString} from "../General/Types";

export default class V {
	static minInt = Number.MIN_SAFE_INTEGER;
	static maxInt = Number.MAX_SAFE_INTEGER;
	//static emptyString_truthy = []; // not really a string, but ([] + "") == "", and [] is truthy (ie, !![] == true)

	static Distance(point1, point2) {
		var width = Math.abs(point2.x - point1.x);
		var height = Math.abs(point2.y - point1.y); 
		return Math.sqrt(width * width + height * height);
	}

	static AsArray(args) { return V.Slice(args, 0); };
	//s.ToArray = function(args) { return s.Slice(args, 0); };
	static Slice(args, start, end?) { return Array.prototype.slice.call(args, start != null ? start : 0, end); };

	static PropNameToTitle(propName: string) {
		// demo string: somePropName
		return propName
			// somePropName -> some prop name
			.replace(/[A-Z]/g, a=>" " + a.toLowerCase())
			// some prop name -> Some prop name
			.replace(/^./, a=>a.toUpperCase());
	}

	/*static startupInfo = null;
	static startupInfoRequested = false;
	static postStartupInfoReceivedFuncs = [];
	static WaitForStartupInfoThenRun(func) {
		if (startupInfo)
			func(startupInfo);
		else
			V.postStartupInfoReceivedFuncs.push(func);
	}*/
	
	// example:
	// var multilineText = V.Multiline(function() {/*
	//		Text that...
	//		spans multiple...
	//		lines.
	// */});
	static Multiline(functionWithInCommentMultiline, useExtraPreprocessing) {
		useExtraPreprocessing = useExtraPreprocessing != null ? useExtraPreprocessing : true;

		var text = functionWithInCommentMultiline.toString().replace(/\r/g, "");

		// some extra preprocessing
		if (useExtraPreprocessing) {
			text = text.replace(/@@.*/g, ""); // remove single-line comments
			//text = text.replace(/@\**?\*@/g, ""); // remove multi-line comments
			text = text.replace(/@\*/g, "/*").replace(/\*@/g, "*/"); // fix multi-line comments
		}

		var firstCharPos = text.indexOf("\n", text.indexOf("/*")) + 1;
		return text.substring(firstCharPos, text.lastIndexOf("\n"));
	}
	static Multiline_NotCommented(functionWithCode) {
		var text = functionWithCode.toString().replace(/\r/g, "");
		var firstCharOfSecondLinePos = text.indexOf("\n") + 1;
		var enderOfSecondLastLine = text.lastIndexOf("\n");
		var result = text.substring(firstCharOfSecondLinePos, enderOfSecondLastLine);

		result = result.replace(/\t/g, "    ");
		// replace the start and end tokens of special string-containers (used for keeping comments in-tact)
		result = result.replace(/['"]@((?:.|\n)+)@['"];(\n(?=\n))?/g, (match, sub1)=>sub1.replace(/\\n/, "\n"));

		return result;
	}

	static StableSort(array, compare) { // needed for Chrome
		var array2 = array.map((obj, index)=>({index: index, obj: obj}));
		array2.sort((a, b)=> {
			var r = compare(a.obj, b.obj);
			return r != 0 ? r : V.Compare(a.index, b.index);
		});
		return array2.map(pack=>pack.obj);
	}
	static Compare(a, b, caseSensitive = true) {
		if (!caseSensitive && typeof a == "string" && typeof b == "string") {
			a = a.toLowerCase();
			b = b.toLowerCase();
		}
		return a < b ? -1 : (a > b ? 1 : 0);
	}

	// just use the word 'percent', even though value is represented as fraction (e.g. 0.5, rather than 50[%])
	static Lerp(from, to, percentFromXToY) { return from + ((to - from) * percentFromXToY); }
	static GetPercentFromXToY(start, end, val, clampResultTo0Through1 = true) {
		// distance-from-x / distance-from-x-required-for-result-'1'
		var result = (val - start) / (end - start);
		if (clampResultTo0Through1)
			result = result.KeepBetween(0, 1);
		return result;
	}

	static GetXToY(minX, maxY, interval = 1) {
		var result = [];
		for (var val = minX; val <= maxY; val += interval) {
			result.push(val);
		}
		return result;
	}
	static GetXToYOut(minX, maxOutY, interval = 1) {
		var result = [];
		for (var val = minX; val < maxOutY; val += interval) {
			result.push(val);
		}
		return result;
	}

	static CloneObject(obj, propMatchFunc?: Function, depth = 0) {
	    Assert(depth < 100, "CloneObject cannot work past depth 100! (probably circular ref)");

		if (obj == null)
			return null;
		if (IsPrimitive(obj))
			return obj;
		//if (obj.GetType() == Array)
		if (obj.constructor == Array)
			return V.CloneArray(obj);
		if (obj instanceof List)
			return List.apply(null, [obj.itemType].concat(V.CloneArray(obj)));
	    if (obj instanceof Dictionary) {
	        let result = new Dictionary(obj.keyType, obj.valueType);
	        for (let pair of obj.Pairs)
	            result.Add(pair.key, pair.value);
	        return result;
	    }

	    let result = {};
		for (let prop of obj.Props()) {
			if (!(prop.value instanceof Function) && (propMatchFunc == null || propMatchFunc.call(obj, prop.name, prop.value)))
				result[prop.name] = V.CloneObject(prop.value, propMatchFunc, depth + 1);
		}
		return result;
	}
	static CloneArray(array) {
		//array.slice(0); //deep: JSON.parse(JSON.stringify(array));
		return Array.prototype.slice.call(array, 0);
	}
	/*static IsEqual(a, b) {
		function _equals(a, b) { return JSON.stringify(a) === JSON.stringify($.extend(true, {}, a, b)); }
		return _equals(a, b) && _equals(b, a);
	};*/

	static GetStackTraceStr(stackTrace?: string, sourceStackTrace?: boolean);
	static GetStackTraceStr(sourceStackTrace?: boolean);
	static GetStackTraceStr(...args) {
	    if (IsString(args[0])) var [stackTrace, sourceStackTrace = true] = args;
	    else var [sourceStackTrace = true] = args;

		//stackTrace = stackTrace || new Error()[sourceStackTrace ? "Stack" : "stack"];
		stackTrace = stackTrace || new Error().stack;
		return stackTrace.substr(stackTrace.IndexOf_X(1, "\n")); // remove "Error" line and first stack-frame (that of this method)
	}
	static LogStackTrace() { Log(V.GetStackTraceStr()); }

	static Bind<T extends Function>(func: T, newThis: any): T {
		return func.bind(newThis);
	}

	/*static ForEachChildInTreeXDoY(treeX: any, actionY: (value, key: string)=>void) {
		for (let key in treeX) {
			let value = treeX[key];
			actionY(value, key);
			if (typeof value == "object" || value instanceof Array)
				V.ForEachChildInTreeXDoY(value, actionY);
		}
	}*/

	static GetContentSize(content) {
		/*var holder = $("#hiddenTempHolder");
		var contentClone = content.clone();
		holder.append(contentClone);
		var width = contentClone.outerWidth();
		var height = contentClone.outerHeight();
		contentClone.remove();*/

		var holder = $("<div id='hiddenTempHolder2' style='position: absolute; left: -1000; top: -1000; width: 1000; height: 1000; overflow: hidden;'>").appendTo("body");
		var contentClone = content.clone();
		holder.append(contentClone);
		var width = contentClone.outerWidth() as number;
		var height = contentClone.outerHeight() as number;
		holder.remove();

		return {width, height};
	};
	static GetContentWidth(content) { return V.GetContentSize(content).width; };
	static GetContentHeight(content) { return V.GetContentSize(content).height; };
}

export class TreeNode {
	constructor(ancestorNodes: TreeNode[], obj, prop) {
		this.ancestorNodes = ancestorNodes;
		this.obj = obj;
		this.prop = prop;
	}

	ancestorNodes: TreeNode[];
	get PathNodes(): string[] {
		if (this.prop == "_root") return [];
		return this.ancestorNodes.Select(a=>a.prop).concat(this.prop);
	}
	get PathStr() {
		return this.PathNodes.join("/");
	}
	get PathStr_Updeep() {
		return this.PathNodes.join(".");
	}

	obj;
	prop;
	//value;
	get Value() {
		if (this.obj == null)
			return undefined;
		return this.obj[this.prop];
	}
	set Value(newVal) {
		this.obj[this.prop] = newVal;
	}
}
export function GetTreeNodesInObjTree(obj: any, includeRootNode = false, _ancestorNodes = []) {
	if (_ancestorNodes.length > 300) debugger;

	let result = [] as TreeNode[];
	if (includeRootNode)
		result.push(new TreeNode([], {_root: obj}, "_root"));
	for (let key in obj) {
		let value = obj[key];
		let currentNode = new TreeNode(_ancestorNodes, obj, key);
		result.push(currentNode);
		if (typeof value == "object")
			result.AddRange(GetTreeNodesInObjTree(value, false, _ancestorNodes.concat(currentNode)));
	}
	return result;
}

/*export function CloneTreeDownToXWhileReplacingXValue(treeRoot, pathToX: string, newValueForX) {
	let pathNodes = pathToX.split("/");
	let currentPathNode = pathNodes[0];
	let currentPathNode_newValue = pathNodes.length > 1
		? CloneTreeDownToXWhileReplacingXValue(treeRoot[currentPathNode], pathNodes.Skip(1).join("/"), newValueForX)
		: newValueForX;
	return {...treeRoot, [currentPathNode]: currentPathNode_newValue};
}*/

export function GetTreeNodesInPath(treeRoot, pathNodesOrStr: string[] | string, includeRootNode = false, _ancestorNodes = []) {
	let descendantPathNodes = pathNodesOrStr instanceof Array ? pathNodesOrStr : pathNodesOrStr.split("/");
	let childTreeNode = new TreeNode(_ancestorNodes, treeRoot, descendantPathNodes[0]);
	var result = [];
	if (includeRootNode)
		result.push(new TreeNode([], {_root: treeRoot}, "_root"));
	result.push(childTreeNode);
	if (descendantPathNodes.length > 1) // if the path goes deeper than the current child-tree-node
		result.push(...GetTreeNodesInPath(childTreeNode ? childTreeNode.Value : null, descendantPathNodes.Skip(1).join("/"), false, _ancestorNodes.concat(childTreeNode)));
	return result;
}
/*export function GetTreeNodesInPath_WithRoot(treeRoot, path: string) {
	return GetTreeNodesInPath({root: treeRoot}, "root/" + path).Skip(1);
}*/

export function VisitTreeNodesInPath(treeRoot, pathNodesOrStr: string[] | string, visitFunc: (node: TreeNode)=>any, visitRootNode = false, _ancestorNodes = []) {
	if (visitRootNode)
		visitFunc(new TreeNode([], {_root: treeRoot}, "_root"));
	let descendantPathNodes = pathNodesOrStr instanceof Array ? pathNodesOrStr : pathNodesOrStr.split("/");
	let childTreeNode = new TreeNode(_ancestorNodes, treeRoot, descendantPathNodes[0]);
	visitFunc(childTreeNode);
	if (descendantPathNodes.length > 1) // if the path goes deeper than the current child-tree-node
		VisitTreeNodesInPath(childTreeNode.Value, descendantPathNodes.Skip(1).join("/"), visitFunc, false, _ancestorNodes.concat(childTreeNode));
	return treeRoot;
}
/*export function VisitTreeNodesInPath_WithRoot(treeRoot, path: string, visitFunc: (node: TreeNode)=>any) {
	VisitTreeNodesInPath({root: treeRoot}, "root/" + path, visitFunc);
	return treeRoot;
}*/