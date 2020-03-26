import React from "react";
import ReactModal from "react-modal";
import { Button } from "reactstrap";

const CreateItemModal = props => {
  const modalStyle = {
    content: {
      top: "50%",
      left: "50%",
      right: "auto",
      bottom: "auto",
      marginRight: "-50%",
      transform: "translate(-50%, -50%)",
      width: "auto",
      overflow: "hidden",
    },
  };

  return (
    <ReactModal
      style={modalStyle}
      isOpen={props.isOpen}
      onRequestClose={props.onRequestClose}
    >
      <Button
        className="d-block w-100"
        onClick={() => props.onRequestCreate("html")}
        color="primary"
      >
        Use HTML editor
      </Button>
      <Button
        className="d-block mt-2 w-100"
        onClick={() => props.onRequestCreate("markdown")}
        color="primary"
      >
        Use Markdown editor
      </Button>
    </ReactModal>
  );
};

export default CreateItemModal;
