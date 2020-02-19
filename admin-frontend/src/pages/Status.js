import _ from "lodash";
import React from "react";
import { toast } from "react-toastify";
import { UncontrolledTooltip, Badge } from "reactstrap";

import LoggedInLayout from "../components/LoggedInLayout";
import * as api from "../api";

import StatusBadge from "./../components/StatusBadge"

import linkedin from "./../assets/img/linkedin.svg"
import medium from "./../assets/img/medium.svg"
import reddit from "./../assets/img/reddit.svg"
import twitter from "./../assets/img/twitter.svg"

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
        color: '#B9C0C9',
        fontFamily: "'Source Sans Pro', sans-serif"
      },
    }
    return (
      <div className="row mb-4" style={{height: 14}}>
        <div className="col-8">
          <p style={styles.titleStatus}>COMPONENT</p>
        </div>
        <div className="col">
          <p style={styles.titleStatus}>STATUS</p>
        </div>
    </div>
    )
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

    const styles= {
       title: {
        color: "#354052", 
        fontSize: 24, 
        marginLeft: 0, 
        marginBottom: 22
      },
    }

    return (
      <div>
        <div className="elastiquill-card mb-4">

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
              <div style={{fontSize: 18}}>Using base theme</div>
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
              opacity: true
            })}
            <hr />
          </div>
        </div>

          <div className="elastiquill-card mb-4">
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
            <hr />
            <div>
              <div style={{opacity: 0.75}}>
                Admin login enabled for:{" "}
              {admin.rules.indexOf("_all_") > -1 ? (
                <pre style={{color: "#09C199"}}>everyone</pre>
              ) : (
                admin.rules.map((em, i) => (
                  <pre style={{color: "#09C199"}} key={i}>
                    {em}
                    {admin.rules.length - 1 === i ? "" : ", "}
                  </pre>
                ))
              )}
              </div>
            </div>
            <hr />
          </div>

          <div className="elastiquill-card mb-4">
            <div style={{ marginBottom: 10 }}>
              <h4 style={styles.title}>Emailer</h4>
            </div>

            {this._renderCompStatus()}

            {this._renderLabel({
              label: "Sendgrid",
              success: emails.backend === "sendgrid",
            })}
            <hr />
          </div>

          <div className="elastiquill-card mb-4">
            <div style={{ marginBottom: 10 }}>
              <h4 style={styles.title}>Anti-spam</h4>
            </div>

            {this._renderCompStatus()}

            {this._renderLabel({ label: "Akismet", success: spam.akismet })}
            {this._renderLabel({ label: "Recaptcha", success: spam.recaptcha })}
            <hr />
          </div>

          <div className="elastiquill-card mb-4">
            <div style={{ marginBottom: 10 }}>
              <h4 style={styles.title}>Social channels</h4>
            </div>

            {this._renderCompStatus()}

            {this._renderLabel({
              label: "Twitter",
              success: social.twitter !== "not_configured",
              image: twitter
            })}
            {this._renderLabel({
              label: "Reddit",
              success: social.reddit !== "not_configured",
              image: reddit
            })}
            {this._renderLabel({
              label: "LinkedIn",
              success: social.linkedin !== "not_configured",
              image: linkedin
            })}
            {this._renderLabel({
              label: "Medium",
              success: social.medium !== "not_configured",
              image: medium
            })}
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
        red: "danger",
        error: "danger",
        yellow: "warning",
        warn: "warning",
        green: "configured",
      };

      
      return (
        <StatusBadge error={error} status={mappings[status] || "configured"} />
        );
      };
      
      const styles = {
        renderText: {
          fontSize: 16, 
          color: "#404043", 
          opacity: 0.75
        }
      }
    return (
      <>
      <div className="mb-5" style={{backgroundColor: "#FDFDFD"}}>
        {this._renderLabel({
          label: "Initial setup",
          successLabel: "Done",
          warningLabel: "Wasn't done, see README",
          success: allConfigured,
          error,
        })}
        {!allConfigured && (
          <div>
            Go to <a href="#/setup">/setup</a> page to complete setup.
          </div>
        )}

        <hr />

        <div className="row" style={{lineHeight: 3}}> 
          <div style={styles.renderText} className="col-8">
            Elasticsearch cluster health{" "}
          </div>
          <div className="col"> 
            {renderHealth(elasticsearch.cluster_health)}
          </div>
        </div>
          <hr />
        <div className="row">
          <div style={styles.renderText} className='col-8'>
            Blog operation 
          </div>
          <div className="col">
          {renderHealth(elasticsearch.log_level)}
          </div>
        </div>
        <hr />
      </div>
          <hr />
      </>
    );
  }

  _renderLabel({
    label,
    success,
    error,
    value = false,
    successTooltip = false,
    successLabel = "Configured",
    warningLabel = "Not configured",
    opacity = false,
    image = null
  }) {
    const tooltipId = label.replace(" ", "");
    return (
      <div>
        <hr />
        <div className="row" style={{ display: "flex", marginBottom: 3}}>
          <div className="col-8">
            {image && <img
                style={{ height: 24}}
                alt=""
                src={image}
                className="mr-3"
                />}
                  <h5 style={{
                    display: "inline-block",
                    color: "#404043", 
                    fontSize: opacity ? 16 : 18, 
                    opacity: opacity ? 0.75 : 1, 
                    fontFamily: "'Source Sans Pro', sans-serif"}}>
                    {label}: <pre>{value}</pre>{" "}
                  </h5>
          </div>
          <div className="col" style={{ marginTop: -3 }} id={tooltipId}>
            <StatusBadge error={error} status={success ? label == "Initial setup" ? "success" : "configured" : error ? "danger" : "warning"} />
          </div>
          {successTooltip && (
            <UncontrolledTooltip placement="bottom" target={tooltipId}>
              {successTooltip}
            </UncontrolledTooltip>
          )}
        </div>
      </div>
    );
  }
}

export default Status;