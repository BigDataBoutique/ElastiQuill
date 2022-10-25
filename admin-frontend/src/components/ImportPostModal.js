import React, { Component } from "react";
import ReactModal from "react-modal";
import { Button, Input, Row, Col } from "reactstrap";

class ImportPostModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: "",
      isLoading: false,
      keepCanonicalUrl: true,
      publishNow: true,
    };
  }

  render() {
    const modalStyle = {
      content: {
        top: "50%",
        left: "50%",
        right: "auto",
        bottom: "auto",
        marginRight: "-50%",
        transform: "translate(-50%, -50%)",
        width: "50%",
        overflow: "hidden",
      },
    };

    return (
      <ReactModal
        style={modalStyle}
        isOpen={this.props.isOpen}
        onRequestClose={() => this.props.onRequestClose()}
      >
        {this._renderModal()}
      </ReactModal>
    );
  }

  _renderModal() {
    return (
      <div>
        <Row>
          <Col>
            <Input
              placeholder="Elastiquill post URL"
              value={this.state.url}
              onChange={ev => this.setState({ url: ev.target.value })}
            />
          </Col>
        </Row>
        <Row>
          <Col className="d-flex align-items-center">
            <Input
              type="checkbox"
              checked={this.state.keepCanonicalUrl}
              onChange={ev =>
                this.setState({ keepCanonicalUrl: ev.target.checked })
              }
              id="keep-canonical-url"
              style={{
                margin: "0 5px 0 0",
                position: "unset",
              }}
            />
            <label className="mb-0" htmlFor="keep-canonical-url">
              Keep canonical URL
            </label>
          </Col>
        </Row>
        <Row>
          <Col className="d-flex align-items-center">
            <Input
              type="checkbox"
              checked={this.state.publishNow}
              onChange={ev => this.setState({ publishNow: ev.target.checked })}
              id="publish-now"
              style={{
                margin: "0 5px 0 0",
                position: "unset",
              }}
            />
            <label className="mb-0" htmlFor="publish-now">
              Publish now
            </label>
          </Col>
        </Row>
        <Row style={{ marginTop: 10, textAlign: "right" }}>
          <Col>
            <Button
              disabled={this.props.isLoading}
              color="primary"
              onClick={() =>
                this.props.onRequestImport(
                  this.state.url,
                  this.state.keepCanonicalUrl,
                  this.state.publishNow
                )
              }
            >
              {this.props.isLoading ? "Loading..." : "Import"}
            </Button>
            <Button
              style={{ marginLeft: 5 }}
              disabled={this.props.isLoading}
              onClick={() => this.props.onRequestClose()}
            >
              Cancel
            </Button>
          </Col>
        </Row>
      </div>
    );
  }
}

export default ImportPostModal;
