import React, { useState, useEffect } from "react";
import "./style.css";
import ReactModal from "react-modal";
import PropTypes from "prop-types";
import moment from "moment";
import * as api from "../../api";
import colors from "../../config/colors";
import { toast } from "react-toastify";

const colorMappings = {
  info: colors.primary,
  warn: colors.warning,
  error: colors.danger,
};

const FilterInput = ({ name, value, onChange, placeholder }) => (
  <input
    type="text"
    name={name}
    value={value}
    onChange={onChange}
    className="filter-input"
    placeholder={placeholder}
  />
);

const LogModal = ({ level, onClose }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    level: "",
    tags: "",
    timestamp: "",
    message: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, data]);

  const loadData = () => {
    api
      .loadLogs(level)
      .then(response => setData(response))
      .catch(err => {
        toast.error(err.message || "Can't load logs");
      });
  };

  const applyFilters = () => {
    let filtered = data.filter(log => {
      return (
        log.level.toLowerCase().includes(filters.level.toLowerCase()) &&
        log.tags
          .join(" ")
          .toLowerCase()
          .includes(filters.tags.toLowerCase()) &&
        moment(log.timestamp)
          .format("LLL")
          .toLowerCase()
          .includes(filters.timestamp.toLowerCase()) &&
        log.message.toLowerCase().includes(filters.message.toLowerCase())
      );
    });
    setFilteredData(filtered);
  };

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  return (
    <ReactModal
      className="log-modal"
      overlayClassName="log-overlay"
      isOpen={true}
      onRequestClose={onClose}
    >
      <h2 className="mb-4 text-capitalize">{level} logs</h2>
      <div className="log-table">
        <div className="log-table-header">
          <div className="log-table-cell">
            Type
            <FilterInput
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              placeholder="Filter by type"
            />
          </div>
          <div className="log-table-cell">
            Tags
            <FilterInput
              name="tags"
              value={filters.tags}
              onChange={handleFilterChange}
              placeholder="Filter by tags"
            />
          </div>
          <div className="log-table-cell">
            Date
            <FilterInput
              name="timestamp"
              value={filters.timestamp}
              onChange={handleFilterChange}
              placeholder="Filter by date"
            />
          </div>
          <div className="log-table-cell">
            Message
            <FilterInput
              name="message"
              value={filters.message}
              onChange={handleFilterChange}
              placeholder="Filter by message"
            />
          </div>
        </div>
        <div className="log-table-body">
          {filteredData.map((log, index) => (
            <div className="log-table-row" key={index}>
              <div
                className="log-table-cell text-center"
                style={{ color: colorMappings[log.level] }}
              >
                {log.level}
              </div>
              <div className="log-table-cell">
                <pre>{log.tags.join("\n")}</pre>
              </div>
              <div className="log-table-cell text-center">
                {moment(log.timestamp).format("LLL")}
              </div>
              <div className="log-table-cell">
                <pre>{log.message}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ReactModal>
  );
};

LogModal.propTypes = {
  level: PropTypes.oneOf([null, "error", "warn", "info"]),
  onClose: PropTypes.func.isRequired,
};

export default LogModal;
