import React, {Component} from 'react';
import {Link, Route} from "react-router-dom";
import PropTypes from "prop-types";
import classNames from "classnames";
import {inject, observer} from "mobx-react";

/**
 * A <Link> wrapper that knows if it's "active" or not.
 */
@inject('appStore')
@observer
class NavLiLink extends Component {
  render() {
    const {
      appStore,
      "aria-current": ariaCurrent = "page",
      activeClassName = "active",
      activeStyle,
      className: classNameProp,
      exact,
      isActive: isActiveProp,
      location,
      strict,
      style: styleProp,
      to,
      ...rest
    } = this.props;

    const path = typeof to === "object" ? to.pathname : to;

    // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
    const escapedPath = path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

    return (
      <Route
        path={escapedPath}
        exact={exact}
        strict={strict}
        location={location}
        children={({location, match}) => {
          const isActive = !!(isActiveProp
            ? isActiveProp(match, location)
            : match);

          const className = isActive
            ? classNames(classNameProp, activeClassName)
            : classNameProp;
          const style = isActive ? {...styleProp, ...activeStyle} : styleProp;

          return (
            <li className={className}
              style={style}>
              <Link
                aria-current={(isActive && ariaCurrent) || null}
                to={to}
                {...rest}
              />
            </li>
          );
        }}
      />
    );
  }
}

const ariaCurrentType = PropTypes.oneOf([
  "page",
  "step",
  "location",
  "date",
  "time",
  "true"
]);

export default NavLiLink;
