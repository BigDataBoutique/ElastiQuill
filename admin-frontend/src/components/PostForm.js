import _ from "lodash";
import React from "react";
import { Button, Spinner } from "reactstrap";
import uuid from "uuid/v1";

import BaseForm from "./BaseForm";

const defaultFormValues = {
  allow_comments: true,
  content: "",
  metadata: {},
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
    };
  }

  componentDidMount() {
    if (!this.props.isNew) {
      this._autosaveTimer = setInterval(() => this._autosaveToDraft(), 5000);
    }
  }

  componentWillUnmount() {
    if (this._autosaveTimer !== null) {
      clearInterval(this._autosaveTimer);
      this._autosaveTimer = null;
    }
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

  _autosaveToDraft() {
    const { item } = this.props;
    const title = _.get(item, "draft.title", _.get(item, "title"));
    const content = _.get(item, "draft.content", _.get(item, "content"));

    const { title: formTitle, content: formContent } = this.state.formValues;
    if (title === formTitle && content === formContent) {
      return;
    }

    this.props.autosave({
      ...this.props.item,
      draft: this._getDraftValues(),
      metadata: {
        ...this.props.item.metadata,
        private_viewing_key: uuid(),
      },
    });
  }

  _onSubmit(opts) {
    if (opts && opts.saveAsDraft) {
      const originalValues = this.props.isNew
        ? this.state.formValues
        : this.props.item;

      this.props.submit({
        ...originalValues,
        draft: this._getDraftValues(),
        metadata: {
          ...originalValues.metadata,
          private_viewing_key: uuid(),
        },
        is_published: this.props.isNew
          ? false
          : this.props.item.is_published === true,
      });
      return;
    }

    this.props.submit({
      ...this.state.formValues,
      is_published: true,
      draft: null,
    });
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
}

export default PostForm;
