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

    switch (this._getType()) {
      case 'post':
        this.loadItem = api.loadPostById;
        this.createItem = api.createPost;
        this.updateItem = api.updatePost;

        this.ItemForm = PostForm;
        this.store = this.props.postsStore;
        this.breadcrumbs = [{
          url: urls.posts,
          label: 'Posts'
        }];
        break;
      case 'page':
        this.loadItem = api.loadContentPageById;
        this.createItem = api.createContentPage;
        this.updateItem = api.updateContentPage;

        this.ItemForm = ContentPageForm;
        this.store = this.props.pagesStore;
        this.breadcrumbs = [{
          url: urls.pages,
          label: 'Content Pages'
        }];
        break;      
    }

    if (! this._isNew()) {
      this.store._loadItem(props.match.params.id, this._getType(), this.loadItem);
    }
  }

  render() {
    const ItemForm = this.ItemForm;

    let blogpostId = null;
    if (! this._isNew() && this._getType() === 'post') {
      blogpostId = this.props.match.params.id;
    }

    return <LoggedInLayout pageTitle={this._renderPageTitle()} breadcrumbs={this.breadcrumbs}>
      <div className="content">
        {this.store.isLoading ? 'Loading...' : (
          <ItemForm
            blogpostId={blogpostId}
            isNew={this._isNew()}
            isFormSaving={this.store.isFormSaving}
            isFormModalOpen={this.store.isFormModalOpen}
            setFormModalOpen={open => this.store.setFormModalOpen(open)}
            onSubmit={this._onSubmit.bind(this)}
            item={this.store.currentItem} />
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

  async _onSubmit(formValues) {
    const store = this.store;
    let save = this._isNew() ? this.createItem : this.updateItem.bind(this, store.currentItem.id);

    this.store.setFormSaving(true);
    try {
      const resp = await save({
        ...formValues,
        ///private_viewing_key: null // TODO auto generate UUID
      });

      if (this._isNew()) {
        this.props.history.replace('/edit/'+this._getType()+'/' + resp.id);
      }

      toast.success('Changes saved');
      this.store.setFormModalOpen(false);
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
      this.store.setFormSaving(false);
    }
  }
}

export default ItemFormPage;
