import {action, computed, observable} from 'mobx';
import md5 from 'md5';
import localforage from 'localforage';
import {jsonFetch} from '../util';
import BaseStore from "./BaseStore";
import * as api from '../api';

class Dashboard extends BaseStore {

  @observable
  visitsHistogramData = [];

  @observable
  visitsByLocation = [];

  @observable
  popularPosts = [];

  @observable
  recentComments = [];

  @observable
  mostCommentedPosts = [];

  @observable
  referrerType = [];

  @observable
  referrerFromDomain = [];

  async loadCommentsData() {
    try {
      this.loading('comments');
      const commentsData = await api.loadCommentsStats();
      this.recentComments = commentsData.recent_comments;
      this.mostCommentedPosts = commentsData.most_commented_posts;
    }
    catch (err) {
      console.error(err);
    }
    this.loaded('comments');
  }

  async loadVisitsData() {
    try {
      this.loading('visits');
      const visitsData = await api.loadVisitsStats();
      this.visitsHistogramData = visitsData.visits_by_date;
      this.visitsByLocation = visitsData.visits_by_location;
      this.popularPosts = visitsData.popular_posts;
      this.referrerType = visitsData.referrer_type;
      this.referrerFromDomain = visitsData.referrer_from_domain;
    }
    catch (err) {
      console.error(err);
    }
    this.loaded('visits');
  }
}

const dashboardStore = new Dashboard();
export default dashboardStore;
