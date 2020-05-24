import $ from "jquery";
import { toast } from "react-toastify";
import React, { Component } from "react";
import MediumEditor from "medium-editor";
import PropTypes from "prop-types";

import * as api from "../../api";
import { getJwtToken } from "../../util";
import CodeBlockButton from "./CodeBlockButton";

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
          "codeblock",
        ],
      },
      extensions: {
        codeblock: new CodeBlockButton(),
      },
      autoLink: true,
      paste: {
        forcePlainText: true,
        doPaste: function(pastedHTML, pastedPlain, editable) {
          var paragraphs,
            html = "",
            p;

          if (this.cleanPastedHTML && pastedHTML) {
            return this.cleanPaste(pastedHTML);
          }

          if (!pastedPlain) {
            return;
          }

          if (
            !(
              this.getEditorOption("disableReturn") ||
              (editable && editable.getAttribute("data-disable-return"))
            )
          ) {
            paragraphs = pastedPlain.split(/[\r\n]+/g);
            // If there are no \r\n in data, don't wrap in <p>
            if (paragraphs.length > 1) {
              for (p = 0; p < paragraphs.length; p += 1) {
                if (paragraphs[p] !== "") {
                  html +=
                    MediumEditor.util.htmlEntities(paragraphs[p]) + "<br>";
                }
              }
            } else {
              html = MediumEditor.util.htmlEntities(paragraphs[0]);
            }
          } else {
            html = MediumEditor.util.htmlEntities(pastedPlain);
          }
          MediumEditor.util.insertHTMLCommand(this.document, html);
        },
      },
    });

    this.container.current.innerHTML = this._stripCodeTag(this.props.value);

    this._convertImagesToEmbeds(this.container.current);

    this.editor.subscribe("editableInput", (event, editable) => {
      const content = $("<div>" + editable.innerHTML + "</div>");
      content.find(".medium-insert-buttons").remove();

      // code block (both extension and plugin) currently wrap its content
      // using PRE instead of PRE + CODE due to issues with medium-editor
      // https://github.com/yabwe/medium-editor/issues/764
      // so we need to do some cleanup (PRE + CODE) before saving
      this._insertCodeTag(content);

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

  _insertCodeTag(content) {
    content.find("pre").each(function() {
      const className = $(this).attr("class");
      const classes = className ? className.split(" ") : [];
      const language = classes.find(item => item.startsWith("language-")) || "";
      $(this).replaceWith(
        `<pre data-language="${language.substring(
          9
        )}"><code class="${language}">${$(this).html()}</code></pre>`
      );
    });
  }

  _stripCodeTag(string) {
    const content = $("<div>" + string + "</div>");

    content.find("pre code").each(function() {
      const className = $(this).attr("class");
      const classes = className ? className.split(" ") : [];
      const language = classes.find(item => item.startsWith("language-")) || "";

      $(this)
        .closest("pre")
        .replaceWith(
          `<pre class="${language}" data-language="${language.substring(
            9
          )}">${$(this).html()}</pre>`
        );
    });

    return content.prop("outerHTML");
  }
}

HtmlEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  blogpostId: PropTypes.string,
  disabled: PropTypes.bool,
};

export default HtmlEditor;
