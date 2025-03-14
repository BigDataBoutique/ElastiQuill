import _ from "lodash";
import React from "react";
import moment from "moment";
import {
  XYPlot,
  XAxis,
  YAxis,
  Borders,
  VerticalGridLines,
  HorizontalGridLines,
  LineSeries,
  MarkSeries,
  DiscreteColorLegend,
  Crosshair,
} from "react-vis";
import "react-vis/dist/style.css";

import * as api from "../../api";

const VISITS_COLOR = "#40c4ff";
const VIEWS_COLOR = "#00e676";
const POSTS_COLOR = "#d9156d";
const ONE_DAY = 24 * 60 * 60 * 1000;

class StatsOverTimeGraph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      dateRange: "weeks",
      visitsHistogram: null,
      commentsHistogram: null,
      postsHistogram: null,
      crosshair: null,
    };
  }

  componentDidMount() {
    this._loadStats();
  }

  render() {
    const onChange = ev =>
      this.setState(
        {
          dateRange: ev.target.value,
        },
        this._loadStats.bind(this)
      );

    const legendItems = [
      { title: "All visits", strokeWidth: 4, color: VISITS_COLOR },
    ];

    if (!this.props.item) {
      legendItems.push({
        title: "Post views",
        strokeWidth: 4,
        color: VIEWS_COLOR,
      });
      legendItems.push({ title: "Posts", strokeWidth: 4, color: POSTS_COLOR });
    }

    return (
      <div className="row" style={{ paddingTop: 35 }}>
        <div className="col-md-10" style={{ marginTop: -8 }}>
          {this._renderChart()}
        </div>
        <div className="col-md-2">
          <select
            style={{ marginBottom: 34 }}
            className="elastiquill-select"
            value={this.state.dateRange}
            onChange={onChange}
          >
            <option value="weeks">Last week</option>
            <option value="months">Last month</option>
            <option value="years">Last year</option>
          </select>
          <DiscreteColorLegend items={legendItems} />
        </div>
      </div>
    );
  }

  _renderChart() {
    const { commentsHistogram, postsHistogram } = this.state;
    let { visitsHistogram, viewsHistogram } = this.state;

    if (this.props.uniqueVisitors) {
      visitsHistogram = this._extractVisitorsHistogram(visitsHistogram);
      viewsHistogram = this._extractVisitorsHistogram(viewsHistogram);
    }

    const dummyData = this._generateDummySeriesData();
    const xDomainEnd = _.last(dummyData).x.getTime();
    const xDomainStart = _.first(dummyData).x.getTime();

    const visitsData = this._prepareHistogram(visitsHistogram, dummyData);
    const viewsData = this._prepareHistogram(
      viewsHistogram,
      dummyData,
      item => ({
        top_posts: item.top_posts
          ? item.top_posts.buckets
              .map(bucket => ({
                postSlug: bucket.key,
                views: bucket.doc_count,
              }))
              .slice()
              .sort((a, b) => b.views - a.views)
          : [],
      })
    );
    const commentsData = this._prepareHistogram(commentsHistogram);
    const postsData = this._prepareHistogram(
      postsHistogram && postsHistogram.filter(item => item.doc_count)
    );

    const { interval } = this._getInterval();

    const onNearestX = (value, { index }) => {
      if (this.state.crosshair && this.state.crosshair.index === index) {
        return;
      }

      const values = [];

      values.push(dummyData[index]);
      values.push(_.find(visitsData, ["x", value.x]) || { y: 0 });
      values.push(_.find(viewsData, ["x", value.x]) || { y: 0 });
      values.push(_.find(commentsData, ["x", value.x]) || { y: 0 });
      values.push(_.find(postsData, ["x", value.x]) || { y: 0 });

      this.setState({
        crosshair: {
          index,
          values,
        },
      });
    };

    let yDomainEnd = 0;
    [visitsData, viewsData, postsData].forEach(data => {
      yDomainEnd = this._getMaxValue(data, yDomainEnd);
    });

    const containerWidth =
      document.getElementById("chart-container")?.offsetWidth || 800;

    return (
      <div id="chart-container" style={{ width: "100%", height: "300px" }}>
        <XYPlot
          width={containerWidth}
          height={300}
          xType="time"
          yBaseValue={0}
          xDomain={[xDomainStart, xDomainEnd]}
          yDomain={[0, yDomainEnd || 10]}
          onMouseLeave={() => this.setState({ crosshair: null })}
        >
          <VerticalGridLines />
          <HorizontalGridLines />
          <MarkSeries
            onNearestX={onNearestX}
            color="transparent"
            data={dummyData}
          />
          <LineSeries
            strokeWidth="4px"
            color={VISITS_COLOR}
            data={visitsData}
          />
          {!this.props.item && (
            <LineSeries
              strokeWidth="4px"
              color={VIEWS_COLOR}
              data={viewsData}
            />
          )}
          <Borders
            style={{
              bottom: { fill: "#fff" },
              left: { fill: "#fff" },
              right: { fill: "#fff" },
              top: { fill: "#fff" },
            }}
          />
          <XAxis
            tickTotal={Math.min(
              7,
              Math.ceil((xDomainEnd - xDomainStart) / interval)
            )}
            tickFormat={x => moment(x).format("DD-MM-YYYY")}
          />
          <YAxis />
          {!this.props.item && (
            <MarkSeries
              color={POSTS_COLOR}
              // we set every post data point on 0 because we only want this series
              // to mark days where new posts are published, actual post counts should be shown on tooltips
              data={postsData.map(item => ({ ...item, y: 0 }))}
            />
          )}
          {this._renderCrosshair()}
        </XYPlot>
      </div>
    );
  }

  _renderCrosshair() {
    if (!this.state.crosshair) {
      return false;
    }
    const crosshairValues = this.state.crosshair.values;

    return (
      <Crosshair values={crosshairValues}>
        <div
          className="rv-crosshair__inner"
          style={{ minWidth: "200px", zIndex: 99999 }}
        >
          <div className="rv-crosshair__inner__content">
            <div>
              <div className="rv-crosshair__title">
                {moment(crosshairValues[0].x).format("DD-MM-YYYY")}
              </div>
              <div
                className="rv-crosshair__item"
                style={{ color: VISITS_COLOR }}
              >
                Visits: {crosshairValues[1].y}
              </div>
              {!this.props.item && (
                <>
                  <div
                    className="rv-crosshair__item"
                    style={{ color: VIEWS_COLOR }}
                  >
                    Post views: {crosshairValues[2].y}
                  </div>
                  {!!crosshairValues[2].top_posts && (
                    <div style={{ paddingLeft: "6px" }}>
                      {crosshairValues[2].top_posts.map(post => (
                        <div key={post.postSlug}>
                          {post.postSlug}: {post.views}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {crosshairValues[3].y > 0 && (
                <div className="rv-crosshair__item">
                  Comments: {crosshairValues[3].y}
                </div>
              )}
              {!this.props.item && crosshairValues[4].y > 0 && (
                <div className="rv-crosshair__item">
                  Posts: {crosshairValues[4].y}
                </div>
              )}
            </div>
          </div>
        </div>
      </Crosshair>
    );
  }

  _generateDummySeriesData() {
    const today = this._normalizeDate(new Date());
    const startDate = this._normalizeDate(this._getStartDate());
    const { name } = this._getInterval();
    const data = [];

    if (name === "1d") {
      for (
        let i = startDate.getTime() + ONE_DAY;
        i <= today.getTime();
        i += ONE_DAY
      ) {
        data.push({ x: this._normalizeDate(new Date(i)), y: 0 });
      }
    } else {
      startDate.setDate(1);
      today.setDate(1);
      let date = moment(startDate);
      while (date.toDate().getTime() < today.getTime()) {
        date.add(1, "months");
        data.push({ x: this._normalizeDate(date.toDate()), y: 0 });
      }
    }

    return data;
  }

  _prepareHistogram(histogram, zeroData, normalizeAdditionalData) {
    if (!histogram) {
      return [];
    }

    let data = histogram.map(item => ({
      x: this._normalizeDate(new Date(item.key)),
      y: item.doc_count,
      ...(normalizeAdditionalData ? normalizeAdditionalData(item) : {}),
    }));
    if (zeroData) {
      zeroData.forEach(item => {
        if (!data.find(i => i.x.valueOf() == item.x.valueOf())) {
          data.push(item);
        }
      });
    }
    data = _.sortBy(data, "x");

    if (data.length && zeroData) {
      const { interval } = this._getInterval();
      const zeroItem = {
        x: new Date(_.first(data).x.getTime() - interval),
        y: 0,
      };
      data = [zeroItem].concat(data);
    }

    return data;
  }

  _extractVisitorsHistogram(histogram) {
    if (!histogram) {
      return [];
    }

    return histogram.map(it => ({
      ...it,
      doc_count: it.visitors.value,
    }));
  }

  _normalizeDate(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  }

  _getStartDate() {
    return moment()
      .subtract(1, this.state.dateRange)
      .toDate();
  }

  _getInterval() {
    const { dateRange } = this.state;

    let name = "1d";
    let interval = ONE_DAY;

    if (dateRange === "years") {
      interval *= 30;
      name = "1M";
    }
    return { name, interval };
  }

  _getMaxValue(data, max) {
    const newMax = data.reduce((acc, row) => Math.max(acc, row.y), max);

    return newMax;
  }

  async _loadStats() {
    let results = null;

    const startDate = this._getStartDate();

    try {
      const { item } = this.props;
      const { name: intervalName } = this._getInterval();

      if (item) {
        results = await api.loadItemStats(
          item.type,
          item.id,
          startDate,
          intervalName
        );
      } else {
        results = await api.loadAllStats(startDate, intervalName);
      }
    } catch (err) {
      console.log(err); // TODO proper error logging
    } finally {
      if (results) {
        this.setState({
          viewsHistogram: results.views_by_date,
          visitsHistogram: results.visits_by_date,
          commentsHistogram: results.comments_by_date,
          postsHistogram: results.posts_by_date,
        });
      }
    }
  }
}

export default StatsOverTimeGraph;
