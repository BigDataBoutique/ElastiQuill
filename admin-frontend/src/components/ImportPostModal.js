import React, {Component} from 'react';
import ReactModal from 'react-modal';
import { Button, Input, Row, Col } from 'reactstrap';

class ImportPostModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: '',
      isLoading: false
    };
  }

  render() {
    const modalStyle = {
      content : {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '50%',
        overflow: 'hidden'
      }
    };

    return (
      <ReactModal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={() => this.props.onRequestClose()}>
        {this._renderModal()}
      </ReactModal>
    )
  }

  _renderModal() {
    return (
      <div>
        <Row>
          <Col>
            <Input
              placeholder='Elastiquill post URL'
              value={this.state.url}
              onChange={ev => this.setState({ url: ev.target.value })} />
          </Col>
        </Row>
        <Row style={{ marginTop: 10, textAlign: 'right' }}>
          <Col>
            <Button
              disabled={this.props.isLoading}
              color='primary'
              onClick={() => this.props.onRequestImport(this.state.url)} >
              {this.props.isLoading ? 'Loading...' : 'Import'}
            </Button>
            <Button
              style={{ marginLeft: 5 }}
              disabled={this.props.isLoading}
              onClick={() => this.props.onRequestClose()} >
              Cancel
            </Button>            
          </Col>
        </Row>
      </div>
    )
  }
}

export default ImportPostModal;
