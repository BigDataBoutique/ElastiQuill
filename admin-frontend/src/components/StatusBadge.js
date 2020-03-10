import React from "react";
import done from "./../assets/img/done.svg";
import not from "./../assets/img/not.svg";
import error from "./../assets/img/error.svg";
import configured from "./../assets/img/configured.svg";

export const statusBadgeType = {
  done: "DONE",
  configured: "CONFIGURED",
  unconfigured: "NOT CONFIGURED",
  error: "ERROR",
};

function StatusBadge(props) {
  if (props.status === statusBadgeType.done) {
    return (
      <div
        className="d-flex align-items-center"
        style={{
          color: "#09C199",
          fontSize: 14,
        }}
      >
        <img style={{ height: 18 }} className="mr-2" alt="DONE" src={done} />
        <span style={{ fontWeight: 600 }}>DONE</span>
      </div>
    );
  } else if (props.status === statusBadgeType.unconfigured) {
    return (
      <div
        className="d-flex align-items-center"
        style={{
          color: "#F7981C",
          fontSize: 14,
        }}
      >
        <img
          style={{ height: 18 }}
          className="mr-2"
          alt="NOT CONFIGURED"
          src={not}
        />
        <span style={{ fontWeight: 600 }}>NOT CONFIGURED</span>
      </div>
    );
  } else if (props.status === statusBadgeType.configured) {
    return (
      <div
        className="d-flex align-items-center"
        style={{
          color: "#1991EB",
          fontSize: 14,
        }}
      >
        <img
          style={{ height: 18 }}
          className="mr-2"
          alt="CONFIGURED"
          src={configured}
        />
        <span style={{ fontWeight: 600 }}>CONFIGURED</span>
      </div>
    );
  }
  return (
    <div
      className="d-flex align-items-center"
      style={{
        color: "#F85359",
        fontSize: 14,
      }}
    >
      <img style={{ height: 18 }} className="mr-2" alt="ERROR" src={error} />
      <span style={{ fontWeight: 600 }}>
        ERROR
        <br />
        {props.error}
      </span>
    </div>
  );
}

export default StatusBadge;
