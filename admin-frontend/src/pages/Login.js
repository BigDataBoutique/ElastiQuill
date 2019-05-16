import React, {Component} from 'react';
import {inject, observer} from 'mobx-react';
import {Layout} from '../components/Layout';
import {Redirect, withRouter} from 'react-router-dom';
import AuthButtons from '../components/AuthButtons';
import urls from '../config/urls';
import logo from '../assets/img/logo.png';

@inject('appStore')
@withRouter
@observer
class Login extends Component {
  componentDidMount() {
    document.body.classList.add('bg-dark');
    console.log();
  }

  componentWillUnmount() {
    document.body.classList.remove('modal-open');
    document.body.classList.remove('bg-dark');
  }

  render() {
    const {appStore} = this.props;

    if (appStore.isLoading) {
      return 'Loading...';
    }

    if (appStore.isAuthenticated) {
      if (this.props.location.state && this.props.location.state.from) {
        return <Redirect to={this.props.location.state.from}/>;
      }
      return <Redirect to={urls.defaultUrl}/>;
    }

    return (
      <Layout>
        <div className='flex align-content-center flex-wrap'>
          <div className='container'>
            <div className='card' style={{ maxWidth: 540, margin: '8vh auto' }}>
              <div style={{ padding: 30 }}>
                <div style={{ marginBottom: 15 }}>
                  <p style={{ textAlign: 'center' }}><img src={logo} /></p>
                  {this._renderError()}
                </div>
                <AuthButtons sources={this.props.appStore.socialAuthSources}/>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  _renderError() {
    if (this.props.location.pathname.indexOf('error') === -1) {
      return false;
    }

    let errorData;
    try {
      errorData = JSON.parse(atob(this.props.location.pathname.split('error/')[1]));
    }
    catch (err) {
      errorData = null;
    }

    let errorLabel;

    if (errorData && errorData.message) {
      errorLabel = <div>{errorData.message}</div>;
    }
    else if (errorData && errorData.emails) {
      errorLabel = (
        <div>
          User
            {errorData.emails.map((email, key) => {
              return <span> {email} </span>
            })}
            is not authorized to access this area. If you believe this is a mistake, contact the blog owners.
        </div>
      );
    }
    else {
      errorLabel = <div>Failed to authenticate using emails attached to account</div>;
    }

    return (
      <div className='alert alert-danger' style={{ marginTop: 20, marginBottom: 20, color: 'black' }}>
        <h4 className='alert-heading mb-0'>Authentication error</h4>
        <hr/>
        <p className='mb-0'>
          {errorLabel}
        </p>
      </div>
    )
  }
}

export default Login;
