import MediumEditor from "medium-editor";

// based on https://github.com/varun-raj/medium-editor-autolist
const AutoList = MediumEditor.Extension.extend({
  name: "autolist",
  init: function() {
    this.subscribe("editableInput", this.onInput.bind(this));
  },
  onInput: function() {
    const listStart = this.base.getSelectedParentElement().textContent;
    if (
      /^\s*1\.\s/.test(listStart) &&
      this.base.getExtensionByName("orderedlist")
    ) {
      this.base.execAction("delete");
      this.base.execAction("delete");
      this.base.execAction("delete");
      this.base.execAction("insertorderedlist");
    } else if (
      (/^\s*\*\s/.test(listStart) || /^\s*-\s/.test(listStart)) &&
      this.base.getExtensionByName("unorderedlist")
    ) {
      this.base.execAction("delete");
      this.base.execAction("delete");
      this.base.execAction("insertunorderedlist");
    }
  },
});

export default AutoList;
