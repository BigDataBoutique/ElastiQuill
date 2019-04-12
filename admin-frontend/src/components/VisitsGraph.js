import React from 'react';
import moment from 'moment';
import {
  FlexibleXYPlot,
  XYPlot,
  XAxis,
  YAxis,
  Hint,
  VerticalGridLines,
  HorizontalGridLines,
  VerticalRectSeries
} from 'react-vis';

import 'react-vis/dist/style.css';

const ONE_DAY = 24 * 60 * 60 * 1000;

class VisitsGraph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hoveredValue: null
    };
  }

  render() {
    const data = this.props.histogramData.map(item => ({
      x0: item.key,
      x: item.key + ONE_DAY,
      y: item.doc_count
    }));

    if (! data.length) {
      return (
        <div style={{ marginBottom: 10 }}>
          No visits data.
        </div>
      )
    }

    const xDomainStart = Math.min(_.first(data).x0, _.last(data).x - ONE_DAY * 7);
    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

    for (let i = _.last(data).x0 + ONE_DAY; i < today.getTime(); i += ONE_DAY) {
      data.push({
        x0: i,
        x: i + ONE_DAY,
        y: 0
      });
    }

    return (
      <FlexibleXYPlot
        xType='time'
        xDomain={[ xDomainStart, _.last(data).x ]}
        height={300}
        onMouseLeave={() => this.setState({ hoveredValue: null })}
      >
        <VerticalGridLines />
        <HorizontalGridLines />
        <XAxis
          tickTotal={Math.min(10, Math.ceil((_.last(data).x - xDomainStart) / ONE_DAY ))}
          tickFormat={x => moment(x).format('DD-MM-YYYY')} />
        <YAxis />
        {this.state.hoveredValue && <Hint
          format={value => {
            return [
              {
                title: 'Date',
                value: moment(value.x0).format('DD-MM-YYYY')
              }, {
                title: 'Visits',
                value: value.y
              }
            ]
          }}
          value={this.state.hoveredValue} />}
        <VerticalRectSeries
          onNearestX={hoveredValue => this.setState({ hoveredValue })}
          data={data} style={{ stroke: '#fff' }} />
      </FlexibleXYPlot>
    )
  }
}

export default VisitsGraph;
