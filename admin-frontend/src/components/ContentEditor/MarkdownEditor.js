import React, { Component } from "react";
import SimpleMDE from "react-simplemde-editor";
import MarkdownIt from "markdown-it";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import "easymde/dist/easymde.min.css";

import * as api from "../../api";
import { getJwtToken } from "../../util";

const md = new MarkdownIt({
  html: true,
});

class MarkdownEditor extends Component {
  render() {
    return (
      <div
        className="content-editor"
        style={{
          pointerEvents: this.props.disabled ? "none" : "default",
        }}
      >
        <SimpleMDE
          value={this.props.value}
          onChange={this.props.onChange}
          getMdeInstance={this._getInstance}
          options={{
            previewRender(markdownText) {
              return md.render(markdownText);
            },
            renderingConfig: {
              codeSyntaxHighlighting: true,
            },
          }}
        />
      </div>
    );
  }

  _getInstance = instance => {
    let uploadImageUrl = api.uploadImageUrl();
    if (this.props.blogpostId) {
      uploadImageUrl += "?post_id=" + this.props.blogpostId;
    }

    // eslint-disable-next-line
    inlineAttachment.editors.codemirror4.attach(instance.codemirror, {
      uploadUrl: uploadImageUrl,
      extraHeaders: {
        Authorization: "Bearer " + getJwtToken(),
      },
      onFileUploadResponse: function(xhr) {
        try {
          const result = JSON.parse(xhr.responseText);
          if (result.error) {
            throw new Error(result.error);
          }
          const url = result.files[0].url;

          if (url) {
            let newValue;
            if (typeof this.settings.urlText === "function") {
              newValue = this.settings.urlText.call(this, url, result);
            } else {
              newValue = this.settings.urlText.replace(this.filenameTag, url);
            }
            let text = this.editor.getValue().replace(this.lastValue, newValue);
            this.editor.setValue(text);
            this.settings.onFileUploaded.call(this, url);
          }
        } catch (err) {
          toast.error(err.message);
        }

        return false;
      },
    });
  };
}

MarkdownEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blogpostId: PropTypes.string,
  disabled: PropTypes.bool,
};

export default MarkdownEditor;
