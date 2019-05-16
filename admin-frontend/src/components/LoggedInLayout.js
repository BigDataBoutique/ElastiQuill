import React, {Component} from 'react';
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from 'reactstrap';
import { Link, Redirect, withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react/index';
import classnames from 'classnames';

import FAIcon from './FAIcon';
import NavLink from './NavLink';
import { Layout } from './Layout';
import urls from '../config/urls';
import logo from '../assets/img/logo.png';
import dashboardIcon from '../assets/img/dashboard.svg'
import postsIcon from '../assets/img/pages.svg'
import contentPagesIcon from '../assets/img/posts.svg'


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
      return false;
    }

    if (!appStore.isAuthenticated) {
      return <Redirect to={{
        pathname: urls.login,
        state: {
          from: this.props.location.pathname
        }
      }}/>;
    }

    return (
      <Layout>
        <div className='elastiquill-navbar'>
          <div className='container' style={{ display: 'flex', flexFlow: 'row', paddingTop: '35px' }}>
            <img className='elastiquill-logo' src={logo} />
            <span className='elastiquill-admin-label'>Admin</span>
            <div className='elastiquill-user-area'>
              <div className={classnames('dropdown float-right', {'show': this.state.userMenuOpen})}>
                <button style={{ padding: '0px' }} className='btn btn-link active' onClick={this.handleUserMenuToggle}>
                  <img
                    className='rounded-circle'
                    src={this.props.appStore.user.avatarUrl}
                    alt='User Avatar'/>

                  <div className='elastiquill-user-area-label'>
                    {this.props.appStore.user.name}
                  </div>
                </button>
                <div
                  className={classnames('dropdown-menu', {'show': this.state.userMenuOpen})}>
                  {this.props.appStore.user.company && <strong className='nav-link'>{this.props.appStore.user.company}</strong>}
                  {this.props.appStore.user.email && <span className='nav-link'>{this.props.appStore.user.email} </span>}
                  <button className='btn btn-link nav-link' onClick={this.handleLogoutClick}><FAIcon
                    icon='power-off'/>Logout
                  </button>
                </div>
              </div>        
            </div>
          </div>
        </div>
        <div className='elastiquill-nav-link-container'>
          <div className='container'>
            <Navbar light expand='lg'>
              <NavbarToggler onClick={() => this.setState({ navbarOpen: ! this.state.navbarOpen })} />
              <Collapse isOpen={!! this.state.navbarOpen} navbar>
                <Nav navbar>
                  {[
                    { label: 'Dashboard', url: urls.dashboard, icon: 'tachometer-alt' },
                    { label: 'Posts', url: urls.posts, icon: 'pencil-alt' },
                    { label: 'Content Pages', url: urls.pages, icon: 'file' },
                    { label: 'Backup', url: urls.backup, icon: 'archive' },
                    { label: 'Status', url: urls.status, icon: 'notes-medical' },
                  ].map((item, i) => (
                    <NavItem key={i}>
                      <NavLink {...item} />
                    </NavItem>
                  ))}
                </Nav>
              </Collapse>
            </Navbar>
          </div>
        </div>
        <div className='container' style={{ paddingTop: '17px' }}>
          {this.props.pageTitle && (
            <div style={{ display: 'flex' }}>
              <div className='elastiquill-header' style={{ flex: 1 }}>{this.props.pageTitle}</div>
              <div>
                {this.props.toolbar}
              </div>
            </div>
          )}
          {this.props.children}
        </div>
      </Layout>
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
