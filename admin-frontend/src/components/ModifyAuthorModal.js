import React, { useEffect, useState } from "react";
import ReactModal from "react-modal";
import { Button, FormGroup, Input, Label } from "reactstrap";
import { toast } from "react-toastify";

const ModifyAuthorModal = ({ item, onClose, onConfirm, updateItem }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(item ? item.author.name : "");
    setEmail(item ? item.author.email : "");
  }, [item]);

  const handleSaveClick = () => {
    if (!item || saving) return;
    setSaving(true);
    onConfirm(item.id, item.type, name, email)
      .then(response => {
        updateItem(item.id, response.author);
        toast.success("Saved successfully");
        onClose();
      })
      .catch(err => {
        toast.error(err.message || "Failed to save author data");
        console.log(err);
      })
      .finally(() => setSaving(false));
  };

  return (
    <ReactModal
      isOpen={!!item}
      onRequestClose={onClose}
      style={{
        content: {
          inset: "40% 40% auto",
        },
      }}
    >
      <h4>Modify author details</h4>
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "stretch",
          flexDirection: "column",
          marginBottom: 15,
          marginTop: 20,
        }}
      >
        <FormGroup>
          <Label for="author-name">Name</Label>
          <Input
            id="author-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter author name"
            disabled={saving}
          />
        </FormGroup>
        <FormGroup>
          <Label for="author-email">Email</Label>
          <Input
            id="author-email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter author email"
            disabled={saving}
          />
        </FormGroup>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 5,
        }}
      >
        <Button
          disabled={!name || !email || saving}
          onClick={handleSaveClick}
          color="success"
        >
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </ReactModal>
  );
};

export default ModifyAuthorModal;
