import _ from 'lodash';
import React, {Component} from 'react';
import {inject, observer} from "mobx-react";
import classnames from "classnames";
import { Link } from "react-router-dom";
import { ListGroup, ListGroupItem } from 'reactstrap';
import { InputGroup, InputGroupAddon, Input, Button, ButtonGroup } from 'reactstrap';
import { UncontrolledButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import FAIcon from '../components/FAIcon';
import LoggedInLayout from "../components/LoggedInLayout";
import ImportPostModal from "../components/ImportPostModal";
import RedditShareDialog from "../components/RedditShareDialog";
import ConfirmSocialDialog from "../components/ConfirmSocialDialog";
import BaseItemsPage from "./BaseItemsPage";
import urls from "../config/urls";
import * as api from '../api';

@inject('postsStore')
@observer
class Posts extends BaseItemsPage {
  componentDidMount() {
    this.props.postsStore.loadPage(0);
    this.props.postsStore.loadSocialAvailability();
  }

  render() {
    return (
      <div>
        {this._renderContent({
          title: 'Posts',
          newItem: 'Create a new post',
          noItems: 'No posts created yet',
          urlPart: this._getUrlPart()
        }, this.props.postsStore)}
        {this._renderDialog()}
        <ImportPostModal
          key={this.props.postsStore.importModalOpen}
          isOpen={this.props.postsStore.importModalOpen}
          isLoading={this.props.postsStore.beingLoaded.includes('importPost')}
          onRequestImport={(...args) => this.props.postsStore.importPost(...args)}
          onRequestClose={() => this.props.postsStore.setImportModalOpen(false)} />
      </div>
    )
  }

  _renderNav() {
    return (
      <div className='elastiquill-nav-submenu-extra'>
        <div style={{ display: 'flex' }}>
          <Button
            color='link'
            style={{ minWidth: 150, marginRight: 5 }}
            onClick={() => this.props.postsStore.setImportModalOpen(true)}>
            <FAIcon icon='cloud-download-alt' style={{ marginRight: '12px' }} />
            Import post
          </Button>
          <InputGroup>
            <Input
              value={this.props.postsStore.searchQuery}
              onChange={ev => this.props.postsStore.setSearchQuery(ev.target.value)}
              onKeyPress={ev => ev.charCode === 13 && this.props.postsStore.loadPage(0)}
              style={{ height: '100%' }} />
            <InputGroupAddon addonType='append'>
              <Button onClick={() => this.props.postsStore.loadPage(0)}>
                <FAIcon icon='search' />
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    )
  }

  _renderDialog() {
    switch (this.props.postsStore.socialDialog) {
      case 'twitter':
      case 'linkedin':
      case 'medium':
        return <ConfirmSocialDialog postsStore={this.props.postsStore} />;
      case 'reddit':
        return <RedditShareDialog postsStore={this.props.postsStore} />;
      default:
        return false;
    }
  }

  _renderLineItemExtra(item) {
    const { socialAvailability } = this.props.postsStore;
    if (! socialAvailability) {
      return false;
    }

    const allNotConfigured = _.every(_.values(socialAvailability), val => val === 'not_configured');
    if (allNotConfigured) {
      return false;
    }

    const style = {
      marginRight: 10,
      margin: 0,
      padding: 0,
      background: 0,
      border: 0,
      boxShadow: 'none',
      color: '#c3c4c3'
    };

    return (
      <UncontrolledButtonDropdown className='elastiquill-icon-button'>
        <DropdownToggle style={style}>
          <i style={{ marginRight: 10, marginTop: 4, fontSize: '18px' }} className='fa fa-share-alt' />
        </DropdownToggle>
        <DropdownMenu style={{ marginTop: 0, border: '1px solid #aaa' }}>
          <div style={{ paddingLeft: 10 }}>
            Repost on social
          </div>
          {! socialAvailability && <DropdownItem header>Loading...</DropdownItem>}
          {this._renderDropdownItem(item, 'Twitter', 'twitter')}
          {this._renderDropdownItem(item, 'Linkedin', 'linkedin')}
          {this._renderDropdownItem(item, 'Medium', 'medium')}
          {this._renderDropdownItem(item, 'Reddit', 'reddit')}
        </DropdownMenu>
      </UncontrolledButtonDropdown>
    )
  }

  _renderDropdownItem(item, title, key) {
    const { socialAvailability } = this.props.postsStore;
    if (socialAvailability[key] === 'not_configured') {
      return false;
    }

    if (key === 'medium' && _.get(item, 'metadata.medium_crosspost_url')) {
      return (
        <DropdownItem disabled={socialAvailability[key] === 'not_configured'}>
          <a href={_.get(item, 'metadata.medium_crosspost_url')} target='_blank'>
            <i className={`fab fa-${key}`} style={{ marginRight: 10 }} />
            {title}
            <i className='fa fa-external-link-alt' style={{ marginLeft: 10 }} />
          </a>
        </DropdownItem>
      )
    }

    const onClick = () => {
      if (socialAvailability[key] === 'ready') {
        this.props.postsStore.setSocialDialog(key, item);
      }
      else {
        api.redirectToSocialConnect(key);
      }
    };

    return (
      <DropdownItem
        disabled={socialAvailability[key] === 'not_configured'}
        onClick={onClick}>
        <i className={`fab fa-${key}`} style={{ marginRight: 10 }} />
        {title}
      </DropdownItem>
    )
  }

  _getUrlPart() {
    return 'post';
  }

  _getStore() {
    return this.props.postsStore;
  }

  async _onDeleteItem() {
    try {
      this.props.postsStore.setItemDeleting(true);
      await api.deletePost(this.props.postsStore.deleteItemId);
      this.props.postsStore.loadPage(0);
      this.props.postsStore.setDeleteItemId(null);
    }
    catch (err) {
      console.log(err);
    }
    finally {
      this.props.postsStore.setItemDeleting(false);
    }
  }
}

export default Posts;
