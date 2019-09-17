import { action, computed, observable } from 'mobx';
import BaseStore from './BaseStore';
import * as api from '../api';

class Stats extends BaseStore {

  @observable
  item = null;

  @observable
  comments = null;
  
  @action
  async loadData(itemType, id) {
    this.loading('stats');
    try {
      if (itemType === 'post') {
        this.item = await api.loadPostById(id);
        this.comments = await api.loadComments(id);
      }
      else {
        this.item = await api.loadContentPageById(id);
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      this.loaded('stats');
    }
  }
}

const statsStore = new Stats();
export default statsStore;
