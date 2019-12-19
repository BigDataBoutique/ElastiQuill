import { toast } from "react-toastify";
import { action, observable } from "mobx";
import BaseStore from "./BaseStore";
import * as api from "../api";

class Setup extends BaseStore {
  @observable
  status = null;

  @action
  async loadStatus() {
    try {
      this.loading("status");
      const { status } = await api.loadSetupStatus();
      this.status = status;
    } catch (err) {
      this.status = null;
      console.log(err);
    } finally {
      this.loaded("status");
    }
  }

  @action
  async setupElasticsearch() {
    try {
      this.loading("setup");
      await api.setupElasticsearch();
      await this.loadStatus();

      if (this.status === "ready") {
        window.location.href = "#dashboard";
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      this.loaded("setup");
    }
  }
}

const setupStore = new Setup();
export default setupStore;
