import { inject, observer } from "mobx-react";

import BaseItemsPage from "./BaseItemsPage";
import * as api from "../api";

@inject("pagesStore")
@observer
class Pages extends BaseItemsPage {
  componentDidMount() {
    this.props.pagesStore.loadPage(0);
  }

  render() {
    return this._renderContent(
      {
        title: "Content Pages",
        newItem: "Create a new content page",
        noItems: "No pages created yet",
        urlPart: this._getUrlPart(),
      },
      this.props.pagesStore
    );
  }

  _getStore() {
    return this.props.pagesStore;
  }

  _getUrlPart() {
    return "page";
  }

  async _onDeleteItem() {
    try {
      this.props.pagesStore.setItemDeleting(true);
      await api.deleteContentPage(this.props.pagesStore.deleteItemId);
      this.props.pagesStore.loadPage(0);
      this.props.pagesStore.setDeleteItemId(null);
    } catch (err) {
      console.log(err);  // TODO proper error logging
    } finally {
      this.props.pagesStore.setItemDeleting(false);
    }
  }
}

export default Pages;
