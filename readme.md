# Fly Starter Kit: Imba [![Build Status](https://travis-ci.org/lukeed/fly-kit-imba.svg?branch=master)](https://travis-ci.org/lukeed/fly-kit-imba)

> Jumpstart a Web App with [Imba](http://imba.io/) JS and [Fly](https://git.io/fly).

## Install

<!-- ### Manually -->
```
$ git clone --depth=1 https://github.com/lukeed/fly-kit-imba.git && cd fly-kit-imba
$ rm -rf .git && git init
$ npm install
```

You now have a fresh copy of this repo.

## Usage

**Default** -- build development files, recompile on file change, and start a server.
```
npm run fly
```

**Watch** -- alias for `npm run fly`
```
npm run watch
```

**Build** -- build production assets
```
npm run build
```

**Serve** -- build production assets & start a server
```
npm run serve
```

## Features
* Asset Versioning
* Babel (for non-Imba ES6/7 support)
* Browserify Bundles
* BrowserSync
* Cache-Busting/versioned production assets
* CSS Autoprefixer
* Javascript Linting via [XO](https://github.com/sindresorhus/xo)
* HTML Minification
* **Offline Support** (Service Worker Caching)
* SASS pre-processor
* Uglify JS

## License

MIT © [Luke Edwards](https://lukeed.com)
