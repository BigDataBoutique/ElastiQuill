import _ from 'lodash';
import React, {Component} from 'react';
import {inject, observer} from "mobx-react";
import classnames from "classnames";
import { Link } from "react-router-dom";
import { ListGroup, ListGroupItem } from 'reactstrap';
import { Button, ButtonGroup } from 'reactstrap';

import LoggedInLayout from "../components/LoggedInLayout";
import ContentPageForm from "../components/ContentPageForm";
import BaseItemsPage from "./BaseItemsPage";
import urls from "../config/urls";
import * as api from '../api';

@inject('pagesStore')
@observer
class Pages extends BaseItemsPage {
  componentDidMount() {
    this.props.pagesStore.loadPage(0);
  }

  render() {
    return this._renderContent({
      title: 'Content Pages',
      newItem: 'New page',
      noItems: 'No pages created yet',
      urlPart: this._getUrlPart()
    }, this.props.pagesStore);
  }

  _getStore() {
    return this.props.pagesStore;
  }

  _getUrlPart() {
    return 'page';
  }

  async _onDeleteItem() {
    try {
      this.props.pagesStore.setItemDeleting(true);
      const resp = await api.deleteContentPage(this.props.pagesStore.deleteItemId);
      if (resp.error) {
        throw new Error(resp.error);
      }
      this.props.pagesStore.loadPage(0);
      this.props.pagesStore.setDeleteItemId(null);
    }
    catch (err) {
      console.log(err);
    }
    finally {
      this.props.pagesStore.setItemDeleting(false);
    }
  }
}

export default Pages;
