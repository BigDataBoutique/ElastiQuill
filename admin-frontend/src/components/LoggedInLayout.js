import React, { Component } from "react";
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from "reactstrap";
import { Link, Redirect, withRouter } from "react-router-dom";
import { inject, observer } from "mobx-react/index";
import classnames from "classnames";

import FAIcon from "./FAIcon";
import NavLink from "./NavLink";
import { Layout } from "./Layout";
import SetupWarning from "./SetupWarning";
import urls from "../config/urls";
import logo from "../assets/img/logo.png";
import dashboardIcon from "../assets/img/dashboard.svg";
import postsIcon from "../assets/img/posts.svg";
import contentPagesIcon from "../assets/img/content-pages.svg";
import backupIcon from "../assets/img/backup.svg";
import statusIcon from "../assets/img/status.svg";

@inject("appStore")
@withRouter
@observer
class LoggedInLayout extends Component {
  state = {
    navbarOpen: true,
    leftMenuOpen: false,
    userMenuOpen: false,
  };

  render() {
    const { appStore } = this.props;

    if (appStore.isLoading) {
      return false;
    }

    if (!appStore.isAuthenticated) {
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

    return (
      <Layout>
        <div className="elastiquill-navbar">
          <div className="container h-100 d-flex align-items-center">
            <Link to="/" className="elastiquill-logo-container">
              <img className="elastiquill-logo" src={logo} />
              <span className="elastiquill-admin-label">Admin</span>
            </Link>
            <div className="elastiquill-user-area">
              <div
                className={classnames("dropdown float-right", {
                  show: this.state.userMenuOpen,
                })}
              >
                <button
                  className="btn btn-link active p-0 d-flex align-items-center"
                  onClick={this.handleUserMenuToggle}
                >
                  <img
                    className="rounded-circle"
                    src={this.props.appStore.user.avatarUrl}
                    alt="User Avatar"
                  />

                  <div className="elastiquill-user-area-label">
                    {this.props.appStore.user.name}
                  </div>
                </button>
                <div
                  className={classnames("dropdown-menu", {
                    show: this.state.userMenuOpen,
                  })}
                >
                  {this.props.appStore.user.company && (
                    <strong className="nav-link">
                      {this.props.appStore.user.company}
                    </strong>
                  )}
                  {this.props.appStore.user.authorizedBy && (
                    <span className="nav-link">
                      {this.props.appStore.user.authorizedBy}{" "}
                    </span>
                  )}
                  <button
                    className="btn btn-link nav-link"
                    onClick={this.handleLogoutClick}
                  >
                    <FAIcon icon="power-off" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="elastiquill-nav-link-container">
          <div className="container">
            <Navbar light expand="lg" className="p-0">
              <NavbarToggler
                onClick={() =>
                  this.setState({ navbarOpen: !this.state.navbarOpen })
                }
              />
              <Collapse isOpen={!!this.state.navbarOpen} navbar>
                {this._renderNavbar()}
              </Collapse>
            </Navbar>
          </div>
        </div>
        {this.props.toolbar && (
          <Collapse isOpen={!!this.state.navbarOpen}>
            <div className="elastiquill-nav-submenu">
              <div className="container text-right">{this.props.toolbar}</div>
            </div>
          </Collapse>
        )}
        <div
          className="container"
          style={{ paddingTop: "17px", minHeight: 800 }}
        >
          <SetupWarning />
          {this.props.children}
        </div>
        <footer className="elastiquill-footer">
          <a href="https://github.com/BigDataBoutique/ElastiQuill">
            ElastiQuill
          </a>
          , Copyright © 2019-2020{" "}
          <a href="https://bigdataboutique.com">BigData Boutique</a>
        </footer>
      </Layout>
    );
  }

  _renderNavbar() {
    const items = [
      { label: "Dashboard", url: urls.dashboard, image: dashboardIcon },
      { label: "Posts", url: urls.posts, image: postsIcon },
      { label: "Content Pages", url: urls.pages, image: contentPagesIcon },
      {
        label: "Backup",
        url: urls.backup,
        image: backupIcon,
        roles: ["admin"],
      },
      {
        label: "Status",
        url: urls.status,
        image: statusIcon,
        roles: ["admin"],
      },
    ].filter(it => {
      if (it.roles) {
        return it.roles.includes(this.props.appStore.user.role);
      }
      return true;
    });

    return (
      <Nav navbar className="w-100 p-0">
        {items.map((item, i) => (
          <NavItem key={i} className="w-100 elastiquill-nav-item">
            <NavLink {...item} />
          </NavItem>
        ))}
      </Nav>
    );
  }

  handleMenuToggleClick = () => {
    document.body.classList.toggle("open");
    this.setState({ leftMenuOpen: !this.state.leftMenuOpen });
  };

  handleUserMenuToggle = () => {
    this.setState({ userMenuOpen: !this.state.userMenuOpen });
  };

  handleLogoutClick = event => {
    event.preventDefault();

    const { appStore } = this.props;

    appStore.logout();
  };
}

export default LoggedInLayout;
