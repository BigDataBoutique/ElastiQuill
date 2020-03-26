import _ from "lodash";
import React, { Component, createRef } from "react";
import { toast } from "react-toastify";
import classnames from "classnames";
import ReactModal from "react-modal";
import ReactSelect from "react-select";
import { Alert } from "reactstrap";
import * as Showdown from "showdown";
import FileUploadProgress from "react-fileupload-progress";

import ContentEditor from "./ContentEditor";
import SeriesPicker from "./SeriesPicker";
import TagsInput from "./TagsInput";
import * as api from "../api";
import { getJwtToken } from "../util";

class BaseForm extends Component {
  constructor(props) {
    super(props);
    this._markdownConverter = Showdown.Converter({
      tables: true,
      simplifiedAutoLink: true,
      strikethrough: true,
      tasklists: true,
    });
    this.formRef = createRef();
  }

  render() {
    const modalStyle = {
      content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)",
        width: "50%",
        overflow: "hidden",
      },
    };

    let saveBtnLabel = this.props.isNew ? "Create" : "Publish changes";
    if (this._renderModal && this.props.isNew) {
      saveBtnLabel = "Ready to publish?";
    }

    if (this.props.isFormSaving) {
      saveBtnLabel = "Saving...";
    } else if (this.props.isFormAutosaving) {
      saveBtnLabel = "Saving to draft...";
    }

    const onClickSave = () => {
      if (this._renderModal) {
        this.props.setFormModalOpen(true);
      } else {
        this.props.submit(this.state.formValues);
      }
    };

    return (
      <div style={{ position: "relative", background: "white", padding: 30 }}>
        <div
          style={{ position: "absolute", right: 5, top: 5, cursor: "pointer" }}
        >
          {this._renderExtraToolbarButton && this._renderExtraToolbarButton()}
          <button
            disabled={this.props.isFormAutosaving}
            onClick={onClickSave}
            className="btn btn-outline-success btn-sm"
          >
            {saveBtnLabel}
          </button>
        </div>
        <div style={{ paddingTop: 10, display: "flex" }}>
          <div style={{ flex: 1 }}>
            {this._renderSimpleInput({
              prop: "title",
              placeholder: "Title",
              style: { border: "0px", fontSize: "2.5rem", fontWeight: 500 },
            })}
          </div>
        </div>
        {this._renderContentEditor({
          prop: "content",
          contentType: this._getCurrentContentType(this.props.item),
          optional: true,
          blogpostId: this.props.blogpostId,
        })}
        <ReactModal
          style={modalStyle}
          isOpen={this.props.isFormModalOpen}
          onRequestClose={() => this.props.setFormModalOpen(false)}
        >
          {this._renderModal()}
        </ReactModal>
        {this._renderExtra && this._renderExtra()}
      </div>
    );
  }

  _renderErrorMessage() {
    if (this.props.errorMessage) {
      return (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <Alert color="danger">{this.props.errorMessage}</Alert>
        </div>
      );
    }
    return false;
  }

  _renderContentEditor({ prop, contentType, blogpostId }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <ContentEditor
          editorKey={this.state.contentEditorKey}
          blogpostId={blogpostId}
          contentType={contentType}
          disabled={!this._isEditable()}
          value={this._getValue(prop, "")}
          onChange={val => this._setValue(prop, val)}
        />
      </div>
    );
  }

  _renderTagsInput({ prop }) {
    const value = this._getValue(prop, []);
    const onChange = tags => {
      this._setValue(prop, tags);
    };

    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12">
          <div style={{ display: "flex" }}>
            <TagsInput
              style={{ width: "100%" }}
              value={value}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    );
  }

  _renderSeriesPicker({ disabled, placeholder, includeTags, prop }) {
    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12">
          <div style={{ display: "flex" }}>
            <SeriesPicker
              disabled={disabled}
              placeholder={placeholder}
              includeTags={includeTags}
              value={this._getValue(prop, null)}
              onChange={value => this._setValue(prop, value)}
            />
          </div>
        </div>
      </div>
    );
  }

  _renderFileInput({ label, prop, disabled }) {
    const formRenderer = onSubmit => (
      <form
        ref={this.formRef}
        className="_react_fileupload_form_content"
        method="post"
        onSubmit={onSubmit}
      >
        <div>
          <input type="file" name="file" onChange={onSubmit} />
        </div>
      </form>
    );

    const beforeSend = xhr => {
      xhr.setRequestHeader("Authorization", "Bearer " + getJwtToken());
      return xhr;
    };

    const onLoad = (e, data) => {
      try {
        const resp = JSON.parse(data.response);
        if (resp.error) {
          toast.error(resp.error);
          return;
        }
        this._setValue(prop, resp.files[0].url);
      } catch (err) {
        console.log(err); // TODO proper error logging
      }
    };

    const value = this._getValue(prop);

    return (
      <div style={{ paddingBottom: 10, width: "100%" }}>
        {this._renderSimpleInput({
          disabled,
          prop,
          placeholder: label,
          optional: true,
          className: "form-control",
        })}
        {!disabled && (
          <FileUploadProgress
            key={value}
            disabled={disabled}
            formRenderer={formRenderer}
            formGetter={() => new FormData(this.formRef.current)}
            beforeSend={beforeSend}
            url={api.uploadImageUrl()}
            method="POST"
            onLoad={onLoad}
            onError={e => toast.error(e.message)}
          />
        )}
      </div>
    );
  }

  _renderToggle({ label, prop, disabled }) {
    const randomId = label.split(" ").join("") + Math.random();
    const checked = this._getValue(prop, false);
    const onChange = ev => this._setValue(prop, ev.target.checked);

    return (
      <div className="form-check">
        <input
          id={randomId}
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={!disabled && onChange}
          disabled={disabled}
        />
        <label className="form-check-label" htmlFor={randomId}>
          {label}
        </label>
        <div className="invalid-feedback">This field is required</div>
      </div>
    );
  }

  _renderSelect({ label, helper, prop, items, onlySelect, optional }) {
    const value = this._getValue(prop);
    const isInvalid = !optional && this.state.showErrors && value.length === 0;

    const options = items.map(it => ({ label: it.label, value: it.key }));
    if (optional) {
      options.unshift({ label, value: "" });
    }

    const onChange = option => this._setValue(prop, option.value);

    const selectComponent = (
      <div style={{ width: "100%" }}>
        <ReactSelect
          key={prop}
          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
          menuPortalTarget={document.body}
          value={_.find(options, ["value", value])}
          onChange={onChange}
          options={options}
        />
        <input
          readOnly
          className={classnames("form-control", { "is-invalid": isInvalid })}
          type="text"
          style={{
            width: "0px",
            height: "0px",
            margin: "0px",
            padding: "0px",
            opacity: 0,
          }}
          value={value}
        />
        <div className="invalid-feedback">This field is required</div>
      </div>
    );

    if (onlySelect) {
      return selectComponent;
    }

    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12 col-md-4">
          <label className="form-control-label">{label}</label>
          <div style={{ fontSize: "13px" }}>{helper}</div>
        </div>
        <div className="col-12 col-md-8">{selectComponent}</div>
      </div>
    );
  }

  _renderSimpleInput({
    prop,
    placeholder,
    style,
    optional,
    className,
    disabled,
  }) {
    const value = this._getValue(prop, "");
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid =
      this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12">
          <div style={{ display: "flex" }}>
            <input
              style={{ width: "100%", ...style }}
              type={"text"}
              placeholder={placeholder}
              className={classnames(className, { "is-invalid": isInvalid })}
              disabled={disabled}
              value={value}
              onChange={onChange}
            />
          </div>
          <div className="invalid-feedback">This field is required</div>
        </div>
      </div>
    );
  }

  _renderTextarea({ prop, maxLength, placeholder, style, disabled, optional }) {
    const value = this._getValue(prop, "");
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid =
      this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12">
          <div style={{ display: "flex" }}>
            <textarea
              disabled={disabled}
              style={{
                width: "100%",
                overflow: "hidden",
                paddingRight: "70px",
                ...style,
              }}
              placeholder={placeholder}
              className={classnames("form-control", {
                "is-invalid": isInvalid,
              })}
              value={value}
              maxLength={maxLength}
              onChange={onChange}
            />
            {maxLength && (
              <span
                style={{
                  position: "absolute",
                  right: "25px",
                  top: "5px",
                  color: "#555",
                }}
              >
                {value.length}/{maxLength}
              </span>
            )}
          </div>
          <div className="invalid-feedback">This field is required</div>
        </div>
      </div>
    );
  }

  _renderInput({
    label,
    helper,
    prop,
    disabled,
    optional,
    type,
    unit,
    placeholder,
  }) {
    const value = this._getValue(prop, "");
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid =
      this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="col-12 col-md-4">
          <label className="form-control-label">{label}</label>
          <div style={{ fontSize: "13px" }}>{helper}</div>
        </div>
        <div className="col-12 col-md-8">
          <div style={{ display: "flex" }}>
            <input
              style={{ maxWidth: "100%" }}
              type={type || "text"}
              placeholder={placeholder}
              className={classnames("form-control", {
                "is-invalid": isInvalid,
              })}
              value={value}
              onChange={disabled ? undefined : onChange}
              disabled={disabled}
            />
            {unit && <span style={{ margin: 5 }}>{unit}</span>}
          </div>
          <div className="invalid-feedback">This field is required</div>
        </div>
      </div>
    );
  }

  _getValue(prop, defaultValue = "") {
    return _.result(this.state.formValues, prop) || defaultValue;
  }

  _setValue(prop, value, cb) {
    if (!this._isEditable()) {
      return;
    }

    return this.setState(
      {
        formValues: _.set(this.state.formValues, prop, value),
      },
      this._updateErrorsState.bind(this, cb)
    );
  }

  _updateErrorsState(cb) {
    return this.setState(
      {
        anyErrors: !!this._findErrorElements(),
      },
      cb
    );
  }

  _findErrorElements() {
    return document.querySelector(".is-invalid");
  }

  _getCurrentContentType(item) {
    if (this.props.isNew) {
      return this.props.contentType;
    }
    return item.metadata.content_type;
  }

  _submit(opts) {
    this.setState(
      {
        showErrors: true,
      },
      () => {
        if (this._findErrorElements()) {
          this.setState({ anyErrors: true });
          return;
        }

        this.setState({ isSaving: true }, this._onSubmit.bind(this, opts));
      }
    );
  }

  _isEditable() {
    return true;
  }
}

export default BaseForm;
