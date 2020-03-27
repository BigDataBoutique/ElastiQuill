import $ from "jquery";

(function($, window) {
  "use strict";

  /** Default values */
  var pluginName = "mediumInsert",
    addonName = "AddCodeBlock", // first char is uppercase
    defaults = {
      label: '<span class="fa fa-code"></span>',
      placeholder: "Paste or type codes here",
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

  function AddCodeBlock(el, options) {
    this.el = el;
    this.$el = $(el);
    this.templates = window.MediumInsert.Templates;
    this.core = this.$el.data("plugin_" + pluginName);

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

  AddCodeBlock.prototype.init = function() {
    this.events();
  };

  /**
   * Event listeners
   *
   * @return {void}
   */

  AddCodeBlock.prototype.events = function() {
    this.$el.on("keydown", e => {
      let $place = $(e.target),
        selection = window.getSelection(),
        range,
        $current;

      if (!selection || selection.rangeCount === 0) {
        return;
      }

      range = selection.getRangeAt(0);
      $current = $(range.commonAncestorContainer);

      if ($current.hasClass("medium-insert-codeblock")) {
        $place = $current;
      } else if ($current.closest(".medium-insert-codeblock").length) {
        $place = $current.closest(".medium-insert-codeblock");
      } else {
        return;
      }

      if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        if ($place.next().is("p")) {
          this.core.moveCaret($place.next());
        } else {
          $place.after("<p><br></p>"); // add empty paragraph so we can move the caret to the next line.
          this.core.moveCaret($place.next());
        }
      }
    });
  };

  /**
   * Get the Core object
   *
   * @return {object} Core object
   */
  AddCodeBlock.prototype.getCore = function() {
    return this.core;
  };

  /**
   * Add custom content
   *
   * This function is called when user click on the addon's icon
   *
   * @return {void}
   */

  AddCodeBlock.prototype.add = function() {
    var $place = this.$el.find(".medium-insert-active");

    this.core.hideButtons();

    if ($place.is("p")) {
      $place.replaceWith(
        '<pre class="medium-insert-codeblock medium-insert-active"><br></pre>'
      );
      $place = this.$el.find(".medium-insert-active");
      if ($place.next().is("p")) {
        this.core.moveCaret($place.next());
      } else {
        $place.after("<p><br></p>"); // add empty paragraph so we can move the caret to the next line.
        this.core.moveCaret($place.next());
      }
    }
  };

  /** Addon initialization */

  $.fn[pluginName + addonName] = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName + addonName)) {
        $.data(
          this,
          "plugin_" + pluginName + addonName,
          new AddCodeBlock(this, options)
        );
      }
    });
  };
})($, window, document);
