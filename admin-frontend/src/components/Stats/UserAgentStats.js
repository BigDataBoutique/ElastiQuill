import React from "react";
import PropType from "prop-types";
import StatsList from "./StatsList";

const UserAgentStats = ({ userAgentName, userAgentOperatingSystem }) => {
  if (userAgentOperatingSystem.length + userAgentName.length === 0) {
    return "No data";
  }

  return (
    <>
      <StatsList title="Operating system" list={userAgentOperatingSystem} />
      <StatsList title="User agent name" list={userAgentName} />
    </>
  );
};

UserAgentStats.propTypes = {
  userAgentOperatingSystem: PropType.array.isRequired,
  userAgentName: PropType.array.isRequired,
};

export default UserAgentStats;
