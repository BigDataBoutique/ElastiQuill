import _ from 'lodash';
import React, {Component} from 'react';
import classnames from 'classnames';
import ReactModal from 'react-modal';
import ReactSelect from 'react-select';
import * as Showdown from "showdown";
import { Alert } from 'reactstrap';

import ContentEditor from './ContentEditor';
import TagsInput from './TagsInput';

class BaseForm extends Component {
  constructor(props) {
    super(props);
    this._markdownConverter = Showdown.Converter({
      tables: true,
      simplifiedAutoLink: true,
      strikethrough: true,
      tasklists: true
    });
  }

  render() {
    const modalStyle = {
      content : {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '50%',
        overflow: 'hidden'
      }
    };

    return (
      <div style={{ background: 'white', padding: 30 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1 }}>
            {this._renderSimpleInput({ prop: 'title', placeholder: 'Title', style: { border: '0px', fontSize: '30px' } })}
          </div>
          <div>
            <div onClick={() => this.props.setFormModalOpen(true)} className='btn btn-outline-success btn-sm'>
              {this.props.isNew ? 'Ready to publish?' : 'Save changes'}
            </div>
          </div>
        </div>
        {this._renderContentEditor({ prop: 'content', contentType: this._getCurrentContentType(this.props.item), optional: true })}
        <ReactModal
          style={modalStyle}
          isOpen={this.props.isFormModalOpen}
          onRequestClose={() => this.props.setFormModalOpen(false)}>
          {this._renderModal()}
        </ReactModal>
      </div>
    )
  }

  _renderErrorMessage() {
    if (this.props.errorMessage) {
      return (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <Alert color='danger'>{this.props.errorMessage}</Alert>
        </div>
      )
    }
    return false;
  }

  _renderContentEditor({ prop, contentType }) {
    return (
      <div style={{ marginBottom: 10 }}>
        <ContentEditor
          contentType={contentType}
          value={this._getValue(prop, '')}
          onChange={val => this._setValue(prop, val)} />
      </div>
    );
  }

  _renderTagsInput({ label, prop }) {
    const value = this._getValue(prop, []);
    const onChange = tags => {
      let newTags = [];
      tags.forEach(tag => {
        newTags = newTags.concat(tag.split(','));
      });
      newTags = _.uniq(newTags).filter(x => x.length).map(x => x.trim());
      this._setValue(prop, newTags);
    };

    return (
      <div className='row' style={{ paddingBottom: 10 }}>
        <div className='col-12'>
          <div style={{ display: 'flex' }}>
            <TagsInput
              style={{ width: '100%' }}
              value={value} onChange={onChange} />
          </div>
        </div>
      </div>
    )
  }

  _renderToggle({ label, prop, disabled }) {
    const randomId = label.split(' ').join('') + Math.random();
    const checked = this._getValue(prop, false);
    const onChange = ev => this._setValue(prop, ev.target.checked);

    return (
      <div className="form-check">
        <input
          id={randomId}
          className="form-check-input" type="checkbox" checked={checked} onChange={! disabled && onChange} disabled={disabled} />
        <label className="form-check-label" htmlFor={randomId}>
          {label}
        </label>
        <div className="invalid-feedback">
          This field is required
        </div>
      </div>
    );
  }


  _renderSelect({ label, helper, prop, items, onlySelect, optional }) {
    const value = this._getValue(prop);
    const isInvalid = ! optional && this.state.showErrors && value.length === 0;

    const options = items.map(it => ({ label: it.label, value: it.key }));
    if (optional) {
      options.unshift({ label, value: '' });
    }

    const onChange = option => this._setValue(prop, option.value);

    const selectComponent = (
      <div style={{ width: '100%' }}>
        <ReactSelect key={prop}
          value={_.find(options, ['value', value])}
          onChange={onChange}
          options={options} />
        <input readOnly
          className={classnames('form-control', { 'is-invalid': isInvalid })}
          type='text' style={{ width: '0px', height: '0px', margin: '0px', padding: '0px', opacity: 0 }} value={value} />
        <div className="invalid-feedback">
          This field is required
        </div>
      </div>
    );

    if (onlySelect) {
      return selectComponent;
    }

    return (
      <div className='row' style={{ paddingBottom: 10 }}>
        <div className='col-12 col-md-4'>
          <label className="form-control-label">{label}</label>
          <div style={{ fontSize: '13px' }}>
            {helper}
          </div>
        </div>
        <div className='col-12 col-md-8'>
          {selectComponent}
        </div>
      </div>
    )
  }

  _renderSimpleInput({ prop, placeholder, style, optional, className, disabled }) {
    const value = this._getValue(prop, '');
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid = this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className='row' style={{ paddingBottom: 10 }}>
        <div className='col-12'>
          <div style={{ display: 'flex' }}>
            <input
              style={{ width: '100%', ...style }}
              type={'text'}
              placeholder={placeholder}
              className={classnames(className, { 'is-invalid': isInvalid })}
              disabled={disabled}
              value={value}
              onChange={onChange} />
          </div>
          <div className="invalid-feedback">
            This field is required
          </div>
        </div>
      </div>
    )
  }

  _renderTextarea({ prop, maxLength, placeholder, style, disabled, optional }) {
    const value = this._getValue(prop, '');
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid = this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className='row' style={{ paddingBottom: 10 }}>
        <div className='col-12'>
          <div style={{ display: 'flex' }}>
            <textarea
              disabled={disabled}
              style={{ width: '100%', overflow: 'hidden', paddingRight: '70px', ...style }}
              placeholder={placeholder}
              className={classnames('form-control', { 'is-invalid': isInvalid })}
              value={value}
              maxLength={maxLength}
              onChange={onChange} />
            {maxLength && (
              <span style={{ position: 'absolute', right: '25px', top: '5px', color: '#555' }}>
                {value.length}/{maxLength}
              </span>
            )}
          </div>
          <div className="invalid-feedback">
            This field is required
          </div>
        </div>
      </div>
    )
  }

  _renderInput({ label, helper, prop, disabled, optional, type, unit, placeholder }) {
    const value = this._getValue(prop, '');
    const onChange = ev => this._setValue(prop, ev.target.value);
    const isInvalid = this.state.showErrors && !optional ? value.length === 0 : false;

    return (
      <div className='row' style={{ paddingBottom: 10 }}>
        <div className='col-12 col-md-4'>
          <label className="form-control-label">{label}</label>
          <div style={{ fontSize: '13px' }}>
            {helper}
          </div>
        </div>
        <div className='col-12 col-md-8'>
          <div style={{ display: 'flex' }}>
            <input
              style={{ maxWidth: '100%' }}
              type={type || 'text'}
              placeholder={placeholder}
              className={classnames('form-control', { 'is-invalid': isInvalid })}
              value={value}
              onChange={disabled ? undefined : onChange}
              disabled={disabled} />
            {unit && <span style={{ margin: 5 }}>{unit}</span>}
          </div>
          <div className="invalid-feedback">
            This field is required
          </div>
        </div>
      </div>
    )
  }

  _getValue(prop, defaultValue = '') {
    return _.result(this.state.formValues, prop, defaultValue);
  }

  _setValue(prop, value, cb) {
    return this.setState({
      formValues: _.set(this.state.formValues, prop, value)
    }, this._updateErrorsState.bind(this, cb));
  }

  _updateErrorsState(cb) {
    return this.setState({
      anyErrors: !! this._findErrorElements()
    }, cb)
  }

  _findErrorElements() {
    return document.querySelector('.is-invalid');
  }

  _getCurrentContentType(item) {
    if (this.props.isNew) {
      return 'markdown';
    }
    return item.content_type;
  }

  _submit() {
    this.setState({
      showErrors: true
    }, () => {
      if (this._findErrorElements()) {
        this.setState({ anyErrors: true });
        return;
      }

      this.setState({ isSaving: true }, this._onSubmit.bind(this));
    });
  }
}

export default BaseForm;
