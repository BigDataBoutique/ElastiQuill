import React from 'react';
import { toast } from 'react-toastify';
import { action, computed, observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { Badge } from 'reactstrap';

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
      <LoggedInLayout pageTitle='Status page'>
        <div className='content'>
          <div className='row'>
            <div className='col-12'>
              <div className='card'>
                <div className='card-body'>
                  {this._renderStatus()}
                </div>
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
        {this._renderElasticsearchStatus(elasticsearch)}
        <div>
          <div style={{ marginBottom: 10 }}>
            <h4>File upload</h4>
          </div>

          {this._renderLabel({
            label: 'Google Cloud Storage',
            success: upload.backend === 'gcs',
            error: upload.errors['gcs']
          })}
          {this._renderLabel({
            label: 'AWS S3',
            success: upload.backend === 's3',
            error: upload.errors['s3']
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
              admin.rules.map((em, i) => <pre key={i}>{em}</pre>)
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
          <hr/>
        </div>        
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
      </div>
    )
  }

  _renderElasticsearchStatus(elasticsearch) {
    const allConfigured = _.every(_.values(elasticsearch));
    const error = 'Errors in setup detected: ' + _.keys(elasticsearch)
      .filter(k => ! elasticsearch[k])
      .map(k => `${k} misconfigured`)
      .join(', ');

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
        <hr/>
      </div>      
    )
  }

  _renderLabel({ label, success, error, value = false, successLabel = 'Configured', warningLabel = 'Not configured' }) {
    return (
      <div>
        <div style={{ display: 'flex', marginBottom: 3 }}>
          <h5>{label}: <pre>{value}</pre> </h5>
          <div style={{ marginTop: -3, marginLeft: 6 }}>
            <Badge color={success ? 'success' : (error ? 'danger' : 'warning')}>
              {success ? successLabel : (error ? error : warningLabel)}
            </Badge>
          </div>
        </div>
      </div>
    );
  }
}

export default Status;
