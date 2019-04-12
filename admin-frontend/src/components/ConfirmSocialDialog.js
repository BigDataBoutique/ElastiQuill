import _ from 'lodash';
import React, {Component} from 'react';
import ReactModal from 'react-modal';
import { Button, ButtonGroup } from 'reactstrap';

class ConfirmSocialDialog extends Component {
  constructor(props) {
    super(props);
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
    const title = store.socialDialog === 'medium' ? (
      <span>
        Do you want to cross-post "<a target='_blank' href={item.url}>{item.title}</a>" to Medium?
      </span>
    ) : (
      <span>
        Do you want to post "<a target='_blank' href={item.url}>{item.title}</a>" to {_.capitalize(this.props.postsStore.socialDialog)}?
      </span>
    );

    return (
      <ReactModal
        style={modalStyle}
        isOpen={!! this.props.postsStore.socialDialog}
        onRequestClose={onRequestClose}>
        {title}
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <Button
            disabled={store.isLoading}
            onClick={() => store.postItemToSocial()}
            style={{ marginRight: 5 }}
            color='primary'>
            {store.isLoading ? 'Loading...' : 'Confirm' }
          </Button>
          <Button
            disabled={store.isLoading}
            onClick={onRequestClose}>Cancel</Button>
        </div>
      </ReactModal>
    )
  }
}

export default ConfirmSocialDialog;
