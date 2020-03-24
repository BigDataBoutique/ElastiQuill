import React from "react";

import MarkdownEditor from "./MarkdownEditor";
import HtmlEditor from "./HtmlEditor";

const ContentEditor = ({ contentType, editorKey, ...props }) => {
  if (contentType === "markdown") {
    return <MarkdownEditor key={editorKey} {...props} />;
  } else {
    // contentType === "html"
    return <HtmlEditor key={editorKey} {...props} />;
  }
};

export default ContentEditor;
