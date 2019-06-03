import React from 'react';
import { toast } from 'react-toastify';
import { UncontrolledTooltip, Badge } from 'reactstrap';

import LoggedInLayout from '../components/LoggedInLayout';
import * as api from '../api';

class Status extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: null
    };

    api.loadStatus()
      .then(status => this.setState({ status }))
      .catch(err => toast.error(err.message));
  }

  render() {
    return (
      <LoggedInLayout pageTitle='Blog Status'>
        <div className='elastiquill-content'>
          <div className='row'>
            <div className='col-12'>
              <div className='elastiquill-card'>
                {this._renderStatus()}
              </div>
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderStatus() {
    if (! this.state.status) {
      return 'Loading...';
    }

    const {
      elasticsearch, upload, admin, spam, social, theme, emails
    } = this.state.status;

    return (
      <div>
        <div style={{ marginBottom: 10 }}>
          <h4>Blog</h4>
        </div>
        {this._renderBlogStatus(elasticsearch)}
		  <div>
			  {theme.path ? (
				  this._renderLabel({
					  label: 'Theme',
					  success: ! theme.error,
					  error: theme.error,
					  value: theme.path
				  })
			  ) : (
				  <div>Using base theme</div>
			  )}
		  </div>
        <div>
          {this._renderLabel({
            label: 'File upload',
            successTooltip: upload.backend ? upload.backend.toUpperCase() : false,
            success: upload.backend !== null,
            error: upload.errors['gcs']
          })}
          <hr/>
        </div>
        <div>
          <div style={{ marginBottom: 10 }}>
            <h4>Admin login</h4>
          </div>

          {this._renderLabel({ label: 'Admin login via Google OAuth', success: admin.google })}
          {this._renderLabel({ label: 'Admin login via Github OAuth', success: admin.github })}
          <div>
            Admin login enabled for: {admin.rules.indexOf('_all_') > -1 ? <pre>everyone</pre> : (
              admin.rules.map((em, i) => (
                <pre key={i}>
                  {em}{admin.rules.length - 1 === i ? '' : ', '}
                </pre>
              ))
            )}
          </div>
          <hr/>
        </div>
        <div>
          <div style={{ marginBottom: 10 }}>
            <h4>Emailer</h4>
          </div>

          {this._renderLabel({
            label: 'Sendgrid',
            success: emails.backend === 'sendgrid'
          })}
          <hr/>        
        </div>
        <div>
          <div style={{ marginBottom: 10 }}>
            <h4>Anti-spam</h4>
          </div>

          {this._renderLabel({ label: 'Akismet', success: spam.akismet })}
          {this._renderLabel({ label: 'Recaptcha', success: spam.recaptcha })}
          <hr/>
        </div>
        <div>
          <div style={{ marginBottom: 10 }}>
            <h4>Social channels</h4>
          </div>

          {this._renderLabel({ label: 'Twitter', success: social.twitter !== 'not_configured' })}
          {this._renderLabel({ label: 'Reddit', success: social.reddit !== 'not_configured' })}
          {this._renderLabel({ label: 'LinkedIn', success: social.linkedin !== 'not_configured' })}
        </div>
      </div>
    )
  }

  _renderBlogStatus(elasticsearch) {
    const allConfigured = _.every(_.values(elasticsearch.setup));
    const error = 'Errors in setup detected: ' + _.keys(elasticsearch.setup)
      .filter(k => ! elasticsearch.setup[k])
      .map(k => {
        if (k === 'blogLogsIndexTemplateUpToDate') {
          return 'blog-logs template is out-of-date';
        }
        return `${k} misconfigured`;
      })
      .join(', ');

    const renderHealth = status => {
      const mappings = {
        red: 'danger',
        error: 'danger',
        yellow: 'warning',
        warn: 'warning',
        green: 'success',
      };

      return (
        <div className={`badge-${mappings[status] || 'success'}`} style={{
          width: 10, height: 10,
          borderRadius: 20,
          marginLeft: 5,
          display: 'inline-block'
        }} />
      )
    };

    return (
      <div>
        {this._renderLabel({
          label: 'Initial setup',
          successLabel: 'Done',
          warningLabel: 'Wasn\'t done, see README',
          success: allConfigured,
          error
        })}
        {!allConfigured && <div>Go to <a href='#/setup'>/setup</a> page to complete setup.</div>}

        <div>
          Elasticsearch cluster health {renderHealth(elasticsearch.cluster_health)}
        </div>
        <div>
          Blog operation {renderHealth(elasticsearch.log_level)}
        </div>
        <hr/>
      </div>      
    )
  }

  _renderLabel({ label, success, error, value = false, successTooltip = false, successLabel = 'Configured', warningLabel = 'Not configured' }) {
    const tooltipId = label.replace(' ', '');
    return (
      <div>
        <div style={{ display: 'flex', marginBottom: 3 }}>
          <h5>{label}: <pre>{value}</pre> </h5>
          <div style={{ marginTop: -3, marginLeft: 6 }} id={tooltipId}>
            <Badge color={success ? 'success' : (error ? 'danger' : 'warning')}>
              <span>
                {success ? successLabel : (error ? error : warningLabel)}
              </span>
            </Badge>
          </div>
          {successTooltip && (
            <UncontrolledTooltip placement='bottom' target={tooltipId}>{successTooltip}</UncontrolledTooltip>
          )}
        </div>
      </div>
    );
  }
}

export default Status;
