import $ from "jquery";
import { toast } from "react-toastify";
import React, { Component } from "react";
import MediumEditor from "medium-editor";
import PropTypes from "prop-types";

import * as api from "../../api";
import { getJwtToken } from "../../util";

import "./add-hr-plugin";
import "./embeds-patched-plugin";
import "./add-code-block-plugin";

class HtmlEditor extends Component {
  constructor(props) {
    super(props);
    this.container = React.createRef();
  }

  componentDidMount() {
    this.editor = new MediumEditor(this.container.current, {
      toolbar: {
        buttons: [
          "bold",
          "italic",
          "underline",
          {
            name: "anchor",
            action: "createLink",
            aria: "link",
            tagNames: ["a"],
            contentDefault: '<i class="fa fa-link"></i>',
          },
          "h2",
          "h3",
          "quote",
          {
            name: "pre",
            aria: "preformatted code",
            contentDefault: '<i class="fa fa-code"></i>',
          },
        ],
      },
    });

    this.container.current.innerHTML = this.props.value;

    this._convertImagesToEmbeds(this.container.current);

    this.editor.subscribe("editableInput", (event, editable) => {
      const content = $("<div>" + editable.innerHTML + "</div>");
      content.find(".medium-insert-buttons").remove();
      const cleanedHtml = content.html();

      this.props.onChange(cleanedHtml);
    });

    let uploadImageUrl = api.uploadImageUrl();
    if (this.props.blogpostId) {
      uploadImageUrl += "?post_id=" + this.props.blogpostId;
    }

    $(this.container.current).mediumInsert({
      editor: this.editor,
      addons: {
        images: {
          deleteScript: false,
          fileUploadOptions: {
            url: uploadImageUrl,
            headers: {
              Authorization: "Bearer " + getJwtToken(),
            },
            fail: (ev, data) => {
              const responseJSON = data.response().jqXHR.responseJSON;
              toast.error(responseJSON.error);

              // Remove image previews
              $(this.container.current)
                .find(".medium-insert-images")
                .each(function() {
                  const img = $(this).find("img");
                  if (img.length && img.attr("src").startsWith("blob:")) {
                    setTimeout(() => $(this).remove(), 500);
                  }
                });
            },
          },
          captions: false,
          preview: true,
        },
        embeds: false,
        embedsPatched: {
          styles: false,
          captions: false,
          oembedProxy: false,
        },
        addHr: {
          test: true,
        },
        addCodeBlock: {},
      },
    });
    $(this.container.current).removeClass("medium-editor-placeholder");
    $(this.container.current).html($(this.container.current).html());
    $(this.container.current).on("keyup", e => {
      // space or enter
      if (e.keyCode !== 13 && e.keyCode !== 32) {
        return;
      }
      $(this.container.current).linkify();
    });
  }

  componentWillUnmount() {
    this.editor.destroy();
  }

  render() {
    return (
      <div
        className="content-editor"
        style={{
          minHeight: "300px",
          pointerEvents: this.props.disabled ? "none" : "default",
        }}
        ref={this.container}
      />
    );
  }

  _convertImagesToEmbeds(el) {
    $(el)
      .find("img")
      .each(function() {
        var found = $(this).closest(".medium-insert-embeds");
        if (found.length) {
          return;
        }

        $(this).replaceWith(
          $(`
        <div class="medium-insert-embeds" contenteditable="false">
          <figure>
            <div class="medium-insert-embed">
              ${$(this)[0].outerHTML}
            </div>
          </figure>
          <div class="medium-insert-embeds-overlay"></div>
        </div>
      `)
        );
      });
  }
}

HtmlEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blogpostId: PropTypes.string,
  disabled: PropTypes.bool,
};

export default HtmlEditor;
