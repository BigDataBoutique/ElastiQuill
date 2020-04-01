import React, { Component } from "react";
import { Link, Route } from "react-router-dom";
import SVG from "react-inlinesvg";
import classnames from "classnames";
import PropType from "prop-types";

import FAIcon from "./FAIcon";

class NavLink extends Component {
  render() {
    const { url } = this.props;
    const path = typeof url === "object" ? url.pathname : url;

    // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
    const escapedPath =
      path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

    return (
      <Route path={escapedPath}>
        {({ match }) => {
          const isActive = !!match;

          return (
            <Link to={this.props.url}>
              <div
                className={classnames("elastiquill-nav-link", {
                  "elastiquill-nav-link-active": isActive,
                })}
              >
                {this._renderIcon(isActive)}
                <span
                  className={classnames("elastiquill-nav-link-label", {
                    "elastiquill-nav-link-label-active": isActive,
                  })}
                >
                  {this.props.label}
                </span>
              </div>
            </Link>
          );
        }}
      </Route>
    );
  }

  _renderIcon(isActive) {
    if (this.props.image) {
      return (
        <SVG
          style={{
            color: this.props.iconColor || "black",
          }}
          className={classnames("elastiquill-nav-link-icon", {
            "elastiquill-nav-link-icon-active": isActive,
          })}
          src={this.props.image}
          preProcessor={code =>
            code.replace(/fill=".*?"/g, 'fill="currentColor"')
          }
        />
      );
    }

    return (
      <FAIcon
        className={classnames("elastiquill-nav-link-icon", {
          "elastiquill-nav-link-icon-active": isActive,
        })}
        icon={this.props.icon}
      />
    );
  }
}

NavLink.propTypes = {
  label: PropType.string.isRequired,
  url: PropType.oneOfType([
    PropType.string,
    PropType.shape({
      pathname: PropType.string,
    }),
  ]).isRequired,
  image: PropType.string.isRequired,
  iconColor: PropType.string,
};

export default NavLink;
