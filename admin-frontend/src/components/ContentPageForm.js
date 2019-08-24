import React, { Fragment } from 'react';
import { Button } from 'reactstrap';
import ReactSelect from 'react-select';

import BaseForm from './BaseForm';

const defaultFormValues = {
  content: '',
  metadata: {}
};

class ContentPageForm extends BaseForm {
  constructor(props) {
    super(props);
    this.state = {
      formValues: _.cloneDeep(props.isNew ? defaultFormValues : props.item)
    };
  }

  _renderModal() {
    return (
      <div className='row'>
        <div className='col-8'>
          {this._renderTypesSelect()}

          {this._getCurrentType() === 'page' && this._renderContentPageInputs()}
          {this._getCurrentType() === 'tag_description' && this._renderTagDescriptionInputs()}
        </div>
        <div className='col-4'>
          <Button
            size='sm'
            color='success'
            onClick={this._submit.bind(this)}
            disabled={this.props.isFormSaving}>
            {this.props.isFormSaving ? 'Saving...' : (this.props.isNew ? 'Publish now' : 'Save changes')}
          </Button>
        </div>
        {this._renderErrorMessage()}
      </div>
    )
  }

  _renderTypesSelect() {
    const typeOpts = [
      { label: 'Content page', value: 'page' },
      { label: 'Embeddable', value: 'embed' },
      { label: 'Tag / Series description', value: 'tag_description' },
    ];

    const type = this._getCurrentType();

    return (
      <div style={{ display: 'flex', marginBottom: 10 }}>
        <div style={{ lineHeight: '33px', marginRight: 10 }}>
          <label>Save as:</label>
        </div>
        <div style={{ flex: 1 }}>
          <ReactSelect
            isDisabled={! this.props.isNew}
            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            menuPortalTarget={document.body}
            defaultValue={_.find(typeOpts, ['value', 'page'])}
            onChange={this._onTypeChange.bind(this)}
            value={_.find(typeOpts, ['value', type])}
            options={typeOpts} />
        </div>
      </div>
    )
  }

  _renderContentPageInputs() {
    return (
      <Fragment>
        {this._renderTextarea({
          placeholder: 'Description',
          maxLength: 300,
          prop: 'description',
          optional: true
        })}
        {this._renderFileInput({
          label: 'Header image URL',
          prop: 'metadata.header_image_url'
        })}
      </Fragment>      
    )
  }

  _renderTagDescriptionInputs() {
    return (
      <Fragment>
        {this._renderSeriesPicker({
          disabled: ! this.props.isNew,
          includeTags: true,
          prop: 'metadata.tag_description',
          placeholder: 'Pick a tag or series'
        })}
      </Fragment>      
    )
  }

  _getCurrentType() {
    if (this._getValue('metadata.is_embed')) {
      return 'embed';
    }
    else if (this._getValue('metadata.is_tag_description')) {
      return 'tag_description';
    }
    else {
      return 'page';
    }
  }

  _onTypeChange(opt) {
    let isEmbed = false,
        isTagDescription = false;

    if (opt.value === 'embed') {
      isEmbed = true;
    }
    else if (opt.value === 'tag_description') {
      isTagDescription = true;
    }

    this._setValue('metadata.is_embed', isEmbed);
    this._setValue('metadata.is_tag_description', isTagDescription);
  }

  _onSubmit() {
    const isTagDescription = this._getValue('metadata.is_tag_description');
    if (isTagDescription) {
      const tagDescription = this._getValue('metadata.tag_description', null);
      if (! tagDescription) {
        return;
      }
    }

    this.props.submit(this.state.formValues);
  }
}

export default ContentPageForm;
