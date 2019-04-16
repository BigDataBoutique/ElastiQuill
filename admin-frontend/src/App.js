import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import React, { Component } from 'react';
import { hot } from 'react-hot-loader';
import { reaction } from "mobx";
import { Provider } from "mobx-react";
import { HashRouter, Redirect, Route, Switch } from "react-router-dom";
import Login from './pages/Login';
import ItemFormPage from './pages/ItemFormPage';
import ItemStatsPage from './pages/ItemStatsPage';
import PrivateRoute from './components/PrivateRoute';
import urls from './config/urls';
import Pages from './pages/Pages';
import Posts from './pages/Posts';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Backup from './pages/Backup';
import appStore from './stores/App';
import statsStore from './stores/Stats';
import postsStore from './stores/Posts';
import pagesStore from './stores/Pages';
import setupStore from './stores/Setup';
import dashboardStore from './stores/Dashboard';

const stores = {
  appStore,
  setupStore,
  statsStore,
  postsStore,
  pagesStore,
  dashboardStore
};

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
        isLoading: appStore.isLoading,
        isAuthenticated: appStore.isAuthenticated
      }),
      data => {
        this.setState(data)
      }
    );
  }

  render() {
    const privateRoutes = [
      { path: '/', component: () => <Redirect to={urls.defaultUrl}/> },
      { path: urls.newItem, component: ItemFormPage },
      { path: urls.editItem, component: ItemFormPage },
      { path: urls.statsItem, component: ItemStatsPage },
      { path: urls.pages, component: Pages },
      { path: urls.posts, component: Posts },
      { path: urls.dashboard, component: Dashboard },
      { path: urls.backup, component: Backup },
      { path: urls.setup, component: Setup }
    ];

    return <Provider {...stores}>
      <HashRouter>
        <div>
          <Switch>
            <Route path={urls.login} component={Login}/>
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
