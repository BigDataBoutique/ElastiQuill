import { action, computed, observable } from "mobx";
import { toast } from "react-toastify";

export default class BaseStore {
  /**
   * Stuff being loaded at the moment.
   * @type {Array}
   */
  @observable
  beingLoaded = [];

  /**
   * Something started loading
   * @param loading
   */
  @action
  loading = loading => {
    this.beingLoaded.push(loading);
  };

  /**
   * Something finished loading
   * @param loaded
   */
  @action
  loaded = loaded => {
    const deleteMe = this.beingLoaded.indexOf(loaded);
    if (deleteMe > -1) {
      this.beingLoaded.splice(deleteMe, 1);
    }
  };

  @computed
  get isLoading() {
    return this.beingLoaded.length > 0;
  }

  showFetchError = (err = null) => {
    this.showError(err, "There has been a problem with your fetch operation");
  };

  showError = (err = null, customMessage = null) => {
    let errorMsg = customMessage ? customMessage : "A problem occurred";

    if (err) {
      console.log(err); // TODO proper error logging
      errorMsg += ": " + err.message;
    }

    toast.error(errorMsg);
  };
}
