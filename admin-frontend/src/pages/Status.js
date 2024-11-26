import _ from "lodash";
import React from "react";
import { inject, observer } from "mobx-react";

import colors from "../config/colors";
import LoggedInLayout from "../components/LoggedInLayout";
import StatusBadge, { statusBadgeType } from "./../components/StatusBadge";
import LogModal from "../components/LogModal";

import linkedin from "./../assets/img/linkedin.svg";
import medium from "./../assets/img/medium.svg";
import reddit from "./../assets/img/reddit.svg";
import twitter from "./../assets/img/twitter.svg";

@inject("statusStore")
@observer
class Status extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logLevel: null,
    };
  }

  render() {
    return (
      <LoggedInLayout pageTitle="Blog Status">
        <div className="elastiquill-content">
          <div className="row">
            <div className="col-12">
              <div>{this._renderStatus()}</div>
              {this.state.logLevel && (
                <LogModal
                  level={this.state.logLevel}
                  onClose={() => this.setState({ logLevel: null })}
                />
              )}
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
    if (!this.props.statusStore.status) {
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
    } = this.props.statusStore.status;

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
              tooltip: upload.backend ? upload.backend.toUpperCase() : false,
              success: upload.backend !== null,
              error: upload.errors[upload.backend],
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
              <div
                className="d-flex flex-wrap h-100 overflow-auto"
                style={{ maxHeight: "150px" }}
              >
                {admin.rules.indexOf("_all_") > -1 ? (
                  <pre style={{ color: colors.success }}>everyone</pre>
                ) : (
                  admin.rules.map((em, i) => (
                    <pre style={{ color: colors.success }} key={i}>
                      {em}
                      {admin.rules.length - 1 === i ? "" : ", "}
                    </pre>
                  ))
                )}
              </div>
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
            success: social.twitter.status !== "not_configured",
            image: twitter,
          })}
          {this._renderLabel({
            label: "Reddit",
            success: social.reddit.status !== "not_configured",
            image: reddit,
          })}
          {this._renderLabel({
            label: "LinkedIn",
            success: social.linkedin.status !== "not_configured",
            image: linkedin,
          })}
          {this._renderLabel({
            label: "Medium",
            success: social.medium.status !== "not_configured",
            image: medium,
          })}
          {this._renderLabel({
            label: "Facebook",
            success: social.facebook.status !== "not_configured",
            image: medium,
          })}
          <hr className="m-0" />
        </div>
      </div>
    );
  }

  _renderBlogStatus(elasticsearch) {
    const { error: setupError, ...setup } = elasticsearch.setup;
    const allConfigured = _.every(_.values(setup));
    const notConfigured = _.every(_.values(setup), i => i === false);

    let error;
    if (!allConfigured && !notConfigured) {
      error = Object.values(setupError).join(", ");
    }

    const type = allConfigured
      ? statusBadgeType.done
      : notConfigured
      ? statusBadgeType.unconfigured
      : statusBadgeType.error;

    return (
      <div className="mb-5">
        {this._renderLabel({
          label: "Initial setup",
          type,
          error,
          text:
            type === statusBadgeType.unconfigured
              ? "Wasn't done, see README"
              : undefined,
        })}
        {!allConfigured && (
          <div className="pb-3">
            Go to <a href="#/setup">/setup</a> page to complete setup.
          </div>
        )}
        {this._renderClusterHealth(elasticsearch.cluster_health)}
        {this._renderLogLevel(elasticsearch.log_level)}
        <hr className="m-0" />
      </div>
    );
  }

  _renderClusterHealth(health) {
    const mappings = {
      red: statusBadgeType.error,
      yellow: statusBadgeType.error,
      green: statusBadgeType.configured,
    };

    const colorMappings = {
      red: colors.danger,
      yellow: colors.warning,
      green: colors.primary,
    };

    const descriptionMappings = {
      red:
        "One or more primary shards are unassigned, so some data is unavailable.",
      yellow:
        "All primary shards are assigned, but one or more replica shards are unassigned.",
      green: "All shards are assigned.",
    };

    // for warnings
    const healthWarning =
      health === "yellow" ? descriptionMappings[health] : undefined;
    // for errors
    const healthError =
      health === "red" ? descriptionMappings[health] : undefined;

    return (
      <>
        <hr className="m-0" />
        <div
          style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
          className="py-3"
        >
          <div className="row">
            <div
              style={{ fontSize: 16, color: "#404043", opacity: 0.75 }}
              className="col-8"
            >
              Elasticsearch cluster health{" "}
            </div>
            <div className="col">
              <div className="d-flex align-items-center">
                <StatusBadge
                  status={mappings[health] || statusBadgeType.configured}
                  color={colorMappings[health]}
                  tooltip={healthWarning}
                  // for warnings use "configured" text instead of "error"
                  text={healthWarning ? statusBadgeType.configured : undefined}
                  error={healthError}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  _renderLogLevel(logLevel) {
    const status =
      logLevel.error || logLevel.warn
        ? statusBadgeType.error
        : statusBadgeType.configured;
    const color = logLevel.error
      ? colors.danger
      : logLevel.warn
      ? colors.warning
      : colors.primary;

    const setLogLevel = level => () => {
      this.setState({ logLevel: level });
    };
    const text = (
      <>
        <span className="me-2">
          {logLevel.error ? statusBadgeType.error : statusBadgeType.configured}
        </span>
        {logLevel.error && (
          <button
            className="elastiquill-log-level-tag danger"
            onClick={setLogLevel("error")}
          >
            errors ({logLevel.error})
          </button>
        )}
        {logLevel.warn && (
          <button
            className="elastiquill-log-level-tag warning"
            onClick={setLogLevel("warn")}
          >
            warnings ({logLevel.warn})
          </button>
        )}
        {logLevel.info && (
          <button
            className="elastiquill-log-level-tag info"
            onClick={setLogLevel("info")}
          >
            info ({logLevel.info})
          </button>
        )}
      </>
    );

    return (
      <>
        <hr className="m-0" />
        <div
          style={{ backgroundColor: "rgba(229, 229, 229, 0.06)" }}
          className="py-3"
        >
          <div className="row">
            <div
              style={{ fontSize: 16, color: "#404043", opacity: 0.75 }}
              className="col-8"
            >
              Blog operation
            </div>
            <div className="col">
              <div className="d-flex align-items-center">
                <StatusBadge status={status} color={color} text={text} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  _renderLabel({
    label,
    success,
    error,
    type,
    text,
    value = false,
    tooltip,
    opacity = false,
    image = null,
  }) {
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
                  className="me-3"
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
            <div className="col">
              <StatusBadge
                status={statusType}
                error={error}
                tooltip={tooltip}
                text={text}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default Status;
