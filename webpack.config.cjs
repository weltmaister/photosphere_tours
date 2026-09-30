const path = require('path')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')

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
				test: /\.vue$/,
				loader: 'vue-loader',
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				// pdf.js worker (new URL(…, import.meta.url)): ship it as .js so
				// every web server sends it with a JavaScript content type
				test: /pdf\.worker\.min\.mjs$/,
				type: 'asset/resource',
				generator: { filename: `${appId}-pdf-worker-[contenthash:8].js` },
			},
		],
	},
	resolve: {
		extensions: ['.js', '.vue'],
		// sax (via @nextcloud/files and is-svg) only needs streams for an API we never call
		fallback: { stream: false },
	},
	plugins: [
		new VueLoaderPlugin(),
		new webpack.DefinePlugin({
			__VUE_OPTIONS_API__: true,
			__VUE_PROD_DEVTOOLS__: false,
			__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
		}),
	],
	performance: {
		// the viewer chunk carries three.js and is only loaded on demand
		hints: false,
	},
})
