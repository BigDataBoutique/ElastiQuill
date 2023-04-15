import React, { useEffect, useState } from "react";
import GoogleButton from "react-google-button";
import { API_ROUTE_PREFIX } from "../api";
import GitHubLogo from "../assets/img/github-logo.svg";

export default function AuthButtons(props) {
  if (!props.sources) {
    return false;
  }

  const [buttons, setButtons] = useState(null);

  useEffect(() => {
    const init = async () => {
      const btns = await Promise.all(
        props.sources.map(async source => {
          if (source === "github") {
            return (
              <div
                key="github"
                className="col-md"
                style={{ textAlign: "center" }}
              >
                <a
                  className="btn btn-secondary mb-3 mb-md-0"
                  style={{
                    padding: "10px 20px",
                    textTransform: "none",
                    fontSize: "14px",
                    width: "100%",
                    border: 0,
                  }}
                  href={`${API_ROUTE_PREFIX}/auth/github`}
                >
                  <img
                    style={{ height: 30, marginRight: 5 }}
                    alt="Sign in with Github"
                    src={GitHubLogo}
                  />{" "}
                  Sign in with GitHub
                </a>
              </div>
            );
          } else if (source === "google") {
            return (
              <div key="google" className="col-md">
                <GoogleButton
                  onClick={async () =>
                    (location.href = `${API_ROUTE_PREFIX}/auth/google`)
                  }
                />
              </div>
            );
          } else if (source === "anonymous") {
            return (
              <div key="anonymous" className="col-md">
                <a
                  href={`${API_ROUTE_PREFIX}/auth/anonymous`}
                  className="btn btn-primary"
                >
                  Login
                </a>
              </div>
            );
          }
        })
      );
      setButtons(btns);
    };

    init();
  }, []);

  return (
    <div>
      {props.sources.indexOf("anonymous") > -1 && (
        <div className="alert alert-warning">
          <div
            style={{ fontSize: "18px", textAlign: "center", marginBottom: 10 }}
          >
            Warning: admin screen is publicly accessible
          </div>
          Authorization to admin screen via single sign-on is not configured. To
          configure authorization, check <pre>README.md</pre> file.
        </div>
      )}
      <div className="row">{buttons}</div>
    </div>
  );
}
