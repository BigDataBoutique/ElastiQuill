import $ from "jquery";

(function($, window) {
  "use strict";

  /** Default values */
  var pluginName = "mediumInsert",
    addonName = "AddCodeBlock", // first char is uppercase
    defaults = {
      label: '<span class="fa fa-code"></span>',
      placeholder: "Insert language (can be left empty)",
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
    this.$el
      .on("keyup click paste", $.proxy(this, "togglePlaceholder"))
      .on("keydown", $.proxy(this, "handleKeydown"));
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

    // Fix #132
    // Make sure that the content of the paragraph is empty and <br> is wrapped in <p></p> to avoid Firefox problems
    $place.html(
      this.templates["src/js/templates/core-empty-line.hbs"]().trim()
    );

    // Replace paragraph with div to prevent #124 issue with pasting in Chrome,
    // because medium editor wraps inserted content into paragraph and paragraphs can't be nested
    if ($place.is("p")) {
      $place.replaceWith(
        '<div class="medium-insert-active">' + $place.html() + "</div>"
      );
      $place = this.$el.find(".medium-insert-active");
      this.core.moveCaret($place);
    }

    $place.addClass(
      "medium-insert-codeblock medium-insert-codeblock-input medium-insert-codeblock-active"
    );

    this.togglePlaceholder({ target: $place.get(0) });

    $place.click();
    this.core.hideButtons();
  };

  /**
   * Toggles placeholder
   *
   * @param {Event} e
   * @return {void}
   */

  AddCodeBlock.prototype.togglePlaceholder = function(e) {
    var $place = $(e.target),
      selection = window.getSelection(),
      range,
      $current,
      text;

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    range = selection.getRangeAt(0);
    $current = $(range.commonAncestorContainer);

    if ($current.hasClass("medium-insert-codeblock-active")) {
      $place = $current;
    } else if ($current.closest(".medium-insert-codeblock-active").length) {
      $place = $current.closest(".medium-insert-codeblock-active");
    }

    if ($place.hasClass("medium-insert-codeblock-active")) {
      text = $place.text().trim();

      if (
        text === "" &&
        $place.hasClass("medium-insert-codeblock-placeholder") === false
      ) {
        $place
          .addClass("medium-insert-codeblock-placeholder")
          .attr("data-placeholder", this.options.placeholder);
      } else if (
        text !== "" &&
        $place.hasClass("medium-insert-codeblock-placeholder")
      ) {
        $place
          .removeClass("medium-insert-codeblock-placeholder")
          .removeAttr("data-placeholder");
      }
    } else {
      this.$el.find(".medium-insert-codeblock-active").remove();
    }
  };

  /**
   * Right click on placeholder in Chrome selects whole line. Fix this by placing caret at the end of line
   *
   * @param {Event} e
   * @return {void}
   */

  AddCodeBlock.prototype.fixRightClickOnPlaceholder = function(e) {
    this.core.moveCaret($(e.target));
  };

  AddCodeBlock.prototype.handleKeydown = function(e) {
    let $place = $(e.target),
      selection = window.getSelection(),
      range,
      $current,
      text;

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    range = selection.getRangeAt(0);
    $current = $(range.commonAncestorContainer);

    if ($current.hasClass("medium-insert-codeblock")) {
      $place = $current;
    } else if ($current.closest(".medium-insert-codeblock").length) {
      $place = $current.closest(".medium-insert-codeblock");
    }

    if ($place.hasClass("medium-insert-codeblock-input")) {
      text = $place.text().trim();
      if (e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        this.addBlock($place, text);
      }
    } else if ($place.hasClass("medium-insert-codeblock")) {
      if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();
        if ($place.next().is("p")) {
          if (
            $($place)
              .next()
              .is(":empty") ||
            $($place)
              .next()
              .html()
              .trim() === ""
          ) {
            $($place)
              .next()
              .html("<br>");
          }
          this.core.moveCaret($place.next());
        } else {
          $place.after("<p><br></p>"); // add empty paragraph so we can move the caret to the next line.
          this.core.moveCaret($place.next());
        }
      }
    }
  };

  AddCodeBlock.prototype.addBlock = function($place, text) {
    if ($place.is("p") || $place.is("div")) {
      // this is a hack, without settimeout the new node
      // will be removed immediately due to cleanup somewhere
      // needs some more debugging
      setTimeout(() => {
        $place.replaceWith(
          `<pre class="medium-insert-codeblock medium-insert-active language-${text}" data-language="${text}"><br></pre>`
        );
        $place = this.$el.find(".medium-insert-active");
        this.core.moveCaret($place);
        if (!$place.next().is("p")) {
          $place.after("<p><br></p>"); // add empty paragraph so we can move the caret to the next line.
        }

        this.core.triggerInput();
      }, 200);
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
