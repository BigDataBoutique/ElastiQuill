import _ from 'lodash';
import React, {Component} from 'react';
import {inject, observer} from 'mobx-react';
import classnames from 'classnames';
import {toast} from 'react-toastify';
import LoggedInLayout from '../components/LoggedInLayout';
import PostForm from '../components/PostForm';
import ContentPageForm from '../components/ContentPageForm';
import urls from '../config/urls';
import * as api from '../api';

@inject('pagesStore')
@inject('postsStore')
@observer
class ItemFormPage extends Component {
  constructor(props) {
    super(props);
    if (! this._isNew()) {
      const loadItem = this._getType() == 'post' ? api.loadPostById : api.loadContentPageById;
      this._getStore()._loadItem(props.match.params.id, this._getType(), loadItem);
    }
  }

  render() {
    const ItemForm = this._getType() == 'post' ? PostForm : ContentPageForm;
    const breadcrumbs = [
      this._getType() === 'post' ? {
        url: urls.posts,
        label: 'Posts'
      } : {
        url: urls.pages,
        label: 'Content Pages'
      }
    ];

    let blogpostId = null;
    if (! this._isNew() && this._getType() === 'post') {
      blogpostId = this.props.match.params.id;
    }

    return <LoggedInLayout pageTitle={this._renderPageTitle()} breadcrumbs={breadcrumbs}>
      <div className="content">
        {this._getStore().isLoading ? 'Loading...' : (
          <ItemForm
            blogpostId={blogpostId}
            isNew={this._isNew()}
            isFormSaving={this._getStore().isFormSaving}
            isFormModalOpen={this._getStore().isFormModalOpen}
            setFormModalOpen={open => this._getStore().setFormModalOpen(open)}
            onSubmit={this._onSubmit.bind(this)}
            item={this._getStore().currentItem} />
        )}
      </div>
    </LoggedInLayout>;
  }

  _renderPageTitle() {
    let title = this._isNew() ? 'New' : 'Edit';
    title += ' ' + this.props.match.params.type;
    return title;
  }

  _isNew() {
    return this.props.match.path.startsWith('/new');
  }

  _getType() {
    return this.props.match.params.type;
  }

  _getStore() {
    return this._getType() == 'post' ? this.props.postsStore : this.props.pagesStore
  }

  async _onSubmit(formValues) {
    const store = this._getStore();
    let save = null;

    if (this._getType() === 'post') {
      save = this._isNew() ? api.createPost : api.updatePost.bind(this, store.currentItem.id);
    }
    else {
      save = this._isNew() ? api.createContentPage : api.updateContentPage.bind(this, store.currentItem.id);
    }

    this._getStore().setFormSaving(true);
    try {
      const resp = await save({
        ...formValues,
        description: _.isEmpty(formValues.description) ? '' : formValues.description,
        ///private_viewing_key: null // TODO auto generate UUID
      });

      if (this._isNew()) {
        this.props.history.replace('/edit/'+this._getType()+'/' + resp.id);
      }
      this._getStore().setFormModalOpen(false);
    }
    catch (err) {
      console.log(err);
      
      let errorMsg = err.message;
      if (err.message === 'Conflict') {
        errorMsg = 'Page with that name already exists';
      }
      toast.error(errorMsg);
    }
    finally {
      this._getStore().setFormSaving(false);
    }
  }
}

export default ItemFormPage;
