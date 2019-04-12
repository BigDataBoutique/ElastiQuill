# express-handlebars-multi

express-handlebars-multi provides functionality that is largely similar to
express-handlebars with added support for multiple views, layouts, and partials
directories.

express-handlebars-multi uses a single global instance for configuration and
caching.

## Usage

    var express = require('express')
    var expressHandlebarsMulti = require('express-handlebars-multi')

    var app = express()

    var engine = expressHandlebarsMulti({
        defaultLayout: 'main.layout',
        ext: '.hbs',
        helpers: {
            fooHelper: function (val) {
                return 'foo: '+val
            },
        },
        layoutDirs: ['/bar/layouts', '/foo/layouts'],
        partialDirs: ['/var/partials', '/foo/partials'],
    })

    app.engine('.hbs', engine)
    app.set('view engine', '.hbs')
    app.set('views', ['/bar/views', '/foo/views'])

    // enable caching -- enabled by default when NODE_ENV === 'production'
    app.enable('view cache')

## Reseting global config and caches

    var expressHandlebarsMulti = require('express-handlebars-multi')

    expressHandlebarsMulti.reset()

## Setting/getting global config options

    var expressHandlebarsMulti = require('express-handlebars-multi')

    expressHandlebarsMulti.config({
        helpers: {
            barHelper: function (val) {
                return 'bar: '+val
            },
        },
    })

    var config = expressHandlebarsMulti.config()