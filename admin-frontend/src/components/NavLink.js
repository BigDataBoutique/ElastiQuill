import React, { Component } from 'react';
import { Link, Route } from 'react-router-dom';
import SVG from 'react-inlinesvg';
import classnames from 'classnames';

import FAIcon from './FAIcon';

class NavLink extends Component {
  render() {
    let isActive = false;

    const { url } = this.props;
    const path = typeof url === "object" ? url.pathname : url;

    // Regex taken from: https://github.com/pillarjs/path-to-regexp/blob/master/index.js#L202
    const escapedPath = path && path.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");

    return (
      <Route
        path={escapedPath}
        children={({ location, match }) => {
          const isActive = !!match;

          return (
            <Link to={this.props.url}>
              <div className='elastiquill-nav-link'>
                {this._renderIcon(isActive)}
                <span className={classnames('elastiquill-nav-link-label', {
                  'elastiquill-nav-link-label-active': isActive
                })}>
                  {this.props.label}
                </span>
              </div>
            </Link>
          );
        }}
      />
    );    
  }

  _renderIcon(isActive) {
    if (this.props.image) {
      return (
        <SVG
          className={classnames('elastiquill-nav-link-icon', {
            'elastiquill-nav-link-icon-active': isActive
          })}
          src={this.props.image} />
      )
    }

    return (
      <FAIcon
        className={classnames('elastiquill-nav-link-icon', {
          'elastiquill-nav-link-icon-active': isActive
        })}
        icon={this.props.icon} />
    )
  }
}

export default NavLink;
