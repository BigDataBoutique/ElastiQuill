import React from 'react';
import { toast } from 'react-toastify';

import LoggedInLayout from '../components/LoggedInLayout';
import * as api from '../api';


class Backup extends React.Component {
  render() {
    return (
      <LoggedInLayout pageTitle={'Backup'}>
        <div className='elastiquill-content'>
          <div className='row'>
            <div className='col-12'>
              <div className='elastiquill-card'>
                <div>
                  <div style={{ marginBottom: 10 }}>
                    JSON document with all posts and comments.
                  </div>
                  <button
                    onClick={this._onClick.bind(this, api.downloadBackup)}
                    className='btn btn-primary'>Download complete backup</button>
                </div>
                <hr/>
                <div>
                  <div style={{ marginBottom: 10 }}>
                    Archive of all logs in JSONL format.
                  </div>
                  <button
                    onClick={this._onClick.bind(this, api.downloadLogs)}
                    className='btn btn-primary'>Download logs archive</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  async _onClick(apiCall) {
    try {
      await apiCall();
    }
    catch (err) {
      toast.error(err.message);
    }
  }
}

export default Backup;
