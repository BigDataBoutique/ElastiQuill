import React, { Component, Fragment } from "react";
import { inject, observer } from "mobx-react";
import { withRouter } from "react-router-dom";
import LoggedInLayout from "../components/LoggedInLayout";
import StatsOverTimeGraph from "../components/StatsOverTimeGraph";
import CommentsList from "../components/CommentsList";

@inject("statsStore")
@withRouter
@observer
class ItemStatsPage extends Component {
  constructor(props) {
    super(props);
    this._loadData();
  }

  render() {
    const { item, comments, isLoading } = this.props.statsStore;
    const { type } = this.props.match.params;

    const breadcrumbs = [
      {
        label: type === "post" ? "Posts" : "Content Pages",
        url: type === "post" ? "/posts" : "/pages",
      },
    ];

    return (
      <LoggedInLayout
        pageTitle={item ? `Stats for '${item.title}'` : "Loading..."}
        breadcrumbs={breadcrumbs}
      >
        <div className="elastiquill-content">
          <div className="row">
            <div className="col-12">
              <div className="elastiquill-card">
                <StatsOverTimeGraph key={item ? item.id : null} item={item} />
              </div>
            </div>
          </div>
          {type === "post" && (
            <Fragment>
              <div className="elastiquill-header">Comments</div>
              <div className="row">
                <div className="col-12">
                  <div className="elastiquill-card">
                    {isLoading ? (
                      "Loading..."
                    ) : (
                      <CommentsList
                        treeView
                        showButtons
                        hidePostLink
                        requestReload={this._loadData.bind(this)}
                        comments={comments || []}
                      />
                    )}
                  </div>
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </LoggedInLayout>
    );
  }

  _loadData() {
    const { id, type } = this.props.match.params;
    this.props.statsStore.loadData(type, id);
  }
}

export default ItemStatsPage;
