var path = require("path");
var webpack = require("webpack");

let QUICK = process.env.QUICK;

module.exports = {
	entry: {
		vendor: [path.join(__dirname, "Vendors.js")]
	},
	output: {
		path: path.join(__dirname, "dist", "dll"),
		//filename: "dll.[name].js?[chunkhash]",
		//filename: "dll.[name].js?[hash]",
		filename: "dll.[name].js",
		library: "[name]"
	},
	//devtool: "cheap-module-source-map",
	devtool: "source-map",
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dll", "[name]-manifest.json"),
			name: "[name]",
			context: path.resolve(__dirname, "Source")
		}),
		//new webpack.optimize.OccurenceOrderPlugin(),
		//new webpack.optimize.DedupePlugin(),
		QUICK ? ()=>{} : new webpack.optimize.UglifyJsPlugin({
			compress: {
				unused: true,
				dead_code: true,
				warnings: false,
				keep_fnames: true,
			},
			mangle: {
				keep_fnames: true,
			},
			sourceMap: true,
		})
	],
	resolve: {
		modules: [
			path.resolve(__dirname, "Source"),
			"node_modules",
		],
	},
	module: {
		loaders: [
			{
				test: /\.json$/,
				loader: "json-loader"
			},
		]
	}
};