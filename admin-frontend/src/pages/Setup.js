import _ from 'lodash';
import React, {Component} from 'react';
import {inject, observer} from "mobx-react";
import classnames from "classnames";
import { Link } from "react-router-dom";
import { ListGroup, ListGroupItem } from 'reactstrap';
import { Button, ButtonGroup } from 'reactstrap';

import LoggedInLayout from "../components/LoggedInLayout";
import urls from "../config/urls";
import * as api from '../api';

@inject('setupStore')
@observer
class Setup extends Component {
  componentDidMount() {
    this.props.setupStore.loadStatus();
  }

  render() {
    return (
      <LoggedInLayout pageTitle='Elasticsearch setup'>
        <div className='content'>
          <div className='row'>
            <div className='col-12'>
              {this._renderContent()}
            </div>
          </div>
        </div>
      </LoggedInLayout>
    );
  }

  _renderContent() {
    if (this.props.setupStore.isLoading) {
      return 'Loading...';
    }

    if (this.props.setupStore.status === 'ready') {
      return (
        <div className='alert alert-success'>
          Elasticsearch setup is completed.
        </div>
      )
    }

    const isLoadingSetup = this.props.setupStore.beingLoaded.indexOf('setup') > -1;

    return (
      <div>
        <div
          onClick={() => this.props.setupStore.setupElasticsearch()}
          disabled={isLoadingSetup}
          className='btn btn-primary btn-lg'>
          {isLoadingSetup ? 'Loading...' : 'Setup'}
        </div>
      </div>
    )
  }
}

export default Setup;
