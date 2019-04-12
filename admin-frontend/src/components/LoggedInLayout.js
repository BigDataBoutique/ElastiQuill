import React, {Component} from 'react';
import {Layout} from "./Layout";
import {FAIcon} from "./FAIcon";
import {Link, Redirect, withRouter} from "react-router-dom";
import {inject, observer} from "mobx-react/index";
import classNames from "classnames";
import urls from "../config/urls";
import NavLiLink from "./NavLiLink";
import logo from '../assets/img/logo.png';

@inject('appStore')
@withRouter
@observer
class LoggedInLayout extends Component {
  state = {
    leftMenuOpen: false,
    userMenuOpen: false,
  };

  render() {
    const {appStore} = this.props;

    if (appStore.isLoading) {
      return <Spinner/>;
    }

    if (!appStore.isAuthenticated) {
      return <Redirect to={{
        pathname: urls.login,
        state: {
          from: this.props.location.pathname
        }
      }}/>;
    }

    return <Layout>
      <aside id="left-panel" className={classNames("left-panel", {"open-menu": this.state.leftMenuOpen})}>
        <nav className="w-100 navbar navbar-expand-sm navbar-default">
          <div id="main-menu" className="w-100 main-menu collapse navbar-collapse">
            {this._renderMenuItems([
              { label: 'Dashboard', url: urls.dashboard, icon: 'dashboard' },
              { label: 'Posts', url: urls.posts, icon: 'pencil' },
              { label: 'Content Pages', url: urls.pages, icon: 'file' },
              { label: 'Backup', url: urls.backup, icon: 'archive' },
            ])}
          </div>
        </nav>
      </aside>
      <div id="right-panel" className="right-panel">
        <header id="header" className="header">
          <div className="top-left">
            <div className="navbar-header">
              <img src={logo} style={{ height: '2rem' }} />
              <button id="menuToggle" className="btn btn-link menutoggle"
                onClick={this.handleMenuToggleClick}><FAIcon icon="bars"/></button>
            </div>
          </div>
          <div className="top-right">
            <div className="header-menu">
              <div className="header-left"></div>
              <div
                className={classNames("user-area dropdown float-right", {'show': this.state.userMenuOpen})}>
                <button className="btn btn-link dropdown-toggle active"
                    onClick={this.handleUserMenuToggle}>
                  <img className="user-avatar rounded-circle"
                     src={this.props.appStore.user.avatarUrl}
                     alt="User Avatar"/>
                </button>
                <div
                  className={classNames("user-menu dropdown-menu", {'show': this.state.userMenuOpen})}>
                  {this.props.appStore.user.name && <strong className="nav-link">{this.props.appStore.user.name}</strong>}
                  {this.props.appStore.user.company && <strong className="nav-link">{this.props.appStore.user.company}</strong>}
                  {this.props.appStore.user.email && <span className="nav-link">{this.props.appStore.user.email} </span>}
                  <button className="btn btn-link nav-link" onClick={this.handleLogoutClick}><FAIcon
                    icon="power-off"/>Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>
        {this.props.pageTitle &&
        <div className="breadcrumbs">
          <div className="breadcrumbs-inner">
            <div className="row m-0">
              <div className="col-md-8 col-sm-12">
                <div className="page-header float-left">
                  {this.props.navButtons ? this.props.navButtons : (
                    <div className="page-title">
                      <h1>{this.props.pageTitle}</h1>
                    </div>
                  )}
                </div>
              </div>
              {this.props.breadcrumbs &&
              <div className="col-md-4 col-sm-12">
                <div className="page-header float-right">
                  <div className="page-title">
                    <ol className="breadcrumb text-right">
                      {this.props.breadcrumbs.map((crumb) => (
                        <li key={crumb.url}><Link to={crumb.url}>{crumb.label}</Link></li>
                      ))}
                      <li className="active" style={{
                        maxWidth: '300px',
                        paddingRight: 10,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} >{this.props.pageTitle}</li>
                    </ol>
                  </div>
                </div>
              </div>
              }
              {this.props.toolbar && (
                <div className="col-md-4 col-sm-12">
                  <div style={{ textAlign: 'right', paddingTop: 7 }}>
                    {this.props.toolbar ? this.props.toolbar : false}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>}
        {this.props.children}
        <div className="clearfix"/>
        <footer className="site-footer">
          <div className="footer-inner bg-white">
            <div className="row">
              <div className="col-sm-8">
                Designed by Colorlib <br/>
                Copyright &copy; 2019 <a href="https://bigdataboutique.com" target="_blank">BigData Boutique</a>
              </div>
              <div className="col-sm-4 text-right">
                <a href="#">Back to top</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Layout>;
  }

  _renderMenuItems(items) {
    return (
      <ul className="w-100 nav navbar-nav">
        {items.map((item, i) => (
          <NavLiLink key={i} to={item.url}>
            <FAIcon className="menu-icon" icon={item.icon}/>{item.label}
          </NavLiLink>
        ))}
      </ul>
    )
  }

  handleMenuToggleClick = (event) => {
    document.body.classList.toggle('open');
    this.setState({leftMenuOpen: !this.state.leftMenuOpen});
  };

  handleUserMenuToggle = (event) => {
    this.setState({userMenuOpen: !this.state.userMenuOpen});
  };

  handleLogoutClick = (event) => {
    event.preventDefault();

    const {appStore} = this.props;

    appStore.logout();
  }
}

export default LoggedInLayout;
