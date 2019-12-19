import React, { Component } from "react";
import { inject, observer } from "mobx-react";
import { Redirect, Route, withRouter } from "react-router-dom";
import urls from "../config/urls";

@inject("appStore")
@withRouter
@observer
class PrivateRoute extends Component {
  render() {
    const { component, isLoading, isAuthenticated, ...rest } = this.props;
    return (
      <Route
        {...rest}
        render={this._renderComponent.bind(
          this,
          component,
          isLoading,
          isAuthenticated
        )}
      />
    );
  }

  _renderComponent(Cmp, isLoading, isAuthenticated, props) {
    if (isLoading) {
      return false;
    }

    if (isAuthenticated) {
      return <Cmp {...props} />;
    }

    return (
      <Redirect
        to={{
          pathname: urls.login,
          state: {
            from: this.props.location.pathname,
          },
        }}
      />
    );
  }
}

export default PrivateRoute;
