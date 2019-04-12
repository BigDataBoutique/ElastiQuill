import {action, computed, observable} from 'mobx';
import md5 from 'md5';
import localforage from 'localforage';
import {jsonFetch} from '../util';
import BaseStore from "./BaseStore";

import { cleanJwtToken } from '../util';

class App extends BaseStore {

  @observable
  loginErrors = [];

  @observable
  user;

  @observable
  socialAuthSources = [];

  async loadSession() {
    this.loading('loadSession');

    try {
      const resp = await jsonFetch('/api/auth/whoami');
      if (resp.status == 401) {
        this.setUser(null);
      } else {
        this.setUser(await resp.json());
      }
    } catch (err) {
      console.log(err);
    }

    try {
      const resp = await jsonFetch('/api/auth/social-auth-sources');
      this.setSocialAuthSources(await resp.json());
    } catch (err) {
      console.log(err);
    }

    if (location.hash == '#error') {
      this.showError(null, 'Failed to authenticate.');
      location.hash = '';
    }

    this.loaded('loadSession');
  }

  @computed
  get isAuthenticated() {
    return !!this.user;
  }

  @action
  setUser = (user) => {
    if (user) {
      user.avatarUrl = `https://www.gravatar.com/avatar/${md5(user.email.toLowerCase().trim())}?size=100&default=identicon`;
    }

    this.user = user;
    localforage.setItem('user', user);
  };

  @action
  setSocialAuthSources = (sources) => {
    this.socialAuthSources = sources;
  };

  @action
  addLoginError = (err) => {
    this.loginErrors.push(err);
  };

  @action
  clearLoginErrors = () => {
    this.loginErrors.length = 0;
  };

  login = async (username, password) => {
    try {
      this.clearLoginErrors();

      const response = await jsonFetch('/api/auth/local', {
        method: 'POST',
        body: JSON.stringify({username, password})
      });

      if (response.status === 401) {
        this.addLoginError(401);
        return;
      }

      if (response.status === 423) {
        this.addLoginError(423);
        return;
      }

      const res = await response.json();

      if (response.ok) {
        this.setUser(res.user);
      } else {
        throw new Error(response.status);
      }
    } catch (e) {
      this.setUser(null);
      this.showFetchError(e);
    }
  };

  logout = async () => {
    this.setUser(null);
    cleanJwtToken();
  };
}

const appStore = new App();
appStore.loadSession();

export default appStore;
