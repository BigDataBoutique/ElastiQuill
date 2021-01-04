import MediumEditor from "medium-editor";

const CodeBlockButton = MediumEditor.extensions.form.extend({
  name: "codeblock",
  placeholderText: "Insert language (can be left empty)",

  contentDefault: '<i class="fa fa-code"></i>',
  aria: "Code block",
  action: "codeblock",

  init: function() {
    MediumEditor.extensions.button.prototype.init.call(this);
  },

  handleClick: function(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.isWrapped()) {
      return this.unwrapPreCode();
    }

    if (!this.isDisplayed()) {
      this.showForm();
    }

    return false;
  },

  isWrapped: function() {
    const range = window.getSelection().getRangeAt(0);
    const startElement = range.startContainer.parentElement;
    const endElement = range.endContainer.parentElement;

    return (
      startElement === endElement &&
      startElement.nodeName.toLowerCase() === "pre"
    );
  },

  isAlreadyApplied: function(node) {
    return node.nodeName.toLowerCase() === "pre";
  },

  isActive: function() {
    return this.button.classList.contains("medium-editor-button-active");
  },

  setInactive: function() {
    this.button.classList.remove("medium-editor-button-active");
  },

  setActive: function() {
    this.button.classList.add("medium-editor-button-active");
  },

  // Called by medium-editor to append form to the toolbar
  getForm: function() {
    if (!this.form) {
      this.form = this.createForm();
    }
    return this.form;
  },

  getTemplate: function() {
    const template = `<input type="text" class="medium-editor-toolbar-input" placeholder="${this.placeholderText}">
      <a href="#" class="medium-editor-toolbar-save">
        <i class="fa fa-check"></i>
      </a>
      <a href="#" class="medium-editor-toolbar-close">
        <i class="fa fa-times"></i>
      </a>`;

    return template;
  },

  // Used by medium-editor when the default toolbar is to be displayed
  isDisplayed: function() {
    return MediumEditor.extensions.form.prototype.isDisplayed.apply(this);
  },

  hideForm: function() {
    MediumEditor.extensions.form.prototype.hideForm.apply(this);
    this.getInput().value = "";
  },

  showForm: function(opts) {
    const input = this.getInput();
    let options = opts || { value: "" };
    // TODO: This is for backwards compatability
    // We don't need to support the 'string' argument in 6.0.0
    if (typeof options === "string") {
      options = {
        value: options,
      };
    }

    this.base.saveSelection();
    this.hideToolbarDefaultActions();
    MediumEditor.extensions.form.prototype.showForm.apply(this);
    this.setToolbarPosition();

    input.value = options.value;
    input.focus();
  },

  // Called by core when tearing down medium-editor (destroy)
  destroy: function() {
    if (!this.form) {
      return false;
    }

    if (this.form.parentNode) {
      this.form.parentNode.removeChild(this.form);
    }

    delete this.form;
  },

  getFormOpts: function() {
    const opts = {
      value: this.getInput().value.trim(),
    };

    return opts;
  },

  doFormSave: function() {
    let opts = this.getFormOpts();
    this.completeFormSave(opts);
  },

  completeFormSave: function(opts) {
    this.base.restoreSelection();
    this.execAction(opts);
    this.base.checkSelection();
  },

  doFormCancel: function() {
    this.base.restoreSelection();
    this.base.checkSelection();
  },

  // form creation and event handling
  attachFormEvents: function(form) {
    const close = form.querySelector(".medium-editor-toolbar-close");
    const save = form.querySelector(".medium-editor-toolbar-save");
    const input = form.querySelector(".medium-editor-toolbar-input");

    // Handle clicks on the form itself
    this.on(form, "click", this.handleFormClick.bind(this));

    // Handle typing in the textbox
    this.on(input, "keyup", this.handleTextboxKeyup.bind(this));

    // Handle close button clicks
    this.on(close, "click", this.handleCloseClick.bind(this));

    // Handle save button clicks (capture)
    this.on(save, "click", this.handleSaveClick.bind(this), true);
  },

  createForm: function() {
    const doc = this.document;
    const form = doc.createElement("div");

    // Anchor Form (div)
    form.className = "medium-editor-toolbar-form";
    form.id = "medium-editor-toolbar-form-codeblock-" + this.getEditorId();
    form.innerHTML = this.getTemplate();
    this.attachFormEvents(form);

    return form;
  },

  getInput: function() {
    return this.getForm().querySelector("input.medium-editor-toolbar-input");
  },

  handleTextboxKeyup: function(event) {
    // For ENTER -> create the code block
    if (event.keyCode === MediumEditor.util.keyCode.ENTER) {
      event.preventDefault();
      this.doFormSave();
      return;
    }

    // For ESCAPE -> close the form
    if (event.keyCode === MediumEditor.util.keyCode.ESCAPE) {
      event.preventDefault();
      this.doFormCancel();
    }
  },

  handleFormClick: function(event) {
    // make sure not to hide form when clicking inside the form
    event.stopPropagation();
  },

  handleSaveClick: function(event) {
    // Clicking Save -> create the anchor
    event.preventDefault();
    this.doFormSave();
  },

  handleCloseClick: function(event) {
    // Click Close -> close the form
    event.preventDefault();
    this.doFormCancel();
  },

  execAction: function(opts) {
    this.wrapInPreCode(opts);

    if (window.getSelection) {
      if (window.getSelection().empty) {
        // Chrome
        window.getSelection().empty();
      } else if (window.getSelection().removeAllRanges) {
        // Firefox
        window.getSelection().removeAllRanges();
      }
    } else if (document.selection) {
      // IE?
      document.selection.empty();
    }
  },

  unwrapPreCode: function() {
    this.base.execAction("append-p");
  },

  wrapInPreCode: function(opts) {
    const selection = window.getSelection();

    if (selection.getRangeAt && selection.rangeCount) {
      const content = this.getTextNodesBetween(selection).join("\n");

      const pre = document.createElement("pre");
      pre.classList.add("language-" + opts.value);
      pre.dataset.language = opts.value;
      pre.textContent = content;

      this.base.pasteHTML(pre.outerHTML, {
        cleanAttrs: ["style", "dir"],
      });
    }
  },

  // modified from https://gist.github.com/chriszarate/5092641
  getTextNodesBetween: function(selection) {
    const range = selection.getRangeAt(0);

    const rootNode = range.commonAncestorContainer;
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    let pastStartNode = false;
    let reachedEndNode = false;
    let textNodes = [];

    function getTextNodes(node) {
      var val = node.nodeValue;
      if (node == startNode && node == endNode && node !== rootNode) {
        if (val) textNodes.push(val.substring(startOffset, endOffset));
        pastStartNode = reachedEndNode = true;
      } else if (node == startNode) {
        if (val) textNodes.push(val.substring(startOffset));
        pastStartNode = true;
      } else if (node == endNode) {
        if (val) textNodes.push(val.substring(0, endOffset));
        reachedEndNode = true;
      } else if (node.nodeType == 3) {
        if (val && pastStartNode && !reachedEndNode && !/^\s*$/.test(val)) {
          textNodes.push(val);
        }
      }
      for (
        var i = 0, len = node.childNodes.length;
        !reachedEndNode && i < len;
        ++i
      ) {
        getTextNodes(node.childNodes[i]);
      }
    }
    getTextNodes(rootNode);
    return textNodes;
  },
});

export default CodeBlockButton;
