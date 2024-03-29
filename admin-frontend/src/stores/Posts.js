import _ from "lodash";
import React from "react";
import { action, observable } from "mobx";
import { toast } from "react-toastify";
import ItemsStore from "./ItemsStore";
import * as api from "../api";

class Posts extends ItemsStore {
  @observable
  socialDialog = null;

  @observable
  socialItem = null;

  @observable
  socialAvailability = null;

  @observable
  importModalOpen = false;

  @observable
  hideUnpublished = false;

  @action
  async loadSocialAvailability() {
    try {
      this.socialAvailability = await api.loadSocialAvailability();
    } catch (err) {
      console.log(err); // TODO proper error logging
    }
  }

  @action
  setHideUnpublished(hideUnpublished) {
    this.hideUnpublished = hideUnpublished;
    this.loadPage(0);
  }

  @action
  async postItemToSocial(opts = {}) {
    if (this.socialDialog === "hacker-news") {
      api.postToHackerNews(this.socialItem);
      this.setSocialDialog(null, null);
      return;
    }

    try {
      this.loading("postToSocial");
      const { url } = await api.postItemToSocial(
        this.socialDialog,
        this.socialItem.id,
        opts
      );
      toast.success(() => (
        <div>
          Posted successfully.
          {url && (
            <a
              target="_blank"
              style={{ color: "white", fontWeight: "bold", marginLeft: 5 }}
              href={url}
            >
              Open
            </a>
          )}
        </div>
      ));
    } catch (err) {
      toast.error(`${_.capitalize(this.socialDialog)} error. ${err.message}`);
    } finally {
      this.loaded("postToSocial");
      this.setSocialDialog(null, null);
    }
  }

  @action
  async loadPage(pageIndex) {
    await this._loadPage(pageIndex, "posts", api.loadPosts, {
      query: this.searchQuery,
      hideUnpublished: this.hideUnpublished,
    });
  }

  @action
  async importPost(url, keepCanonicalUrl, publishNow) {
    try {
      this.loading("importPost");
      await api.importPost(url, keepCanonicalUrl, publishNow);
      await this.loadPage(0);
      this.importModalOpen = false;
    } catch (err) {
      toast.error(err.message);
    } finally {
      this.loaded("importPost");
    }
  }

  @action
  setSocialDialog(key, item) {
    this.socialDialog = key;
    this.socialItem = item;
  }

  @action
  setImportModalOpen(open) {
    this.importModalOpen = open;
  }
}

const postsStore = new Posts();

export default postsStore;
