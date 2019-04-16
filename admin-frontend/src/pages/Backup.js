import React from 'react';

import LoggedInLayout from '../components/LoggedInLayout';
import SetupWarning from '../components/SetupWarning';
import * as api from '../api';

class Backup extends React.Component {
  render() {
    return (
      <LoggedInLayout pageTitle={'Backup'}>
        <div className='content'>
          <SetupWarning />
          <div className='row'>
            <div className='col-12'>
              <div className='card'>
                <div className='card-body'>
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      JSON document with all posts and comments.
                    </div>
                    <a
                      href={api.downloadBackupUrl()}
                      className='btn btn-primary'>Download complete backup</a>
                  </div>
                  <hr/>
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      Archive of all logs in JSONL format.
                    </div>
                    <a
                      href={api.downloadLogsUrl()}
                      className='btn btn-primary'>Download logs archive</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }
}

export default Backup;
