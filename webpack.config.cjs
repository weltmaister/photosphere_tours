const path = require('path')

const appId = 'photosphere_tours'

module.exports = (env, argv) => ({
	target: 'web',
	entry: {
		main: path.join(__dirname, 'src', 'main.js'),
	},
	output: {
		path: path.join(__dirname, 'js'),
		filename: `${appId}-[name].js`,
		chunkFilename: `${appId}-[name].js?v=[contenthash]`,
		clean: true,
	},
	devtool: argv.mode === 'development' ? 'cheap-source-map' : 'source-map',
	module: {
		rules: [
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	resolve: {
		// sax (via @nextcloud/files and is-svg) only needs streams for an API we never call
		fallback: { stream: false },
	},
	performance: {
		// the viewer chunk carries three.js and is only loaded on demand
		hints: false,
	},
})
