import _ from 'lodash';
import React from 'react';
import { action, computed, observable } from 'mobx';
import { toast } from 'react-toastify';
import localforage from 'localforage';
import ItemsStore from './ItemsStore';
import * as api from '../api';

class Posts extends ItemsStore {

  @observable
  socialDialog = null;

  @observable
  socialItem = null;

  @observable
  socialAvailability = null;

  @action
  async loadSocialAvailability() {
    try {
      this.socialAvailability = await api.loadSocialAvailability();
    }
    catch (err) {
      console.log(err);
    }
  }

  @action
  async postItemToSocial(opts = {}) {
    try {
      this.loading('postToSocial');
      const { url } = await api.postItemToSocial(this.socialDialog, this.socialItem.id, opts);
      toast.success(() => (
        <div>
          Posted successfully.
          {url && <a
            target='_blank'
            style={{ color: 'white', fontWeight: 'bold', marginLeft: 5 }}
            href={url}>Open</a>}
        </div>
      ));
    }
    catch (err) {
      toast.error(`${_.capitalize(this.socialDialog)} error. ${err.message}`);
    }
    finally {
      this.loaded('postToSocial');
      this.setSocialDialog(null, null);
    }
  }

  @action
  async loadPage(pageIndex) {
    await this._loadPage(pageIndex, 'posts', api.loadPosts);
  }

  @action
  setSocialDialog(key, item) {
    this.socialDialog = key;
    this.socialItem = item;
  }
}

const postsStore = new Posts();

export default postsStore;
