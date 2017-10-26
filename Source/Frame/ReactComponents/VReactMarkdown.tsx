import ReactMarkdown, {ReactMarkdownProps} from "react-markdown";
import {BaseComponent, ShallowChanged} from "../UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import {Segment, ParseSegmentsForPatterns} from "../General/RegexHelpers";
import {URL, GetCurrentURL} from "../General/URLs";
import Link from "./Link";

export type ReplacementFunc = (segment: Segment, index: number, extraInfo)=>JSX.Element;

export default class VReactMarkdown extends BaseComponent
		<{source: string, replacements?: {[key: string]: ReplacementFunc}, extraInfo?, style?} & ReactMarkdownProps,
		{}> {
	render() {
		let {source, replacements, extraInfo, style, containerProps, renderers, ...rest} = this.props;

		let containerProps_final = {...containerProps};
		containerProps_final.style = E(containerProps_final.style, style);

		let renderers_final = {...renderers};
		renderers_final.Link = renderers_final.Link || (props=> {
			let {href, target, ...rest} = props;
			let toURL = URL.Parse(href);
			if (target == null && toURL.domain != GetCurrentURL().domain) {
				target = "_blank";
			}
			return <Link {...rest} to={href} target={target}/>;
		});

		if (replacements) {
			let patterns = replacements.VKeys().map((regexStr, index)=>({name: index+"", regex: new RegExp(regexStr)}));
			let segments = ParseSegmentsForPatterns(source, patterns);
			return (
				<div>
					{segments.map((segment, index)=> {
						if (segment.patternMatched == null) {
							if (replacements.default) {
								return replacements.default(segment, index, extraInfo).VAct(a=>a.key = index);
							}
							let text = segment.textParts[0].replace(/\r/g, "");
							return (
								<ReactMarkdown {...rest} key={index} source={text} renderers={renderers_final}
									containerProps={{
										style: E({
											marginTop: text.startsWith("\n\n") ? 15 : text.startsWith("\n") ? 5 : 0,
											marginBottom: text.endsWith("\n\n") ? 15 : text.endsWith("\n") ? 5 : 0,
										}),
									}}/>
							);
						}
						let renderFuncForReplacement = replacements.VValues()[segment.patternMatched] as ReplacementFunc;
						return renderFuncForReplacement(segment, index, extraInfo).VAct(a=>a.key = index);
					})}
				</div>
			);
		}

		return <ReactMarkdown {...rest} source={source} containerProps={containerProps_final} renderers={renderers_final}/>;
	}
}