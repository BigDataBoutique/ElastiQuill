import _ from "lodash";
import React from "react";
import { Button, Spinner } from "reactstrap";
import uuid from "uuid/v1";
import { Prompt } from "react-router";

import BaseForm from "./BaseForm";

const defaultFormValues = {
  title: "",
  content: "",
  metadata: {},
  allow_comments: true,
};

class PostForm extends BaseForm {
  constructor(props) {
    super(props);

    let formValues;

    if (props.isNew) {
      formValues = _.cloneDeep(defaultFormValues);
    } else {
      formValues = _.cloneDeep(props.item);

      if (formValues.draft) {
        formValues = _.merge(formValues, formValues.draft);
      }
    }

    this.state = {
      formValues,
      editDraftContents: true,
    };
  }

  componentDidMount() {
    this._autosaveTimer = setInterval(() => this._autosaveToDraft(), 5000);
  }

  componentWillUnmount() {
    if (this._autosaveTimer !== null) {
      clearInterval(this._autosaveTimer);
      this._autosaveTimer = null;
    }
  }

  _renderExtraToolbarButton() {
    // render toolbar only when the post has been published or saved as draft
    if (!this.props.item) {
      return false;
    }

    const { editDraftContents } = this.state;

    const onClick = () => {
      const newEditDraftContents = !editDraftContents;

      this.setState({
        contentEditorKey: (this.state.contentEditorKey || 0) + 1,
        editDraftContents: newEditDraftContents,
      });
    };

    const previewUrl = `${this.props.item.url}${
      _.isEmpty(this.props.item.metadata.private_viewing_key)
        ? ""
        : "?secret=" + this.props.item.metadata.private_viewing_key
    }`;

    return (
      <>
        {this.props.item.is_published && this.props.item.draft && (
          <button
            onClick={onClick}
            className="btn btn-outline-secondary btn-sm"
            style={{ marginRight: 5 }}
          >
            {editDraftContents ? "Show published" : "Back to drafted changes"}
          </button>
        )}
        <a
          href={previewUrl}
          target="_blank"
          className="btn btn-outline-secondary btn-sm"
          style={{ marginRight: 5 }}
        >
          Preview post
        </a>
      </>
    );
  }

  _renderModal() {
    return (
      <div className="row">
        <div className="col-6">
          {this._renderTextarea({
            placeholder: "Description",
            maxLength: 300,
            prop: "description",
            optional: true,
          })}
          {this._renderFileInput({
            label: "Header image URL",
            prop: "metadata.header_image_url",
          })}
        </div>
        <div className="col-6">
          {this._renderTagsInput({ label: "Tags", prop: "tags" })}
          {this._renderSeriesPicker({ label: "Series", prop: "series" })}
          {this._renderToggle({
            label: "Allow comments",
            prop: "allow_comments",
          })}
          {this.props.isFormSaving ? (
            <div style={{ textAlign: "right", paddingTop: 17 }}>
              <Spinner color="secondary" size="sm" style={{ marginLeft: 5 }} />
            </div>
          ) : (
            <div style={{ marginTop: 10, float: "right" }}>
              <Button
                size="sm"
                color="success"
                onClick={this._submit.bind(this)}
                disabled={this.props.isFormSaving}
              >
                {this.props.isNew
                  ? "Publish now"
                  : this.props.item.is_published === true
                  ? "Publish changes"
                  : "Publish post"}
              </Button>
              <Button
                outline
                style={{ marginLeft: 3 }}
                size="sm"
                color="secondary"
                onClick={this._submit.bind(this, { saveAsDraft: true })}
                disabled={this.props.isFormSaving}
              >
                {this.props.isNew ? "Save as draft" : "Save to draft"}
              </Button>
            </div>
          )}
        </div>
        {this._renderErrorMessage()}
      </div>
    );
  }

  _renderExtra() {
    return (
      <Prompt
        when={this._isSaveRequired()}
        message="Draft is in progress of being saved. Are you sure you want to leave?"
      />
    );
  }

  _autosaveToDraft() {
    if (!this._isSaveRequired()) {
      return;
    }

    this.props.autosave(
      this._buildPostBody({
        saveAsDraft: true,
      })
    );
  }

  _isSaveRequired() {
    const { item } = this.props;
    const title = _.get(item, "draft.title", _.get(item, "title"));
    const content = _.get(item, "draft.content", _.get(item, "content"));
    const { title: formTitle, content: formContent } = this.state.formValues;

    if (_.isEmpty(formTitle) && _.isEmpty(formContent)) {
      return false;
    }

    if (title === formTitle && content === formContent) {
      return false;
    }

    return true;
  }

  _onSubmit(opts) {
    this.props.submit(this._buildPostBody(opts));
  }

  _buildPostBody(opts) {
    if (opts && opts.saveAsDraft) {
      const originalValues = this.props.item || this.state.formValues;

      return {
        ...originalValues,
        draft: this._getDraftValues(),
        metadata: {
          ...originalValues.metadata,
          private_viewing_key: uuid(),
        },
        is_published: this.props.isNew
          ? false
          : this.props.item.is_published === true,
      };
    }

    return {
      ...this.state.formValues,
      is_published: true,
      draft: null,
    };
  }

  _getDraftValues() {
    return _.pick(this.state.formValues, [
      "title",
      "content",
      "description",
      "tags",
      "series",
      "allow_comments",
      "metadata.header_image_url",
    ]);
  }

  _getValue(prop, defaultValue = "") {
    if (!this.state.editDraftContents) {
      if (prop === "title") {
        return this.props.item.title;
      }
      if (prop === "content") {
        return this.props.item.content;
      }
    }

    return super._getValue(prop, defaultValue);
  }

  _isEditable() {
    return this.state.editDraftContents;
  }
}

export default PostForm;
