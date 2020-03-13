import _ from "lodash";
import React from "react";
import { toast } from "react-toastify";
import { UncontrolledTooltip } from "reactstrap";
import { uniqueId } from "lodash";

import LoggedInLayout from "../components/LoggedInLayout";
import * as api from "../api";

import StatusBadge, { statusBadgeType } from "./../components/StatusBadge";

import linkedin from "./../assets/img/linkedin.svg";
import medium from "./../assets/img/medium.svg";
import reddit from "./../assets/img/reddit.svg";
import twitter from "./../assets/img/twitter.svg";

class Status extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: null,
    };

    api
      .loadStatus()
      .then(status => this.setState({ status }))
      .catch(err => toast.error(err.message));
  }

  render() {
    return (
      <LoggedInLayout pageTitle="Blog Status">
        <div className="elastiquill-content">
          <div className="row">
            <div className="col-12">
              <div>{this._renderStatus()}</div>
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderCompStatus() {
    const styles = {
      titleStatus: {
        fontSize: 14,
        color: "#B9C0C9",
        fontWeight: 600,
      },
    };
    return (
      <div className="row mb-4" style={{ height: 14 }}>
        <div className="col-8">
          <p style={styles.titleStatus}>COMPONENT</p>
        </div>
        <div className="col">
          <p style={styles.titleStatus}>STATUS</p>
        </div>
      </div>
    );
  }

  _renderStatus() {
    if (!this.state.status) {
      return "Loading...";
    }

    const {
      elasticsearch,
      upload,
      admin,
      spam,
      social,
      theme,
      emails,
    } = this.state.status;

    const styles = {
      title: {
        color: "#354052",
        fontSize: 24,
        marginLeft: 0,
        marginBottom: 22,
      },
    };

    return (
      <div>
        <div className="elastiquill-card mb-4 py-4 pr-4 pl-5">
          <div className="col-12 p-0" style={{ marginBottom: 10 }}>
            <h4 style={styles.title}>Blog</h4>
          </div>
          {this._renderCompStatus()}
          {this._renderBlogStatus(elasticsearch)}
          <div>
            {theme.path ? (
              this._renderLabel({
                label: "Theme",
                success: !theme.error,
                error: theme.error,
                value: theme.path,
              })
            ) : (
              <div style={{ fontSize: 18 }}>Using base theme</div>
            )}
          </div>
          <div>
            {this._renderLabel({
              label: "File upload",
              successTooltip: upload.backend
                ? upload.backend.toUpperCase()
                : false,
              success: upload.backend !== null,
              error: upload.errors["gcs"],
              opacity: true,
            })}
            <hr className="m-0" />
          </div>
        </div>

        <div className="elastiquill-card mb-4 py-4 pr-4 pl-5">
          <div style={{ marginBottom: 10 }}>
            <h4 style={styles.title}>Admin login</h4>
          </div>

          {this._renderCompStatus()}

          {this._renderLabel({
            label: "Admin login via Google OAuth",
            success: admin.google,
          })}
          {this._renderLabel({
            label: "Admin login via Github OAuth",
            success: admin.github,
          })}
          <hr className="m-0" />
          <div
            style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
            className="py-3"
          >
            <div style={{ opacity: 0.75 }}>
              Admin login enabled for:{" "}
              {admin.rules.indexOf("_all_") > -1 ? (
                <pre style={{ color: "#09C199" }}>everyone</pre>
              ) : (
                admin.rules.map((em, i) => (
                  <pre style={{ color: "#09C199" }} key={i}>
                    {em}
                    {admin.rules.length - 1 === i ? "" : ", "}
                  </pre>
                ))
              )}
            </div>
          </div>
          <hr className="m-0" />
        </div>

        <div className="elastiquill-card mb-4 py-4 pr-4 pl-5">
          <div style={{ marginBottom: 10 }}>
            <h4 style={styles.title}>Emailer</h4>
          </div>

          {this._renderCompStatus()}

          {this._renderLabel({
            label: "Sendgrid",
            success: emails.backend === "sendgrid",
          })}
          <hr className="m-0" />
        </div>

        <div className="elastiquill-card mb-4 py-4 pr-4 pl-5">
          <div style={{ marginBottom: 10 }}>
            <h4 style={styles.title}>Anti-spam</h4>
          </div>

          {this._renderCompStatus()}

          {this._renderLabel({ label: "Akismet", success: spam.akismet })}
          {this._renderLabel({ label: "Recaptcha", success: spam.recaptcha })}
          <hr className="m-0" />
        </div>

        <div className="elastiquill-card mb-4 py-4 pr-4 pl-5">
          <div style={{ marginBottom: 10 }}>
            <h4 style={styles.title}>Social channels</h4>
          </div>

          {this._renderCompStatus()}

          {this._renderLabel({
            label: "Twitter",
            success: social.twitter !== "not_configured",
            image: twitter,
          })}
          {this._renderLabel({
            label: "Reddit",
            success: social.reddit !== "not_configured",
            image: reddit,
          })}
          {this._renderLabel({
            label: "LinkedIn",
            success: social.linkedin !== "not_configured",
            image: linkedin,
          })}
          {this._renderLabel({
            label: "Medium",
            success: social.medium !== "not_configured",
            image: medium,
          })}
          {this._renderLabel({
            label: "Facebook",
            success: social.facebook !== "not_configured",
            image: medium,
          })}
          <hr className="m-0" />
        </div>
      </div>
    );
  }

  _renderBlogStatus(elasticsearch) {
    const allConfigured = _.every(_.values(elasticsearch.setup));
    const error =
      "Errors in setup detected: " +
      _.keys(elasticsearch.setup)
        .filter(k => !elasticsearch.setup[k])
        .map(k => {
          if (k === "blogLogsIndexTemplateUpToDate") {
            return "blog-logs template is out-of-date";
          }
          return `${k} misconfigured`;
        })
        .join(", ");

    const renderHealth = status => {
      const mappings = {
        red: statusBadgeType.configured,
        yellow: statusBadgeType.configured,
        green: statusBadgeType.configured,
        warn: statusBadgeType.configured,
        error: statusBadgeType.error,
      };

      const colorMappings = {
        red: "bg-danger",
        yellow: "bg-warning",
        green: "bg-success",
        warn: "bg-warning",
        error: "bg-danger",
      };

      const tooltipMappings = {
        red:
          "One or more primary shards are unassigned, so some data is unavailable.",
        yellow:
          "All primary shards are assigned, but one or more replica shards are unassigned.",
        green: "All shards are assigned.",
        warn: "Warn",
        error: "Error",
      };

      const tooltipId = uniqueId("tooltip");

      return (
        <div className="d-flex align-items-center">
          <StatusBadge
            error={error}
            status={mappings[status] || statusBadgeType.configured}
          />
          {colorMappings[status] && (
            <>
              <span
                id={tooltipId}
                className={`ml-2 ${colorMappings[status]}`}
                style={{ width: 8, height: 8, borderRadius: "50%" }}
              />
              <UncontrolledTooltip placement="bottom" target={tooltipId}>
                {tooltipMappings[status]}
              </UncontrolledTooltip>
            </>
          )}
        </div>
      );
    };

    const styles = {
      renderText: {
        fontSize: 16,
        color: "#404043",
        opacity: 0.75,
      },
    };
    return (
      <>
        <div className="mb-5">
          {this._renderLabel({
            label: "Initial setup",
            type: allConfigured ? statusBadgeType.done : statusBadgeType.error,
            success: allConfigured,
            error: error || "Wasn't done, see README",
          })}
          {!allConfigured && (
            <div>
              Go to <a href="#/setup">/setup</a> page to complete setup.
            </div>
          )}

          <hr className="m-0" />
          <div
            style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
            className="py-3"
          >
            <div className="row">
              <div style={styles.renderText} className="col-8">
                Elasticsearch cluster health{" "}
              </div>
              <div className="col">
                {renderHealth(elasticsearch.cluster_health)}
              </div>
            </div>
          </div>
          <hr className="m-0" />
          <div
            style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
            className="py-3"
          >
            <div className="row">
              <div style={styles.renderText} className="col-8">
                Blog operation
              </div>
              <div className="col">{renderHealth(elasticsearch.log_level)}</div>
            </div>
          </div>
          <hr className="m-0" />
        </div>
      </>
    );
  }

  _renderLabel({
    label,
    success,
    error,
    type,
    value = false,
    successTooltip = false,
    opacity = false,
    image = null,
  }) {
    const tooltipId = label.replace(" ", "");

    let statusType = type;
    if (!statusType) {
      statusType = success
        ? statusBadgeType.configured
        : error
        ? statusBadgeType.error
        : statusBadgeType.unconfigured;
    }

    return (
      <>
        <hr className="m-0" />
        <div
          style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
          className="py-3"
        >
          <div className="row">
            <div className="col-8 d-flex align-items-center">
              {image && (
                <img
                  style={{ height: 24 }}
                  alt=""
                  src={image}
                  className="mr-3"
                />
              )}
              <h5
                style={{
                  display: "inline-block",
                  color: "#404043",
                  fontSize: opacity ? 16 : 18,
                  opacity: opacity ? 0.75 : 1,
                  margin: 0,
                }}
              >
                {label}: {value}
              </h5>
            </div>
            <div className="col" id={tooltipId}>
              <StatusBadge status={statusType} error={error} />
            </div>
            {successTooltip && (
              <UncontrolledTooltip placement="bottom" target={tooltipId}>
                {successTooltip}
              </UncontrolledTooltip>
            )}
          </div>
        </div>
      </>
    );
  }
}

export default Status;
