import React from "react";
import PropType from "prop-types";

const StatsList = ({ title, list }) => (
  <div style={{ minHeight: 160 }}>
    <strong>{title}</strong>
    <div style={{ marginTop: 10 }}>
      {list.map(item => (
        <div key={item.key}>
          {item.key}
          <span className="float-right text-muted">{item.doc_count}</span>
        </div>
      ))}
    </div>
  </div>
);

StatsList.propTypes = {
  title: PropType.string.isRequired,
  list: PropType.arrayOf(
    PropType.shape({
      key: PropType.string,
      doc_count: PropType.number,
    })
  ).isRequired,
};

export default StatsList;
