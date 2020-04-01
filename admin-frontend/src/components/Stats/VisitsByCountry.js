import React from "react";
import PropType from "prop-types";

const VisitsByCountry = ({ data }) => {
  if (!data.length) {
    return "No data yet";
  }

  return (
    <div>
      {data.map(bucket => (
        <div key={bucket.key} style={{ margin: "5px 0px" }}>
          <span
            style={{ marginRight: 10 }}
            className={"flag-icon flag-icon-" + bucket.key.toLowerCase()}
          ></span>
          {countries.getName(bucket.key, "en")}
          <span className="float-right text-muted">{bucket.doc_count}</span>
        </div>
      ))}
    </div>
  );
};

VisitsByCountry.propTypes = {
  data: PropType.arrayOf(
    PropType.shape({
      key: PropType.string,
      doc_count: PropType.number,
    })
  ).isRequired,
};

export default VisitsByCountry;
