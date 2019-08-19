import React, { Component } from 'react';
import { Collapse, Navbar, NavbarToggler, Nav, NavItem } from 'reactstrap';
import { Link, Redirect, withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react/index';
import classnames from 'classnames';

import FAIcon from './FAIcon';
import NavLink from './NavLink';
import { Layout } from './Layout';
import SetupWarning from './SetupWarning';
import urls from '../config/urls';
import logo from '../assets/img/logo.png';


@inject('appStore')
@withRouter
@observer
class LoggedInLayout extends Component {
  state = {
    navbarOpen: true,
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
            <Link to='/'>
              <img className='elastiquill-logo' src={logo} />
              <span className='elastiquill-admin-label'>Admin</span>
            </Link>
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
                  {this.props.appStore.user.authorizedBy && <span className='nav-link'>{this.props.appStore.user.authorizedBy} </span>}
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
                {this._renderNavbar()}
              </Collapse>
            </Navbar>
          </div>
        </div>
        {this.props.toolbar && (
          <Collapse isOpen={!! this.state.navbarOpen}>
            <div className='elastiquill-nav-submenu'>
              <div className='container text-right'>
                {this.props.toolbar}
              </div>
            </div>
          </Collapse>
        )}        
        <div className='container' style={{ paddingTop: '17px', minHeight: 800 }}>
          <SetupWarning />
          {this.props.children}
        </div>
        <footer className='elastiquill-footer'>
			<a href="https://github.com/BigDataBoutique/ElastiQuill">ElastiQuill</a>, Copyright © 2019 <a href="https://bigdataboutique.com">BigData Boutique</a>
        </footer>
      </Layout>
    )
  }

  _renderNavbar() {
    const items = [
      { label: 'Dashboard', url: urls.dashboard, icon: 'tachometer-alt' },
      { label: 'Posts', url: urls.posts, icon: 'pencil-alt' },
      { label: 'Content Pages', url: urls.pages, icon: 'file' },
      { label: 'Backup', url: urls.backup, icon: 'archive', roles: ['admin'] },
      { label: 'Status', url: urls.status, icon: 'notes-medical', roles: ['admin'] },
    ].filter(it => {
      if (it.roles) {
        return it.roles.includes(this.props.appStore.user);
      }
      return true; 
    });

    return (
      <Nav navbar>
        {items.map((item, i) => (
          <NavItem key={i}>
            <NavLink {...item} />
          </NavItem>
        ))}
      </Nav>
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
