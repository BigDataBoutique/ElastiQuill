import React from "react";

import "process";
import { render } from "react-dom";
import localforage from "localforage";

import App from "./App";

import "medium-editor/dist/css/medium-editor.css";
import "medium-editor/dist/css/themes/default.css";

// Needed for enabling medium-editor-insert-plugin jquery plugin
import "./lib/medium-editor-insert-plugin.min.css";
window.$ = window.jQuery = require("jquery");
require("jquery-ui-dist/jquery-ui.js");
require("../node_modules/medium-editor/dist/js/medium-editor.js");
require("../node_modules/handlebars/dist/handlebars.runtime.min.js");
require("../node_modules/blueimp-file-upload/js/vendor/jquery.ui.widget.js");
require("../node_modules/blueimp-file-upload/js/jquery.iframe-transport.js");
require("../node_modules/blueimp-file-upload/js/jquery.fileupload.js");
require("./lib/jquery-sortable-min.js");
require("./lib/linkify.min.js");
require("./lib/linkify-jquery.min.js");
window.MediumInsert = require("./lib/medium-editor-insert-plugin.min.js").MediumInsert;
// Needed for simplemde
require("./lib/inline-attachment.min.js");
require("./lib/codemirror-4.inline-attachment.min.js");

localforage.config({
  name: "ElasticBlogEngine",
  storeName: "app_store",
});

try {
  render(<App />, document.getElementById("root"));
  console.log("Render completed successfully");
} catch (error) {
  console.error("Render failed:", error);
}
