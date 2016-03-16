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

/**
 * Default Task: watch
 */
x.default = function * () {
	yield this.start('watch');
};

/**
 * Run a dev server & Recompile when files change
 */
x.watch = function * () {
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

/**
 * Build the production files
 */
x.build = function * () {
	isProd = true;
	isWatch = false;
	yield this.start('clean');
	yield this.start(['lint', 'fonts', 'html', 'extras'], {parallel: true});
	yield this.start(['images', 'styles', 'scripts', 'vendor']);
	yield this.start('rev');
};

// ###
// # Tasks
// ###

// Delete the output directories
x.clean = function * () {
	yield this.clear([dest, tmp]);
};

// Copy all images, compress them, then send to dest
x.images = function * () {
	yield this.source(src.images)
		.target(dest + '/img', {depth: 1});
	return reload();
};

// Copy all fonts, then send to dest
x.fonts = function * () {
	yield this.source(src.fonts)
		.target(dest + '/fonts', {depth: 0});
	return reload();
};

// Scan your HTML for assets & optimize them
x.html = function * () {
	yield this.source(src.html).target(dest);
	return isProd ? yield this.start('htmlmin') : reload();
};

x.htmlmin = function * () {
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
	yield this.source(src.extras).target(dest);
};

// Lint javascript
x.lint = function * () {
	yield this.source(src.scripts + '.js').xo({
		globals: ['navigator', 'window', 'document'],
		rules: {
			// custom rule overrides
		}
	});
};

// Compile scripts
x.scripts = function * () {
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
		.concat('main.js')
		.target(dest + '/js');

	return isProd ? yield this.start('uglify') : reload();
};

// Copy Vendor scripts
x.vendor = function * () {
	yield this.source(src.vendor)
		.concat('vendor.js')
		.target(dest + '/js/lib', {depth: 0});
};

// Minify, Trim, and Obfuscate scripts
x.uglify = function * () {
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
		.target(dest = '/js');
};

// Compile and automatically prefix stylesheets
x.styles = function * () {
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

// Version these assets (Cache-busting)
x.rev = function * () {
	var paths = ['js', 'css'].map(function (el) {
		return dest + '/' + el + '/**/*.*';
	});

	return this.source(paths).rev({
		replace: true,
		base: dest
	});
};

// Cache assets so they are available offline!
x.cache = function * () {
	yield this
		.source(dest + '/**/*.{js,html,css,png,jpg,gif}')
		.precache({
			root: dest,
			cacheId: 'fly-kit-imba',
			stripPrefix: dest
		});
};

// Launch loacl serve at develop directory
x.serve = function * () {
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
