import React from "react";
import PropType from "prop-types";
import { UncontrolledTooltip } from "reactstrap";
import { uniqueId } from "lodash";
import SVG from "react-inlinesvg";
import doneIcon from "../assets/img/done.svg";
import unconfiguredIcon from "../assets/img/not.svg";
import errorIcon from "../assets/img/error.svg";
import configuredIcon from "../assets/img/configured.svg";
import colors from "../config/colors";

export const statusBadgeType = {
  done: "DONE",
  configured: "CONFIGURED",
  unconfigured: "NOT CONFIGURED",
  error: "ERROR",
};

function StatusBadge({ status, error, text, tooltip, color }) {
  const colorMappings = {
    DONE: colors.success,
    CONFIGURED: colors.primary,
    "NOT CONFIGURED": colors.warning,
    ERROR: colors.danger,
  };

  const iconMappings = {
    DONE: doneIcon,
    CONFIGURED: configuredIcon,
    "NOT CONFIGURED": unconfiguredIcon,
    ERROR: errorIcon,
  };

  const defaultText =
    status === statusBadgeType.error ? (
      <>
        {status}
        <br />
        {error}
      </>
    ) : (
      status
    );

  const tooltipId = uniqueId("tooltip");

  return (
    <div
      className="d-flex align-items-center"
      style={{
        color: color || colorMappings[status],
        fontSize: 14,
      }}
    >
      <SVG
        style={{ color: color || colorMappings[status], height: 18 }}
        className="mr-2 flex-grow-0 flex-shrink-0"
        src={iconMappings[status]}
        preProcessor={code =>
          code.replace(/fill=".*?"/g, 'fill="currentColor"')
        }
      />
      <div style={{ fontWeight: 600 }} id={tooltip ? tooltipId : undefined}>
        {text || defaultText}
      </div>
      {tooltip && (
        <UncontrolledTooltip placement="bottom" target={tooltipId}>
          {tooltip}
        </UncontrolledTooltip>
      )}
    </div>
  );
}

StatusBadge.propTypes = {
  status: PropType.oneOf(Object.values(statusBadgeType)).isRequired,
  error: PropType.string,
  text: PropType.node,
  tooltip: PropType.string,
  color: PropType.string,
};

export default StatusBadge;
