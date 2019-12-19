import { action, observable } from "mobx";
import BaseStore from "./BaseStore";

export default class ItemsStore extends BaseStore {
  @observable
  items = [];

  @observable
  currentItem = null;

  @observable
  deleteItemId = null;

  @observable
  searchQuery = "";

  @observable
  pageIndex = 0;

  @observable
  totalPages = 0;

  @observable
  formErrorMessage = null;

  @observable
  itemFormOpen = false;

  @observable
  isFormSaving = false;

  @observable
  isFormAutosaving = false;

  @observable
  isFormModalOpen = false;

  @observable
  isItemDeleting = false;

  isSearchResult = false;

  @action
  setItemDeleting(deleting) {
    this.isItemDeleting = deleting;
  }

  @action
  setDeleteItemId(id) {
    this.deleteItemId = id;
  }

  @action
  setFormErrorMessage(message) {
    this.formErrorMessage = message;
  }

  @action
  setFormModalOpen(open) {
    this.isFormModalOpen = open;
  }

  @action
  setItemFormOpen(open) {
    this.itemFormOpen = open;
  }

  @action
  setCurrentItem(item) {
    this.currentItem = item;
  }

  @action
  setFormSaving(isSaving) {
    this.isFormSaving = isSaving;
  }

  @action
  setFormAutosaving(isAutosaving) {
    this.isFormAutosaving = isAutosaving;
  }

  @action
  setSearchQuery(text) {
    this.searchQuery = text;
  }

  @action
  async _loadPage(pageIndex, name, func) {
    this.loading(name);

    try {
      const resp = await func(pageIndex, this.searchQuery);
      this.isSearchResult = this.searchQuery.length > 0;
      this.items = resp.items;
      this.totalPages = resp.total_pages;
      this.pageIndex = pageIndex;
    } catch (err) {
      console.log(err);
    } finally {
      this.loaded(name);
    }
  }

  @action
  async _loadItem(id, name, func) {
    this.loading(name);

    try {
      this.currentItem = await func(id);
    } catch (err) {
      console.log(err);
    } finally {
      this.loaded(name);
    }
  }
}
