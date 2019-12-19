import React from "react";
import { inject, observer } from "mobx-react";

@inject("setupStore")
@observer
export default class SetupWarning extends React.Component {
  componentDidMount() {
    this.props.setupStore.loadStatus();
  }

  render() {
    if (
      !this.props.setupStore.status ||
      this.props.setupStore.status === "ready"
    ) {
      return false;
    }

    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-warning">
            Elasticsearch is not configured properly. Go to{" "}
            <a href="#/setup">/setup</a> page to complete setup.
          </div>
        </div>
      </div>
    );
  }
}
