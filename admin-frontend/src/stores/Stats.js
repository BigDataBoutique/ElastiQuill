import { action, observable } from "mobx";
import BaseStore from "./BaseStore";
import * as api from "../api";

class Stats extends BaseStore {
  @observable
  item = null;

  @observable
  comments = null;

  @observable
  uniqueVisitorsEnabled = false;

  @observable
  visitsByLocation = [];

  @observable
  visitsByCountry = [];

  @observable
  referrerType = [];

  @observable
  referrerFromDomain = [];

  @observable
  userAgentOperatingSystem = [];

  @observable
  userAgentName = [];

  @action
  async loadData(itemType, id) {
    this.loading("data");
    try {
      if (itemType === "post") {
        this.item = await api.loadPostById(id);
        this.comments = await api.loadComments(id);
      } else {
        this.item = await api.loadContentPageById(id);
      }
    } catch (err) {
      console.log(err); // TODO proper error logging
    } finally {
      this.loaded("data");
    }
  }

  @action
  async loadStats(itemType, id) {
    this.loading("stats");
    try {
      const stats = await api.loadItemStats(itemType, id);
      this.visitsByLocation = stats.visits_by_location;
      this.visitsByCountry = stats.visits_by_country;
      this.referrerType = stats.referrer_type;
      this.referrerFromDomain = stats.referrer_from_domain;
      this.userAgentOperatingSystem = stats.user_agent_os;
      this.userAgentName = stats.user_agent_name;
    } catch (err) {
      console.log(err);
    } finally {
      this.loaded("stats");
    }
  }

  @action
  toggleUniqueVisitors() {
    this.uniqueVisitorsEnabled = !this.uniqueVisitorsEnabled;
  }
}

const statsStore = new Stats();
export default statsStore;
