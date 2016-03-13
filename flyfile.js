import browserSync from 'browser-sync';

let isProd = false;
let isWatch = false;
let isServer = false;

const src = 'app';
const tmp = '.tmp';
const dest = 'dist';
const node = 'node_modules';

const paths = {
	html: `${src}/*.html`,
	styles: `${src}/styles`,
	scripts: `${src}/scripts/**/*`,
	images: `${src}/images/**/*.{png,gif,jpg,svg}`,
	fonts: `${src}/fonts/**/*.{eot,woff,ttf,svg}`,
	extras: `${src}/*.{txt,json,webapp,ico}`,
	vendor: [
		`${node}/imba/dist/imba.js`,
	]
};

/**
 * Default Task: watch
 */
export default async function () {
	await this.start('watch');
}

/**
 * Run a dev server & Recompile when files change
 */
export async function watch() {
	isWatch = true;
	isProd = false;
	await this.start('clean');
	await this.watch(`${paths.scripts}`, ['lint', 'scripts']);
	await this.watch(`${paths.styles}/**/*.{sass,css,scss}`, 'styles');
	await this.watch(paths.images, 'images');
	await this.watch(paths.fonts, 'fonts');
	await this.watch(paths.html, 'html');
	await this.start(['vendor', 'extras', 'serve']);
}

/**
 * Build the production files
 */
export async function build() {
	isProd = true;
	isWatch = false;
	await this.start('clean');
	await this.start(['lint', 'fonts', 'html', 'extras'], {parallel: true});
	await this.start(['images', 'styles', 'scripts', 'vendor']);
	await this.start('rev');
}

// ###
// # Tasks
// ###

// Delete the output directories
export async function clean() {
	await this.clear([dest, tmp]);
}

// Copy all images, compress them, then send to dest
export async function images() {
	await this.source(paths.images)
		.target(`${dest}/img`, {depth: 1});
	return reload();
}

// Copy all fonts, then send to dest
export async function fonts() {
	await this.source(paths.fonts)
		.target(`${dest}/fonts`, {depth: 0});
	return reload();
}

// Scan your HTML for assets & optimize them
export async function html() {
	await this.source(paths.html).target(dest);
	return isProd ? await this.start('htmlmin') : reload();
}

export async function htmlmin() {
	await this.source(`${dest}/*.html`)
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
}

// Copy other root-level files
export async function extras() {
	await this.source(paths.extras).target(dest);
}

// Lint javascript
export async function lint() {
	await this.source(`${paths.scripts}.js`).xo({
		globals: ['navigator', 'window', 'document'],
		rules: {
			'no-extra-semi': 1 // warn-only
		}
	});
}

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
		.target(`${dest}/js`);

	return isProd ? await this.start('uglify') : reload();
}

// Copy Vendor scripts
export async function vendor() {
	await this.source(paths.vendor)
		.concat('vendor.js')
		.target(`${dest}/js/lib`, {depth: 0});
}

// Minify, Trim, and Obfuscate scripts
export async function uglify() {
	await this.source(`${dest}/js/*.js`)
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
		.target(`${dest}/js`);
}

// Compile and automatically prefix stylesheets
export async function styles() {
	await this.source(`${paths.styles}/app.scss`)
		.sass({
			outputStyle: 'compressed',
			includePaths: [paths.styles]
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
		.target(`${dest}/css`);

	return reload();
}

// Version these assets (Cache-busting)
export async function rev() {
	const src = ['js', 'css'].map(el => `${dest}/${el}/**/*.*`);
	return this.source(src).rev({
		replace: true,
		base: dest
	});
}

// Cache assets so they are available offline!
export async function cache() {
	await this
		.source(`${dest}/**/*.{js,html,css,png,jpg,gif}`)
		.precache({
			root: dest,
			cacheId: 'fly-kit-imba',
			stripPrefix: dest
		});
}

// Launch loacl serve at develop directory
export async function serve() {
	isServer = true;
	browserSync({
		notify: false,
		logPrefix: 'Fly',
		server: {
			baseDir: dest
		}
	});
}

// helper, reload browsersync
function reload() {
	if (isWatch && isServer) {
		browserSync.reload();
	}
}
