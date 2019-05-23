import React, { Fragment } from 'react';
import moment from 'moment';
import countries from 'i18n-iso-countries';
import {inject, observer} from 'mobx-react';

countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

import VisitsMap from '../components/VisitsMap';
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
      mostViewedPost,
      recentComments,
      mostBusyDayEver,
      visitsByCountry,
      visitsByLocation,
      mostCommentedPosts,
      averageVisitsPerDay,
    } = this.props.dashboardStore;

    if (beingLoaded.length) {
      return 'Loading...';
    }

    const mostBusyDayEverCard = mostBusyDayEver && this._renderCard(
      <React.Fragment>
        <div style={{ flex: 1 }}>
          <h4>{moment(mostBusyDayEver.date).format('DD/MM/YYYY')}</h4>
          <h6>{mostBusyDayEver.count + ' visits'}</h6>
        </div>
        <h2>Most busy day ever</h2>
      </React.Fragment>
    );

    const mostViewedCard = mostViewedPost && this._renderCard(
      <React.Fragment>
        <h4 style={{ flex: 1 }}>
          <a
            target='_blank'
            style={{ fontSize: '13px' }}
            href={mostViewedPost.url}>
            {this._textEllipsis(mostViewedPost.title, 40)}
          </a>
        </h4>
        <h6>{mostViewedPost.views_count + ' views'}</h6>
        <h2>Most viewed post</h2>
      </React.Fragment>
    );

    return (
      <Fragment>
        <div className='elastiquill-header'>Overview</div>
        <div className='row' style={{ minHeight: '124px', marginBottom: '63px', marginLeft: -5 }}>
          {this._renderTextCard('Posts created', postsCount || 0)}
          {this._renderTextCard('Comments on posts', commentsCount || 0)}
          {this._renderTextCard('Visitors / day (average)', averageVisitsPerDay || 0)}
          {mostBusyDayEverCard}
          {mostViewedCard}
          <div className='col-lg-2' />
        </div>

        <div className='row' style={{ marginBottom: '41px' }}>
          <div className='col-12'>
            <div className='elastiquill-header'>Blog Statistics</div>
            <div className='elastiquill-card'>
              <StatsOverTimeGraph />
            </div>
          </div>
        </div>
        
        <div className='row' style={{ marginBottom: '41px' }}>
          <div className='col-lg-8'>
            <div className='elastiquill-header'>Visitors Map</div>
            <div className='elastiquill-card'>
              <VisitsMap mapData={visitsByLocation} />
            </div>
          </div>
          <div className='col-lg-4' style={{ display: 'flex', flexFlow: 'column' }}>
            <div className='elastiquill-header'>Visits by country</div>
            <div className='elastiquill-card'>
              {this._renderVisitsByCountry(visitsByCountry)}
            </div>
          </div>
        </div>

        <div className='row' style={{ marginBottom: '41px' }}>
          <div className='col-lg-12'>
            <div className='elastiquill-header'>Other stats</div>
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

  _renderVisitsByCountry(visitsByCountry) {
    if (! visitsByCountry.length) {
      return 'No data yet';
    }

    return (
      <div>
        {visitsByCountry.map((bucket, i) => (
          <div key={bucket.key} style={{ margin: '5px 0px' }}>
            <span
              style={{ marginRight: 10 }}
              className={'flag-icon flag-icon-' + bucket.key.toLowerCase()}></span>
            {countries.getName(bucket.key, 'en')}
            <span className='float-right text-muted'>{bucket.doc_count}</span>
          </div>
        ))}
      </div>
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
      <div style={{ marginBottom: 10 }}>
        <strong>{title}</strong>
        <div>
          {content}
        </div>
      </div>
    )
  }

  _renderTextCard(label, text) {
    return this._renderCard(
      <React.Fragment>
        <h1 style={{ flex: 1 }}>{text}</h1>
        <h2>{label}</h2>
      </React.Fragment>
    )
  }

  _renderCard(contents) {
    const minHeight = 120;
    return (
      <div style={{ display: 'flex', flexFlow: 'column', minHeight }} className='col-lg-2 mr-lg-4 elastiquill-card'>
        {contents}
      </div>
    )
  }

  _textEllipsis(text, len) {
    if (text.length - 3 > len) {
      text = text.substring(0, len - 3) + '...';
    }
    return text;
  }
}

export default Dashboard;
