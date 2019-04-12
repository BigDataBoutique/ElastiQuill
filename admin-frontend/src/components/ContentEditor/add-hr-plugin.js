import $ from 'jquery';

; (function ($, window, document, undefined) {

    'use strict';

    /** Default values */
    var pluginName = 'mediumInsert',
        addonName = 'AddHr', // first char is uppercase
        defaults = {
            label: '<span>---</span>'
        };

    /**
     * Custom Addon object
     *
     * Sets options, variables and calls init() function
     *
     * @constructor
     * @param {DOM} el - DOM element to init the plugin on
     * @param {object} options - Options to override defaults
     * @return {void}
     */

    function AddHr (el, options) {
        this.el = el;
        this.$el = $(el);
        this.templates = window.MediumInsert.Templates;
        this.core = this.$el.data('plugin_'+ pluginName);

        this.options = $.extend(true, {}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    /**
     * Initialization
     *
     * @return {void}
     */

    AddHr.prototype.init = function () {
        this.events();
    };

    /**
     * Event listeners
     *
     * @return {void}
     */

    AddHr.prototype.events = function () {

    };

    /**
     * Get the Core object
     *
     * @return {object} Core object
     */
    AddHr.prototype.getCore = function () {
        return this.core;
    };

    /**
     * Add custom content
     *
     * This function is called when user click on the addon's icon
     *
     * @return {void}
     */

    AddHr.prototype.add = function () {
        var $place = this.$el.find('.medium-insert-active'),
            domImage,
            that;

        // Hide editor's placeholder
        $place.click();

        $place.replaceWith('<hr/>');
        this.core.hideButtons();
        $('.medium-insert-buttons').remove();
        this.core.triggerInput();
    };


    /** Addon initialization */

    $.fn[pluginName + addonName] = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName + addonName)) {
                $.data(this, 'plugin_' + pluginName + addonName, new AddHr(this, options));
            }
        });
    };

})($, window, document);
