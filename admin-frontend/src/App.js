import 'bootstrap/dist/css/bootstrap.min.css';
import 'flag-icon-css/css/flag-icon.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'typeface-nunito-sans';
import './App.css';

import React, { Component } from 'react';
import ReactModal from 'react-modal';
import { hot } from 'react-hot-loader';
import { reaction } from "mobx";
import { Provider } from "mobx-react";
import { HashRouter, Redirect, Route, Switch } from "react-router-dom";

import PrivateRoute from './components/PrivateRoute';
import urls from './config/urls';
import * as pages from './pages';
import * as stores from './stores';

@hot(module)
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      isAuthenticated: false
    };

    reaction(
      () => ({
        isLoading: stores.appStore.isLoading,
        isAuthenticated: stores.appStore.isAuthenticated
      }),
      data => {
        this.setState(data)
      }
    );
  }

  componentDidMount() {
    ReactModal.setAppElement(document.getElementById('elastiquill-root'));
  }

  render() {
    const privateRoutes = [
      { path: '/', component: () => <Redirect to={urls.defaultUrl}/> },
      { path: urls.newItem, component: pages.ItemFormPage },
      { path: urls.editItem, component: pages.ItemFormPage },
      { path: urls.statsItem, component: pages.ItemStatsPage },
      { path: urls.pages, component: pages.Pages },
      { path: urls.posts, component: pages.Posts },
      { path: urls.dashboard, component: pages.Dashboard },
      { path: urls.backup, component: pages.Backup },
      { path: urls.setup, component: pages.Setup },
      { path: urls.status, component: pages.Status }
    ];

    return <Provider {...stores}>
      <HashRouter>
        <div id='elastiquill-root'>
          <Switch>
            <Route path={urls.login} component={pages.Login}/>
            {privateRoutes.map(route => {
              return (
                <PrivateRoute key={route.path}
                  exact
                  path={route.path}
                  component={route.component}
                  isLoading={this.state.isLoading}
                  isAuthenticated={this.state.isAuthenticated} />
              )
            })}
          </Switch>
        </div>
      </HashRouter>
    </Provider>;
  }
}

export default App;
