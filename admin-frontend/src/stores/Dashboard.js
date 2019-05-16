import { observable } from 'mobx';
import BaseStore from "./BaseStore";
import * as api from '../api';

class Dashboard extends BaseStore {

  @observable
  visitsByLocation = [];

  @observable
  popularPosts = [];

  @observable
  recentComments = [];

  @observable
  commentsCount = null;

  @observable
  postsCount = null;

  @observable
  mostCommentedPosts = [];

  @observable
  referrerType = [];

  @observable
  referrerFromDomain = [];

  async loadStats() {
    this.loading('stats');

    try {
      const commentsData = await api.loadCommentsStats();
      this.commentsCount = commentsData.comments_count;
      this.recentComments = commentsData.recent_comments;
      this.mostCommentedPosts = commentsData.most_commented_posts;

      const allStats = await api.loadAllStats();
      this.visitsByLocation = allStats.visits_by_location;
      this.popularPosts = allStats.popular_posts;
      this.referrerType = allStats.referrer_type;
      this.referrerFromDomain = allStats.referrer_from_domain;
      this.postsCount = allStats.posts_count;
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.loaded('stats');    
    }
  }
}

const dashboardStore = new Dashboard();
export default dashboardStore;
