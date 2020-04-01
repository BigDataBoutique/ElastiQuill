import React, { Component } from "react";
import { inject, observer } from "mobx-react";

import LoggedInLayout from "../components/LoggedInLayout";

@inject("statusStore")
@observer
class Setup extends Component {
  componentDidMount() {
    this.props.statusStore.loadSetupStatus();
  }

  render() {
    return (
      <LoggedInLayout pageTitle="Elasticsearch setup">
        <div className="elastiquill-content">
          <div className="row">
            <div className="col-12">{this._renderContent()}</div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderContent() {
    if (this.props.statusStore.isLoading) {
      return "Loading...";
    }

    if (this.props.statusStore.setupStatus === "ready") {
      return (
        <div className="alert alert-success">
          Elasticsearch setup is completed.
        </div>
      );
    }

    const isLoadingSetup =
      this.props.statusStore.beingLoaded.indexOf("setup") > -1;

    return (
      <div>
        <div
          onClick={() => this.props.statusStore.setupElasticsearch()}
          disabled={isLoadingSetup}
          className="btn btn-primary btn-lg"
        >
          {isLoadingSetup ? "Loading..." : "Complete setup"}
        </div>
      </div>
    );
  }
}

export default Setup;
