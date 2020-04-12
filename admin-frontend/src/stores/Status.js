import { toast } from "react-toastify";
import { action, observable, computed } from "mobx";
import BaseStore from "./BaseStore";
import * as api from "../api";

class Status extends BaseStore {
  @observable
  status = null;

  setupStatus = null;

  @action
  async loadStatus() {
    try {
      this.loading("status");
      this.status = await api.loadStatus();
    } catch (err) {
      this.status = null;
      console.log(err); // TODO proper error logging
    } finally {
      this.loaded("status");
    }
  }

  @action
  async loadSetupStatus() {
    try {
      this.loading("setup status");
      const { status } = await api.loadSetupStatus();
      this.setupStatus = status;
    } catch (err) {
      this.setupStatus = null;
      console.log(err); // TODO proper error logging
    } finally {
      this.loaded("setup status");
    }
  }

  @action
  async setupElasticsearch() {
    try {
      this.loading("setup");
      await api.setupElasticsearch();
      await this.loadSetupStatus();

      if (this.setupStatus === "ready") {
        window.location.href = "#dashboard";
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      this.loaded("setup");
    }
  }

  /**
   * returns "red" when configuration has errors
   * "yellow" when configuration has warnings
   * "green" when everything is up and ready
   */
  @computed
  get statusHealth() {
    if (!this.status) {
      return "green";
    }

    const setupError = this.setupStatus && this.setupStatus !== "ready";
    const clusterHealthError =
      this.status.elasticsearch.cluster_health === "red";
    const logLevelError = !!this.status.elasticsearch.log_level.error;
    const uploadError = !!this.status.upload.errors[this.status.upload.backend];
    const themeError = !!this.status.theme.error;
    if (
      setupError ||
      clusterHealthError ||
      logLevelError ||
      uploadError ||
      themeError
    ) {
      return "red";
    } else if (
      this.status.elasticsearch.cluster_health === "yellow" ||
      !!this.status.elasticsearch.log_level.warn
    ) {
      return "yellow";
    } else {
      return "green";
    }
  }
}

const statusStore = new Status();
export default statusStore;
