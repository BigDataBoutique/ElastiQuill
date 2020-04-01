import React from "react";
import PropType from "prop-types";
import StatsList from "./StatsList";

const ReferralsStats = ({ referrerType, referrerDomain }) => {
  if (referrerDomain.length + referrerType.length === 0) {
    return "No data";
  }

  return (
    <>
      <StatsList title="Domain" list={referrerDomain} />
      <StatsList title="Type" list={referrerType} />
    </>
  );
};

ReferralsStats.propTypes = {
  referrerType: PropType.array.isRequired,
  referrerDomain: PropType.array.isRequired,
};

export default ReferralsStats;
