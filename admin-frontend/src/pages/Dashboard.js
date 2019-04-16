import React from 'react';
import {action, computed, observable} from 'mobx';
import {inject, observer} from 'mobx-react';

import VisitsMap from '../components/VisitsMap';
import VisitsGraph from '../components/VisitsGraph';
import SetupWarning from '../components/SetupWarning';
import CommentsList from '../components/CommentsList';
import LoggedInLayout from '../components/LoggedInLayout';

@inject('dashboardStore')
@observer
class Dashboard extends React.Component {
  componentDidMount() {
    this.props.dashboardStore.loadVisitsData();
    this.props.dashboardStore.loadCommentsData();
  }

  render() {
    const {
      popularPosts,
      recentComments,
      visitsByLocation,
      mostCommentedPosts,
      visitsHistogramData
    } = this.props.dashboardStore;

    return (
      <LoggedInLayout>
        <div className='content'>
          <SetupWarning />
          <div className='row'>
            <div className='col-12'>
              {this._renderCard('Visits', (
                <VisitsGraph histogramData={visitsHistogramData} />
              ))}
            </div>
          </div>
          <div className='row'>
            <div className='col-12 col-md-6'>
              {this._renderCard('Visits Map', (
                <VisitsMap mapData={visitsByLocation} />
              ))}
              {this._renderCard('Referrals Stats', this._renderReferrals())}
            </div>
            <div className='col-12 col-md-6'>
              {this._renderCard('Most viewed', this._renderPostsList(popularPosts, item => {
                return <span>({item.visits_count} {item.visits_count > 1 ? 'views' : 'view'})</span>
              }))}
              {this._renderCard('Most commented', this._renderPostsList(mostCommentedPosts, item => {
                return <span>({item.comments_count} {item.comments_count > 1 ? 'comments' : 'comment'})</span>
              }))}
              {this._renderCard('Recent comments', (
                <CommentsList comments={recentComments} />
              ))}
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderReferrals() {
    const {
      referrerType,
      referrerFromDomain
    } = this.props.dashboardStore;

    if (! referrerFromDomain.length) {
      return 'No data';
    }

    return (
      <div>
        <h4>Type</h4>
        <ul style={{ marginTop: 15 }}>
        {referrerType.map(bucket => (
          <li key={bucket.key} className='list-group-item py-1'>{bucket.key} ({bucket.doc_count})</li>
        ))}
        </ul>
        <h4>Domain</h4>
        <ul style={{ marginTop: 15 }}>
        {referrerFromDomain.map(bucket => (
          <li key={bucket.key} className='list-group-item py-1'>{bucket.key} ({bucket.doc_count})</li>
        ))}
        </ul>
      </div>
    )
  }

  _renderPostsList(list, label) {
    if (! list.length) {
      return 'No data'
    }

    return (
      <ul className='list-group'>
        {list.map(item => (
          <li key={item.id} className='list-group-item p-2'>
            <a target='_blank' href={item.url}>{item.title}</a> {label(item)}
          </li>
        ))}
      </ul>
    )
  }

  _renderCard(title, content) {
    return (
      <div className='card'>
        <div className='card-header'>
          <strong className='card-title'>{title}</strong>
        </div>
        <div className='card-body'>
          {content}
        </div>
      </div>
    )
  }
}

export default Dashboard;
