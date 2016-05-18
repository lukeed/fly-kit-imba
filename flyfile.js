var x = module.exports;
var browserSync = require('browser-sync');

var isProd = false;
var isWatch = false;
var isServer = false;

var app = 'app';
var tmp = '.tmp';
var dest = 'dist';
var node = 'node_modules';

var src = {
	html: app + '/*.html',
	styles: app + '/styles',
	scripts: app + '/scripts/**/*',
	images: app + '/images/**/*.{png,gif,jpg,svg}',
	fonts: app + '/fonts/**/*.{eot,woff,ttf,svg}',
	extras: app + '/*.{txt,json,webapp,ico}',
	vendor: [
		node + '/imba/dist/imba.js',
	]
};

x.default = function * () {
	/** @desc Default Task: `watch` */
	yield this.start('watch');
};

x.watch = function * () {
	/** @desc Main Task: Starts a server & Recompiles files on change */
	isWatch = true;
	isProd = false;
	yield this.start('clean');
	yield this.watch(src.scripts, ['lint', 'scripts']);
	yield this.watch(src.styles + '/**/*.{sass,css,scss}', 'styles');
	yield this.watch(src.images, 'images');
	yield this.watch(src.fonts, 'fonts');
	yield this.watch(src.html, 'html');
	yield this.start(['vendor', 'extras', 'serve']);
};

x.build = function * () {
	/** @desc Main Task: Build the production files */
	isProd = true;
	isWatch = false;
	yield this.start('clean');
	yield this.start(['lint', 'fonts', 'html', 'extras', 'vendor']);
	yield this.start(['images', 'styles', 'scripts']);
	yield this.start('rev');
	yield this.start('cache');
};

// ###
// # Tasks
// ###

x.clean = function * () {
	/** @desc Delete all files in the `dist` & `.tmp` directories */
	yield this.clear([dest, tmp]);
};

x.images = function * () {
	/** @desc Compress and copy all images to `dist` */
	yield this.source(src.images)
		.target(dest + '/img', {depth: 1});
	return reload();
};

x.fonts = function * () {
	/** @desc Copy all fonts to `dist` */
	yield this.source(src.fonts)
		.target(dest + '/fonts', {depth: 0});
	return reload();
};

x.html = function * () {
	/** @desc Copy all HTML files to `dist`. Will run `htmlmin` during `build` task. */
	yield this.source(src.html).target(dest);
	return isProd ? yield this.start('htmlmin') : reload();
};

x.htmlmin = function * () {
	/** @desc Minify all HTML files already within `dist`. Production only */
	yield this.source(dest + '/*.html')
		.htmlmin({
			removeComments: true,
			collapseWhitespace: true,
			collapseBooleanAttributes: true,
			removeAttributeQuotes: true,
			removeRedundantAttributes: true,
			removeEmptyAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true,
			removeOptionalTags: true
		})
		.target(dest);
};

// Copy other root-level files
x.extras = function * () {
	/** @desc Copy other root-level files to `dist` */
	yield this.source(src.extras).target(dest);
};

x.lint = function * () {
	/** @desc Lint javascript files */

	yield this.source(src.scripts + '.js').xo({
		globals: ['navigator', 'window', 'document'],
		rules: {
			// custom rule overrides
		}
	});
};

x.scripts = function * () {
	/** @desc Compile javascript files with Browserify. Will run `uglify` during `build` task.  */

	// compile imba files separately
	yield this
		.source(src.scripts + '.imba')
		.imba()
		.target(tmp);

	// compile pure js files separately
	yield this.source(src.scripts + '.js')
		.babel({presets: ['es2015']})
		.target(tmp);

	// concat `tmp/js` & send to dist
	yield this.source(tmp + '/*.js')
		.browserify()
		.concat('main.js')
		.target(dest + '/js');

	return isProd ? yield this.start('uglify') : reload();
};

x.vendor = function * () {
	/** @desc Copy and concatenate vendor files to `dist` */
	yield this.source(src.vendor)
		.concat('vendor.js')
		.target(dest + '/js/lib', {depth: 0});
};

x.uglify = function * () {
	/** @desc Minify, compress, and obfuscate all javascript files already within `dist` */
	yield this.source(dest + '/js/*.js')
		.uglify({
			compress: {
				conditionals: true,
				comparisons: true,
				booleans: true,
				loops: true,
				join_vars: true,
				drop_console: true
			}
		})
		.target(dest + '/js');
};

x.styles = function * () {
	/** @desc Compile and prefix stylesheets with vendor properties */
	yield this.source(src.styles + '/app.scss')
		.sass({
			outputStyle: 'compressed',
			includePaths: [src.styles]
		})
		.autoprefixer({
			browsers: [
				'ie >= 10',
				'ie_mob >= 10',
				'ff >= 30',
				'chrome >= 34',
				'safari >= 7',
				'opera >= 23',
				'ios >= 7',
				'android >= 4.4',
				'bb >= 10'
			]
		})
		.concat('main.css')
		.target(dest + '/css');

	return reload();
};

x.rev = function * () {
	/** @desc Version/Hashify production assets. (Cache-Busting) */
	yield this.source(dest + '/{js,css}/**/*')
		.rev({strip: dest})
		.revManifest({dirname: dest})
		.revReplace({dirname: dest})
		.target(dest);
};

x.cache = function * () {
	/** @desc Cache assets so they are available offline! */
	yield this
		.source(dest + '/**/*.{js,html,css,png,jpg,gif}')
		.precache({
			root: dest,
			cacheId: 'fly-kit-imba',
			stripPrefix: dest
		});
};

x.serve = function * () {
	/** @desc Launch a local server from the `dist` directory. */
	isServer = true;

	browserSync({
		notify: false,
		logPrefix: 'Fly',
		server: {
			baseDir: dest
		}
	});
};

// helper, reload browsersync
function reload() {
	if (isWatch && isServer) {
		browserSync.reload();
	}
}
