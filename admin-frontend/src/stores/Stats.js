import { action, computed, observable } from 'mobx';
import BaseStore from './BaseStore';
import * as api from '../api';

class Stats extends BaseStore {

  @observable
  item = null;

  @observable
  recentComments = [];

  @observable
  visitsByLocation = [];

  @observable
  visitsHistogramData = [];

  @action
  async loadStats(itemType, id) {
    this.loading('stats');
    try {
      if (itemType === 'post') {
        this.item = await api.loadPostById(id);
      }
      else {
        this.item = await api.loadContentPageById(id);
      }

      const visitsData = await api.loadItemStats(itemType, id);
      this.visitsHistogramData = visitsData.visits_by_date;
      this.visitsByLocation = visitsData.visits_by_location;

    }
    catch (err) {
      console.log(err);
    }
    finally {
      this.loaded('stats');
    }
  }

  @action
  async loadRecentComments(id) {
    try {
      this.loading('comments');
      const commentsData = await api.loadCommentsStats(id);
      this.recentComments = commentsData.recent_comments;
    }
    catch (err) {
      console.error(err);
    }
    this.loaded('comments');
  }
}

const statsStore = new Stats();
export default statsStore;
