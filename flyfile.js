import browserSync from 'browser-sync';

let isProd = false;
let isWatch = false;
let isServer = false;

const src = 'app';
const dest = 'dist';

const paths = {
	styles: `${src}/styles`,
	scripts: `${src}/scripts/**/*`,
	images: `${src}/images/**/*.{png,gif,jpg,svg}`,
	fonts: `${src}/fonts/**/*.{eot,woff,ttf,svg}`,
	extras: `${src}/*.{txt,json,webapp,ico}`,
	html: `${src}/*.html`
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
	await this.start(['extras', 'serve']);
}

/**
 * Build the production files
 */
export async function build() {
	isProd = true;
	isWatch = false;
	await this.start('clean');
	await this.start(['lint', 'images', 'fonts', 'styles', 'html', 'extras'], {parallel: true});
	await this.start('scripts', 'rev');
	await this.start('cache');
}

// ###
// # Tasks
// ###

// Delete the output directories
export async function clean() {
	await this.clear(dest);
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
		globals: ['navigator', 'window']
	});
}

// Compile scripts
export async function scripts() {
	await this
		.source(`${paths.scripts}.imba`)
		.imba()
		.target(`${dest}/js`);
		// .browserify({
		// 	transform: require('babelify').configure({presets: 'es2015'})
		// })
		// .concat('main.js')

	return isProd ? await this.start('uglify') : reload();
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
	const s = paths.styles;

	await this.source(`${s}/app.scss`)
		.sass({
			outputStyle: 'compressed',
			includePaths: [`${s}/**/*`]
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
	const src = ['scripts', 'styles', 'images'].map(type => {
		return `${paths[type].dest}/**/*`;
	});

	return this.source(src).rev({
		base: dest,
		replace: true
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
