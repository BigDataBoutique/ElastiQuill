'use strict'

/* native modules */
const path = require('path')

// register bluebird and any-promise handler before requiring other modules
require('any-promise/register')('bluebird')

/* npm modules */
const Promise = require('bluebird')
const _ = require('lodash')
const debug = require('debug')('express-handlebars-multi')
const fsp = require('mz/fs') 
const globby = require('globby')
const handlebars = require('handlebars')
const mergeArgs = require('merge-args')()

// default configuration
const defaultConfig = {
    // default layout
    defaultLayout: '',
    // default template file extension
    ext: '.hbs',
    // helper functions
    helpers: {},
    // layouts
    layouts: undefined,
    // layouts directories
    layoutDirs: [],
    // handlebars options
    options: {},
    // partials
    partials: undefined,
    // partials directories
    partialDirs: [],
    // templates indexed by absolute file name
    templates: {},
}

/* global singleton data */
var GLOBAL
// initialize global singleton instance if not yet defined
if (!global.__express_handlebars_multi__) {
    reset()
}
// use existing singleton instance
else {
    GLOBAL = global.__express_handlebars_multi__
}

/* exports */
module.exports = ExpressHandlebarsMulti

ExpressHandlebarsMulti.config = config
ExpressHandlebarsMulti.reset = reset

/**
 * @function ExpressHandlebarsMulti
 *
 * @param {object} args
 *
 * @returns {function}
 *
 * @throws {Error}
 */
function ExpressHandlebarsMulti (args) {
    // merge args to global config
    config(args)
    // return render function
    return render
}

/**
 * @function config
 *
 * update/get config
 *
 * @param {object} args
 *
 * @returns {object}
 *
 * @throws {Error}
 */
function config (args) {
    // make sure extension has .
    if (args && typeof args.ext === 'string' && args.ext.charAt(0) !== '.') {
        args.ext = '.'+args.ext
    }
    // merge config to global config
    mergeArgs(GLOBAL, args)
    // create regular expression for matching extension
    GLOBAL.extRegExp = new RegExp('\\'+GLOBAL.ext+'$')
    // return config
    return GLOBAL
}

/**
 * @function render
 *
 * Express view engine render function
 *
 * @param {string} file
 * @param {object} options
 * @param {function} callback
 *
 * @returns {Promise}
 *
 * @throws {Error}
 */
function render (file, options, callback) {
    debug('render', file, options)
    // load layouts
    var layouts = loadLayouts(options)
    // load partials
    var partials = loadPartials(options)
    // get template function
    var template = loadTemplate(file, options)
    // wait for all promises to resolve
    return Promise.all([
        layouts,
        partials,
        template,
    ])
    // once all promises resolved render template
    .then(all => {
        var layouts = all[0]
        var partials = all[1]
        var template = all[2]
        // render options
        var hbsOptions = {
            helpers: GLOBAL.helpers,
            partials: partials,
        }
        // render template
        var body = template(options, hbsOptions)
        // get layout from options or default layout
        var layout = options.layout || GLOBAL.defaultLayout
        // use layout if found
        if (layout && layouts[layout]) {
            // pass layout contents of template render along with other params
            options.body = body
            // render layout
            body = layouts[layout](options, hbsOptions)
        }
        // if callback is passed then call with result
        if (callback) {
            callback(null, body)
        }
        // otherwise resolve with result
        else {
            return body
        }
    })
}

/**
 * @function reset
 *
 * reset global singleton data
 */
function reset () {
    GLOBAL = global.__express_handlebars_multi__ = _.cloneDeep(defaultConfig)
}

/* private functions */

/**
 * @function loadLayouts
 *
 * @param {object} options
 *
 * @returns {Promise}
 */
function loadLayouts (options) {
    // return cached layouts if caching enabled
    if (options.cache && GLOBAL.layouts) {
        return GLOBAL.layouts
    }
    // load layouts
    GLOBAL.layouts = loadTemplates(GLOBAL.layoutDirs, options)
    // return promise that will be resolved with layouts
    return GLOBAL.layouts
}

/**
 * @function loadPartials
 *
 * @param {object} options
 *
 * @returns {Promise}
 */
function loadPartials (options) {
    // return cached partials if caching enabled
    if (options.cache && GLOBAL.partials) {
        return GLOBAL.partials
    }
    // load partials
    GLOBAL.partials = loadTemplates(GLOBAL.partialDirs, options)
    // return promise that will be resolved with partials
    return GLOBAL.partials
}

/**
 * @function loadTemplate
 *
 * @param {string} file
 * @param {object} options
 *
 * @returns {Promise}
 */
function loadTemplate (file, options) {
    // return cached template if caching enabled
    if (options.cache && GLOBAL.templates[file]) {
        return Promise.resolve(GLOBAL.templates[file])
    }
    // store promise to load template
    var promise = GLOBAL.templates[file] = fsp.readFile(file, 'utf8')
    // compile template file
    .then(data => {
        // replace entry in template cache with template function
        var template = GLOBAL.templates[file] = handlebars.compile(data)
        // resolve with template
        return template
    })
    // return promise
    return promise
}

/**
 * @function loadTemplates
 *
 * @param {array|string} dirs
 *
 * @returns {Promise}
 */
function loadTemplates (dirs, options) {
    // require dirs to be array
    if (!Array.isArray(dirs)) {
        dirs = [dirs]
    }
    // templates indexed by absolute file name
    var templates = {}
    // load all templates in all directories
    return Promise.each(dirs, dir => {
        // load all files under dir
        return globby('**/*'+GLOBAL.ext, {
            cwd: dir,
            follow: true,
        })
        // compile templates for files
        .then(files => {
            return loadTemplatesFiles(dir, files, options, templates)
        })
    })
    // resolve with templates
    .then(() => templates)
}

/**
 * @function loadTemplatesFiles
 *
 * @param {string} dir
 * @param {array} files
 * @param {object} options
 * @param {object} templates
 *
 * @returns {Promise}
 */
function loadTemplatesFiles (dir, files, options, templates) {
    // require files
    if (!Array.isArray(files)) {
        return Promise.resolve()
    }
    // load template for each file
    return Promise.each(files, file => {
        // get absolute file from dir
        var absFile = dir+'/'+file
        // get express template name by stripping off extension
        file = file.replace(GLOBAL.extRegExp, '')
        // if template has already been defined then do not replace so that
        // first incidence of file in multiple paths is used
        if (templates[file]) {
            return
        }
        // load template
        var promise = templates[file] = loadTemplate(absFile, options)
        // once template is loaded replace promise with template
        .then(template => {
            templates[file] = template
        })
        // wait for template to load
        return promise
    })
}