import React, { Component, Fragment } from "react";
import { inject, observer } from "mobx-react";
import { Link, withRouter } from "react-router-dom";
import _ from "lodash";
import classnames from "classnames";
import LoggedInLayout from "../components/LoggedInLayout";
import CommentsList from "../components/CommentsList";
import FAIcon from "../components/FAIcon";
import {
  StatsOverTimeGraph,
  VisitsMap,
  VisitsByCountry,
  ReferralsStats,
  UserAgentStats,
} from "../components/Stats";
import HoverIcon from "../components/Icons/HoverIcon";
import SvgEdit from "../components/Icons/SvgEdit";
import SvgNewWindow from "../components/Icons/SvgNewWindow";

@inject("statsStore")
@withRouter
@observer
class ItemStatsPage extends Component {
  constructor(props) {
    super(props);
    this._loadData();

    this.state = {
      showStats: true,
    };
  }

  _renderLinks = item => {
    if (!item) return null;

    const url = `${item.url}${
      _.isEmpty(item.metadata.private_viewing_key)
        ? ""
        : "?secret=" + item.metadata.private_viewing_key
    }`;

    return (
      <div style={{ display: "flex", marginRight: "10px" }}>
        <div className="elastiquill-icon-button">
          <Link
            to={`/edit/post/${item ? item.id : ""}`}
            className="btn btn-link"
          >
            <HoverIcon icon={SvgEdit} />
          </Link>
        </div>
        <div className="elastiquill-icon-button">
          <a className="btn btn-link" href={url} target="_blank">
            <HoverIcon icon={SvgNewWindow} />
          </a>
        </div>
      </div>
    );
  };

  render() {
    const { item, comments, isLoading } = this.props.statsStore;
    const { type } = this.props.match.params;

    const breadcrumbs = [
      {
        label: type === "post" ? "Posts" : "Content Pages",
        url: type === "post" ? "/posts" : "/pages",
      },
    ];

    const toggleStats = () => {
      this.setState(prevState => ({ showStats: !prevState.showStats }));
    };

    return (
      <LoggedInLayout
        pageTitle={item ? `Stats for '${item.title}'` : "Loading..."}
        breadcrumbs={breadcrumbs}
      >
        <div className="elastiquill-content">
          <div className="d-flex justify-content-end">
            {this._renderLinks(item)}
            <button
              type="button"
              className="btn btn-link"
              onClick={toggleStats}
              style={{ color: "black", paddingRight: 0 }}
            >
              Collapse stats
              <FAIcon
                icon={this.state.showStats ? "angle-down" : "angle-up"}
                className="ml-2"
              />
            </button>
          </div>
          <div
            className={classnames(
              "elastiquill-post-stats-container",
              !this.state.showStats && "hidden"
            )}
          >
            {this._renderStats()}
          </div>
          {type === "post" && (
            <Fragment>
              <div className="elastiquill-header">Comments</div>
              <div className="row mb-4">
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

  _renderStats() {
    const {
      beingLoaded,
      item,
      visitsByLocation,
      visitsByCountry,
      referrerType,
      referrerFromDomain,
      userAgentOperatingSystem,
      userAgentName,
      uniqueVisitorsEnabled,
    } = this.props.statsStore;

    if (beingLoaded.length) {
      return "Loading...";
    }

    const onToggleUniqueVisitors = () =>
      this.props.statsStore.toggleUniqueVisitors();

    return (
      <>
        <div className="row mb-4">
          <div className="col-12">
            <div className="elastiquill-header d-flex w-100">
              {item.type === "post" ? "Post" : "Page"} statistics
              <div style={{ flex: 1, textAlign: "right", userSelect: "none" }}>
                <div>
                  <input
                    readOnly
                    checked={uniqueVisitorsEnabled}
                    type="checkbox"
                    onClick={onToggleUniqueVisitors}
                  />
                  <label
                    onClick={onToggleUniqueVisitors}
                    style={{ cursor: "pointer", marginLeft: 10 }}
                  >
                    Unique visitors
                  </label>
                </div>
              </div>
            </div>
            <div className="elastiquill-card">
              <StatsOverTimeGraph
                key={item ? item.id : null}
                item={item}
                uniqueVisitors={uniqueVisitorsEnabled}
              />
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-lg-8">
            <div className="elastiquill-header">Visitors Map</div>
            <div className="elastiquill-card">
              <VisitsMap mapData={visitsByLocation} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="elastiquill-header">Visitors by country</div>
            <div className="elastiquill-card">
              <VisitsByCountry data={visitsByCountry} />
            </div>
          </div>
        </div>
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="elastiquill-header">Referrals stats</div>
            <div className="elastiquill-card">
              <ReferralsStats
                referrerDomain={referrerFromDomain}
                referrerType={referrerType}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="elastiquill-header">User-Agent stats</div>
            <div className="elastiquill-card">
              <UserAgentStats
                userAgentName={userAgentName}
                userAgentOperatingSystem={userAgentOperatingSystem}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  _loadData() {
    const { id, type } = this.props.match.params;
    this.props.statsStore.loadData(type, id);
    this.props.statsStore.loadStats(type, id);
  }
}

export default ItemStatsPage;
