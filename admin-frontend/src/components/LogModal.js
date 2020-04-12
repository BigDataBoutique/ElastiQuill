import React, { Component } from "react";
import ReactModal from "react-modal";
import ReactTable from "react-table-6";
import PropType from "prop-types";
import moment from "moment";
import * as api from "../api";
import colors from "../config/colors";
import "react-table-6/react-table.css";

class LogModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: null,
    };
  }

  componentDidMount() {
    this._loadData();
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
        width: "90vw",
        maxWidth: 1200,
        maxHeight: "90vh",
      },
    };
    const colorMappings = {
      info: colors.primary,
      warn: colors.warning,
      error: colors.danger,
    };

    const data = this.state.data;
    const columns = [
      {
        Header: "Type",
        accessor: "level",
        Cell: ({ value }) => (
          <div className="text-center" style={{ color: colorMappings[value] }}>
            {value}
          </div>
        ),
        sortable: true,
        minWidth: 150,
      },
      {
        Header: "Tags",
        accessor: "tags",
        Cell: ({ value }) => <pre>{value.join("\n")}</pre>,
        sortable: true,
        minWidth: 250,
      },
      {
        Header: "Date",
        accessor: "timestamp",
        Cell: ({ value }) => (
          <div className="text-center">{moment(value).format("LLL")}</div>
        ),
        sortable: true,
        width: 200,
      },
      {
        Header: "Message",
        accessor: "message",
        Cell: ({ value }) => <pre>{value}</pre>,
        sortable: true,
        width: 700,
      },
    ];

    return (
      <ReactModal
        style={modalStyle}
        isOpen={true}
        onRequestClose={this.props.onRequestClose}
      >
        <h2 className="mb-1 text-capitalize">{this.props.level} logs</h2>
        <p className="mb-3 font-italic" style={{ fontSize: 13, marginLeft: 2 }}>
          showing last 20 entries..
        </p>
        {!data ? (
          "Loading..."
        ) : (
          <ReactTable
            data={data}
            columns={columns}
            defaultPageSize={20}
            filterable={true}
            getTheadThProps={() => ({
              style: {
                fontWeight: 600,
              },
            })}
            className="-highlight"
          />
        )}
      </ReactModal>
    );
  }

  async _loadData() {
    const logs = await api.loadLogs(this.props.level);
    this.setState({ data: logs });
  }
}

LogModal.propTypes = {
  level: PropType.oneOf([null, "error", "warn", "info"]),
  onRequestClose: PropType.func.isRequired,
};

export default LogModal;
