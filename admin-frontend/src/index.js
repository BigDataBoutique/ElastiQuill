import React from "react";

import { render } from "react-dom";
import localforage from "localforage";

import App from "./App";

import "medium-editor/dist/css/medium-editor.css";
import "medium-editor/dist/css/themes/default.css";

// Needed for enabling medium-editor-insert-plugin jquery plugin
import "./lib/medium-editor-insert-plugin.min.css";
window.$ = window.jQuery = require("jquery");
require("../node_modules/medium-editor/dist/js/medium-editor.js");
require("../node_modules/handlebars/dist/handlebars.runtime.min.js");
require("../node_modules/blueimp-file-upload/js/vendor/jquery.ui.widget.js");
require("../node_modules/blueimp-file-upload/js/jquery.iframe-transport.js");
require("../node_modules/blueimp-file-upload/js/jquery.fileupload.js");
require("./lib/jquery-sortable-min.js");
require("./lib/linkify.min.js");
require("./lib/linkify-jquery.min.js");
window.MediumInsert = require("./lib/medium-editor-insert-plugin.min.js").MediumInsert;

localforage.config({
  name: "ElasticBlogEngine",
  storeName: "app_store",
});

render(<App />, document.getElementById("root"));
