import React, {Component} from 'react';
import ReactModal from 'react-modal';
import { Button } from 'reactstrap';

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
          {this._renderTextarea({
            placeholder: 'Description',
            maxLength: 300,
            prop: 'description',
            optional: true,
            disabled: this.state.formValues.metadata.is_embed
          })}
          {this._renderFileInput({
            label: 'Header image URL',
            disabled: this.state.formValues.metadata.is_embed,
            prop: 'metadata.header_image_url'
          })}
          {this._renderToggle({ label: 'Save as embed', prop: 'metadata.is_embed' })}
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

  _onSubmit() {
    this.props.onSubmit(this.state.formValues);
  }
}

export default ContentPageForm;
