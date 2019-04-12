import _ from 'lodash';
import React, {Component} from 'react';
import ReactModal from 'react-modal';
import { Button, ButtonGroup } from 'reactstrap';

const MIN_SUBREDDIT_LENGTH = 3;

class RedditShareDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      subreddit: 'todayilearned'
    };
  }

  render() {
    const modalStyle = {
      content : {
        top                   : '50%',
        left                  : '50%',
        right                 : 'auto',
        bottom                : 'auto',
        marginRight           : '-50%',
        transform             : 'translate(-50%, -50%)',
        width: '400px'
      }
    };

    const store = this.props.postsStore;
    const item = store.socialItem;
    if (! item) {
      return false;
    }

    const onRequestClose = () => store.setSocialDialog(null);
    const submitDisabled = store.isLoading || this.state.subreddit.length < MIN_SUBREDDIT_LENGTH;

    const requestSubmit = () => {
      if (submitDisabled) return;
      store.postItemToSocial({ subreddit: this.state.subreddit });
    };

    return (
      <ReactModal
        style={modalStyle}
        isOpen={!! this.props.postsStore.socialDialog}
        onRequestClose={onRequestClose}>
        <div className='row'>
          <div className='input-group' style={{ margin: '0px 10px' }}>
            <div className='input-group-prepend'>
              <div className='input-group-text'>r/</div>
            </div>
            <input
              type='text'
              value={this.state.subreddit}
              onKeyDown={ev => {
                if (ev.keyCode === 13) {
                  requestSubmit();
                }
              }}
              onChange={ev => this.setState({ subreddit: ev.target.value })}
              className='form-control'
              placeholder='subreddit' />
          </div>
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <Button
            disabled={submitDisabled}
            onClick={requestSubmit}
            style={{ marginRight: 5 }}
            color='primary'>
            {store.isLoading ? 'Loading...' : 'Submit link to subreddit' }
          </Button>
          <Button
            disabled={store.isLoading}
            onClick={onRequestClose}>Cancel</Button>
        </div>
      </ReactModal>
    )
  }
}

export default RedditShareDialog;
