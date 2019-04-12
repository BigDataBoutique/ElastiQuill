import React, {Component} from 'react';
import {inject, observer} from "mobx-react";
import {Layout} from "../components/Layout";
import {Redirect, withRouter} from "react-router-dom";
import LoggedInLayout from '../components/LoggedInLayout';
import VisitsGraph from '../components/VisitsGraph';
import CommentsList from '../components/CommentsList';
import urls from "../config/urls";

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
      <LoggedInLayout pageTitle={item ? `Stats for "${item.title}"` : 'Loading...'} breadcrumbs={breadcrumbs}>
        <div className='content'>
          <div className='row'>
            <div className='col-12 col-md-6'>
              <div className='card'>
                <div className='card-header'>
                  <strong className='card-title'>Visits</strong>
                </div>
                <div className='card-body'>
                  <VisitsGraph
                    histogramData={visitsHistogramData}
                    mapData={visitsByLocation} />
                </div>
              </div>
            </div>
            {this._getType() === 'post' && (
              <div className='col-12 col-md-6'>
                <div className='card'>
                  <div className='card-header'>
                    <strong className='card-title'>Recent comments</strong>
                  </div>
                  <div className='card-body'>
                    <CommentsList comments={recentComments} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </LoggedInLayout>
    )
  }

  _getType() {
    return this.props.match.params.type;
  }
}

export default ItemStatsPage;
