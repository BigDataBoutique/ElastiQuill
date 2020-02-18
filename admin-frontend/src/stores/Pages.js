import { action } from "mobx";
import ItemsStore from "./ItemsStore";
import * as api from "../api";

class Pages extends ItemsStore {
  @action
  async loadPage(pageIndex) {
    await this._loadPage(pageIndex, "Pages", api.loadContentPages, {
      query: this.searchQuery,
    });
  }
}

const pagesStore = new Pages();

export default pagesStore;