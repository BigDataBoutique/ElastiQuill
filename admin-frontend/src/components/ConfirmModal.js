import React from "react";
import ReactModal from "react-modal";
import { Button } from "reactstrap";

export default class ConfirmModal extends React.Component {
  render() {
    const customStyles = {
      content: {
        top: "40%",
        left: "30%",
        right: "30%",
        bottom: "auto",
      },
    };

    return (
      <ReactModal
        style={customStyles}
        isOpen={this.props.isOpen}
        onRequestClose={this.props.onRequestClose}
      >
        <div>
          <p>{this.props.label}</p>
          <div style={{ textAlign: "right" }}>
            <Button
              style={{ marginRight: 5 }}
              disabled={this.props.isDisabled}
              onClick={this.props.onSubmitClicked}
              color={this.props.submitColor}
            >
              {this.props.submitLabel}
            </Button>
            <Button
              disabled={this.props.isDisabled}
              onClick={this.props.onRequestClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ReactModal>
    );
  }
}
