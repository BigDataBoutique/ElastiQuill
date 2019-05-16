import React, { Fragment } from 'react';
import {inject, observer} from 'mobx-react';

import VisitsMap from '../components/VisitsMap';
import SetupWarning from '../components/SetupWarning';
import CommentsList from '../components/CommentsList';
import LoggedInLayout from '../components/LoggedInLayout';
import StatsOverTimeGraph from '../components/StatsOverTimeGraph';

@inject('dashboardStore')
@observer
class Dashboard extends React.Component {
  componentDidMount() {
    this.props.dashboardStore.loadStats();
  }

  render() {
    return (
      <LoggedInLayout>
        <div className='elastiquill-content'>
          <SetupWarning />
          {this._renderContent()}
        </div>
      </LoggedInLayout>
    );
  }

  _renderContent() {
    const {
      postsCount,
      beingLoaded,
      popularPosts,
      commentsCount,
      recentComments,
      visitsByLocation,
      mostCommentedPosts
    } = this.props.dashboardStore;

    if (beingLoaded.length) {
      return 'Loading...';
    }

    return (
      <Fragment>
        <div className='elastiquill-header'>Overview</div>
        <div className='row' style={{ minHeight: '124px', marginBottom: '63px', marginLeft: -5 }}>
          <div className='col-lg-3 mr-lg-4 elastiquill-card'>
            <h1>{postsCount || 0}</h1>
            <h2>Posts created</h2>
          </div>
          <div className='col-lg-3 elastiquill-card'>
            <h1>{commentsCount || 0}</h1>
            <h2>Comments on posts</h2>
          </div>
          <div className='col-lg-6' />
        </div>

        <div className='row' style={{ marginBottom: '41px' }}>
          <div className='col-12'>
            <div className='elastiquill-header'>Statistics over time</div>
            <div className='elastiquill-card'>
              <StatsOverTimeGraph />
            </div>
          </div>
        </div>
        
        <div className='row' style={{ marginBottom: '41px' }}>
          <div className='col-lg-8'>
            <div className='elastiquill-header'>Visitors map</div>
            <div className='elastiquill-card'>
              <VisitsMap mapData={visitsByLocation} />
            </div>
          </div>
          <div className='col-lg-4' style={{ display: 'flex', flexFlow: 'column' }}>
            <div className='elastiquill-header'>Info</div>
            <div className='elastiquill-card' style={{ flex: 1 }}>
              {this._renderSection('Referrals Stats', this._renderReferrals())}
              {this._renderSection('Most viewed', this._renderPostsList(popularPosts, item => {
                return <span>({item.visits_count} {item.visits_count > 1 ? 'views' : 'view'})</span>
              }))}
              {this._renderSection('Most commented', this._renderPostsList(mostCommentedPosts, item => {
                return <span>({item.comments_count} {item.comments_count > 1 ? 'comments' : 'comment'})</span>
              }))}
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col-12'>
            <div className='elastiquill-header'>Recent comments</div>
            <div className='elastiquill-card'>
              <CommentsList comments={recentComments} />
            </div>
          </div>
        </div>          
      </Fragment>      
    )
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
      <div>
        {list.map(item => (
          <div key={item.id}>
            <a target='_blank' href={item.url}>{item.title}</a> {label(item)}
          </div>
        ))}
      </div>
    )
  }

  _renderSection(title, content) {
    return (
      <div>
        <strong>{title}</strong>
        <div>
          {content}
        </div>
      </div>
    )
  }
}

export default Dashboard;
