import React, { useState, useEffect, useRef } from "react";
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

const defaultFilters = {
  level: "",
  tags: "",
  timestamp: "",
  message: "",
};

const LogModal = ({ level, onClose }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [jsonOpened, setJsonOpened] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    loadData(1);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [data, page, totalPages, loading]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    if (
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight
      ) <= 150
    ) {
      handleLoadMore();
    }
  };

  const handleLoadMore = async () => {
    if (loading) return;
    if (page < totalPages) {
      const nextPage = page + 1;
      await loadData(nextPage);
    }
  };

  const loadData = async pageToLoad => {
    setLoading(true);
    try {
      const response = await api.loadLogs(level, pageToLoad);
      setData(prev => [...prev, ...response.logs]);
      setFilteredData(prev => [
        ...prev,
        ...applyFilters(filters, response.logs),
      ]);
      setPage(pageToLoad);
      setTotalPages(response.totalPages);
    } catch (err) {
      toast.error(err.message || "Can't load logs");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = e => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setFilteredData(applyFilters(newFilters, data));
  };

  const applyFilters = (filters, data) => {
    return data.filter(log => {
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
  };

  return (
    <>
      <ReactModal
        className="log-modal"
        overlayClassName="log-overlay"
        isOpen={true}
        onRequestClose={onClose}
      >
        <ModalHeader title={`${level} logs`} onClose={onClose} />
        <div className="log-table" ref={containerRef}>
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
                  <div className="log-table-cell-button-wrapper">
                    <button
                      onClick={() => setJsonOpened(log)}
                      className="log-table-cell-button"
                    >
                      Show full
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {(page < totalPages || loading) && (
            <div className="load-more-wrapper">
              <button
                onClick={loading ? null : handleLoadMore}
                className="load-more-button"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </ReactModal>
      <ReactModal
        className="log-json-modal"
        overlayClassName="log-json-overlay"
        isOpen={!!jsonOpened}
        onRequestClose={() => setJsonOpened(false)}
      >
        <ModalHeader
          title="Log Message JSON"
          onClose={() => setJsonOpened(false)}
        />
        <pre className={"log-json-content"}>
          {JSON.stringify(jsonOpened, null, 4).replace(/\\n/g, "\n")}
        </pre>
      </ReactModal>
    </>
  );
};

const ModalHeader = ({ title, onClose }) => (
  <div className="log-modal-header">
    <h2>{title}</h2>
    <button className="log-close-button" onClick={onClose}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
      >
        <path
          d="M18 6L6 18M6 6l12 12"
          stroke="#000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </div>
);

LogModal.propTypes = {
  level: PropTypes.oneOf([null, "error", "warn", "info"]),
  onClose: PropTypes.func.isRequired,
};

export default LogModal;
