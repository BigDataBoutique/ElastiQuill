import { action, computed, observable } from 'mobx';
import localforage from 'localforage';
import * as api from '../api';
import { authFetch } from '../util';
import BaseStore from "./BaseStore";

import { cleanJwtToken, setUnauthorizedHandler } from '../util';

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
      const resp = await authFetch('/api/auth/whoami', {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      if (resp.status == 401) {
        this.setUser(null);
      } else {
        this.setUser(await resp.json());
        setUnauthorizedHandler(() => this.setUser(null));
      }
    } catch (err) {
      console.log(err);
    }

    try {
      this.setSocialAuthSources(await api.loadAuthSources());
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
      user.avatarUrl = api.userAvatarUrl(user.authorizedBy);
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

      const response = await authFetch('/api/auth/local', {
        method: 'POST',
        body: JSON.stringify({username, password}),
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
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
    cleanJwtToken();
    api.logout();
  };
}

const appStore = new App();
appStore.loadSession();

export default appStore;
