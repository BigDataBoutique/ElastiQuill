import React, { Component, Fragment } from 'react';
import { inject, observer } from 'mobx-react';
import { Layout } from '../components/Layout';
import { Redirect, withRouter } from 'react-router-dom';
import LoggedInLayout from '../components/LoggedInLayout';
import StatsOverTimeGraph from '../components/StatsOverTimeGraph';
import CommentsList from '../components/CommentsList';
import urls from '../config/urls';

@inject('statsStore')
@withRouter
@observer
class ItemStatsPage extends Component {
  constructor(props) {
    super(props);
    const { id, type } = props.match.params;
    props.statsStore.loadStats(type, id);
    props.statsStore.loadRecentComments(id);
  }

  render() {
    const {
      item,
      recentComments,
      visitsByLocation,
      visitsHistogramData
    } = this.props.statsStore;

    const breadcrumbs = [{
      label: this._getType() === 'post' ? 'Posts' : 'Content Pages',
      url: this._getType() === 'post' ? '/posts' : '/pages'
    }];

    return (
      <LoggedInLayout pageTitle={item ? `Stats for '${item.title}'` : 'Loading...'} breadcrumbs={breadcrumbs}>
        <div className='elastiquill-content'>
          <div className='row'>
            <div className='col-12'>
              <div className='elastiquill-card'>
                <StatsOverTimeGraph
                  key={item ? item.id : null}
                  item={item} />
              </div>
            </div>
          </div>
          {this._getType() === 'post' && (
            <Fragment>
              <div className='elastiquill-header'>Comments</div>
              <div className='row'>
                <div className='col-12'>
                  <div className='elastiquill-card'>
                    <CommentsList comments={recentComments} />
                  </div>
                </div>
              </div>
            </Fragment>
          )}
        </div>
      </LoggedInLayout>
    )
  }

  _getType() {
    return this.props.match.params.type;
  }
}

export default ItemStatsPage;
