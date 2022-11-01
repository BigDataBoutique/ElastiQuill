import _ from "lodash";
import React, { Fragment } from "react";
import moment from "moment";
import countries from "i18n-iso-countries";
import { inject, observer } from "mobx-react";
import { Link } from "react-router-dom";

countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

import CommentsList from "../components/CommentsList";
import LoggedInLayout from "../components/LoggedInLayout";
import {
  StatsOverTimeGraph,
  VisitsMap,
  VisitsByCountry,
  ReferralsStats,
  UserAgentStats,
} from "../components/Stats";
import { formatNumbers } from "../util";

@inject("dashboardStore")
@observer
class Dashboard extends React.Component {
  componentDidMount() {
    this.props.dashboardStore.loadStats();
  }

  render() {
    return (
      <LoggedInLayout pageTitle="Dashboard">
        <div className="elastiquill-content">{this._renderContent()}</div>
      </LoggedInLayout>
    );
  }

  _renderContent() {
    const {
      postsCount,
      beingLoaded,
      popularPosts,
      commentsCount,
      mostViewedPost,
      recentComments,
      mostBusyDayEver,
      visitsByCountry,
      visitsByLocation,
      mostCommentedPosts,
      averageVisitsPerDay,
      averageVisitorsPerDay,
      uniqueVisitorsEnabled,
      userAgentOperatingSystem,
      userAgentName,
      referrerType,
      referrerFromDomain,
    } = this.props.dashboardStore;

    if (beingLoaded.length) {
      return "Loading...";
    }

    const visitorsStr = uniqueVisitorsEnabled ? "visitors" : "visit";

    const mostBusyDayEverCard =
      mostBusyDayEver &&
      this._renderCard(
        <React.Fragment>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <h1 style={{ fontSize: "29px" }}>
              {moment(mostBusyDayEver.date).format("DD/MM/YYYY")}
            </h1>
            <h6>
              {formatNumbers(
                uniqueVisitorsEnabled
                  ? mostBusyDayEver.visitors.value
                  : mostBusyDayEver.count
              ) +
                " " +
                visitorsStr}
            </h6>
          </div>
          <h2>Busiest day ever</h2>
        </React.Fragment>
      );

    const mostViewedCard =
      mostViewedPost &&
      mostViewedPost.title &&
      this._renderCard(
        <React.Fragment>
          <h4 style={{ flex: 1 }}>
            <Link
              to={`/stats/post/${mostViewedPost.id}`}
              style={{ fontSize: "24px" }}
            >
              {this._textEllipsis(mostViewedPost.title, 35)}
            </Link>
          </h4>
          <h6>
            {(uniqueVisitorsEnabled
              ? mostViewedPost.visitors_count
              : mostViewedPost.views_count) + " views"}
          </h6>
          <h2>Most viewed post</h2>
        </React.Fragment>
      );

    const onToggleUniqueVisitors = () =>
      this.props.dashboardStore.toggleUniqueVisitors();
    const averagePerDay = uniqueVisitorsEnabled
      ? averageVisitorsPerDay
      : averageVisitsPerDay;

    const countUnitPair = (count, unit) => (
      <span>
        ({count} {unit}
        {count > 1 ? "s" : ""})
      </span>
    );

    return (
      <Fragment>
        <div className="elastiquill-header">Overview {typeof postsCount}</div>
        <div
          className="row"
          style={{ minHeight: "124px", marginBottom: "63px", marginLeft: -5 }}
        >
          {this._renderTextCard(
            "Total blog posts",
            formatNumbers(postsCount) || 0
          )}
          {this._renderTextCard(
            "Comments on posts",
            formatNumbers(commentsCount) || 0
          )}
          {this._renderTextCard(
            `${_.capitalize(visitorsStr)} / day (average)`,
            formatNumbers(_.round(averagePerDay, 1)) || 0
          )}
          {mostBusyDayEverCard}
          {mostViewedCard}
        </div>

        <div className="row" style={{ marginBottom: "41px" }}>
          <div className="col-12">
            <div className="elastiquill-header d-flex w-100">
              Blog Statistics
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
              <StatsOverTimeGraph uniqueVisitors={uniqueVisitorsEnabled} />
            </div>
          </div>
        </div>

        <div className="row" style={{ marginBottom: "41px" }}>
          <div className="col-lg-8">
            <div className="elastiquill-header">Visitors Map</div>
            <div className="elastiquill-card">
              <VisitsMap mapData={visitsByLocation} />
            </div>
          </div>
          <div className="col-lg-4">
            <div className="elastiquill-header">Visits by country</div>
            <div className="elastiquill-card">
              <VisitsByCountry data={visitsByCountry} />
            </div>
          </div>
        </div>

        <div className="row">
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
        <div className="row" style={{ marginTop: 20 }}>
          <div className="col-md-6">
            {this._renderSection(
              "Most viewed",
              this._renderPostsList(popularPosts, item => {
                return countUnitPair(
                  uniqueVisitorsEnabled
                    ? item.unique_visits_count
                    : item.visits_count,
                  "view"
                );
              })
            )}
            {this._renderSection(
              "Most commented",
              this._renderPostsList(mostCommentedPosts, item => {
                return countUnitPair(item.comments_count, "comment");
              })
            )}
          </div>
          <div className="col-md-6">
            {this._renderSection(
              "Recent comments",
              <CommentsList comments={recentComments} />
            )}
          </div>
        </div>
      </Fragment>
    );
  }

  _renderStatsList(title, list) {
    return (
      <div style={{ minHeight: 160 }}>
        <strong>{title}</strong>
        <div style={{ marginTop: 10 }}>
          {list.map(item => (
            <div key={item.key}>
              {item.key}
              <span className="float-right text-muted">{item.doc_count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  _renderPostsList(list, label) {
    if (!list.length) {
      return "No data";
    }

    return (
      <div>
        {list.map(item => (
          <div key={item.id}>
            <Link to={`/stats/post/${item.id}`}>{item.title}</Link>{" "}
            {label(item)}
          </div>
        ))}
      </div>
    );
  }

  _renderSection(title, content) {
    return (
      <div style={{ marginBottom: 10 }}>
        <div className="elastiquill-header">{title}</div>
        <div className="elastiquill-card">{content}</div>
      </div>
    );
  }

  _renderTextCard(label, text) {
    return this._renderCard(
      <React.Fragment>
        <h1 style={{ flex: 1 }}>{text}</h1>
        <h2>{label}</h2>
      </React.Fragment>
    );
  }

  _renderCard(contents) {
    const minHeight = 120;
    return (
      <div className="col-lg align-items-stretch">
        <div
          className="elastiquill-card d-flex flex-column h-100"
          style={{
            minHeight,
          }}
        >
          {contents}
        </div>
      </div>
    );
  }

  _textEllipsis(text, len) {
    if (!text) {
      return false;
    }

    if (text.length - 3 > len) {
      text = text.substring(0, len - 3) + "...";
    }
    return text;
  }
}

export default Dashboard;
