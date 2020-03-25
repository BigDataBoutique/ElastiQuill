import _ from "lodash";
import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { toast } from "react-toastify";
import LoggedInLayout from "../components/LoggedInLayout";
import PostForm from "../components/PostForm";
import ContentPageForm from "../components/ContentPageForm";
import urls from "../config/urls";
import * as api from "../api";

@inject("pagesStore")
@inject("postsStore")
@observer
class ItemFormPage extends Component {
  constructor(props) {
    super(props);

    switch (this._getType()) {
      case "post":
        this.loadItem = api.loadPostById;
        this.createItem = api.createPost;
        this.updateItem = api.updatePost;

        this.ItemForm = PostForm;
        this.store = this.props.postsStore;
        this.breadcrumbs = [
          {
            url: urls.posts,
            label: "Posts",
          },
        ];
        break;
      case "page":
        this.loadItem = api.loadContentPageById;
        this.createItem = api.createContentPage;
        this.updateItem = api.updateContentPage;

        this.ItemForm = ContentPageForm;
        this.store = this.props.pagesStore;
        this.breadcrumbs = [
          {
            url: urls.pages,
            label: "Content Pages",
          },
        ];
        break;
    }

    if (this._isNew()) {
      this.store.setCurrentItem(null);
    } else {
      this.store._loadItem(
        props.match.params.id,
        this._getType(),
        this.loadItem
      );
    }
  }

  render() {
    const ItemForm = this.ItemForm;

    let blogpostId = null;
    if (!this._isNew() && this._getType() === "post") {
      blogpostId = this.props.match.params.id;
    }

    return (
      <LoggedInLayout
        pageTitle={this._renderPageTitle()}
        breadcrumbs={this.breadcrumbs}
      >
        <div className="elastiquill-content">
          {this.store.isLoading ? (
            "Loading..."
          ) : (
            <ItemForm
              blogpostId={blogpostId}
              isNew={this._isNew()}
              isFormSaving={this.store.isFormSaving}
              isFormAutosaving={this.store.isFormAutosaving}
              isFormModalOpen={this.store.isFormModalOpen}
              setFormModalOpen={open => this.store.setFormModalOpen(open)}
              submit={this._onSubmit.bind(this)}
              autosave={this._onAutosave.bind(this)}
              item={this.store.currentItem}
            />
          )}
        </div>
      </LoggedInLayout>
    );
  }

  _renderPageTitle() {
    let title = this._isNew() ? "New" : "Edit";
    title += " " + this.props.match.params.type;
    return title;
  }

  _isNew() {
    return this.props.match.path.startsWith("/new");
  }

  _getType() {
    return this.props.match.params.type;
  }

  async _onAutosave(formValues) {
    this.store.setFormAutosaving(true);
    try {
      const save = !formValues.id
        ? this.createItem
        : this.updateItem.bind(this, this.store.currentItem.id);

      const resp = await save(formValues);
      if (resp.error) {
        throw resp.error;
      }

      this.store.setCurrentItem({
        ...formValues,
        id: resp.id,
        url: resp.url,
      });
    } catch (err) {
      console.log(err); // TODO proper error logging
    } finally {
      this.store.setFormAutosaving(false);
    }
  }

  async _onSubmit(formValues) {
    const store = this.store;
    const save = !_.get(store.currentItem, "id")
      ? this.createItem
      : this.updateItem.bind(this, store.currentItem.id);

    this.store.setFormSaving(true);
    try {
      const resp = await save(formValues);

      if (this._isNew()) {
        this.props.history.replace("/edit/" + this._getType() + "/" + resp.id);
      }

      toast.success("Changes saved");
      this.store.setFormModalOpen(false);
      this.store.setCurrentItem(formValues);
    } catch (err) {
      console.log(err); // TODO proper error logging
      let errorMsg = err.message;
      if (err.message === "Conflict") {
        errorMsg = "Page with that name already exists";
      }
      toast.error(errorMsg);
    } finally {
      this.store.setFormSaving(false);
    }
  }
}

export default ItemFormPage;
