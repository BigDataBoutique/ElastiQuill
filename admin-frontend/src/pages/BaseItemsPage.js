import _ from 'lodash';
import React, {Component} from 'react';
import {inject, observer} from 'mobx-react';
import classnames from 'classnames';
import ReactModal from 'react-modal';
import { Link } from 'react-router-dom';
import { Button, ButtonGroup, ListGroup, ListGroupItem } from 'reactstrap';

import LoggedInLayout from '../components/LoggedInLayout';
import SetupWarning from '../components/SetupWarning';
import urls from '../config/urls';

class BaseItemsPage extends Component {

  _renderContent(strings, store) {
    const { isLoading, itemFormOpen, currentItem } = store;
    const isNew = currentItem === null;

    return (
      <LoggedInLayout pageTitle={strings.title} toolbar={this._renderNav(strings, store)}>
        <div className='content'>
          <SetupWarning />
          {isLoading ? 'Loading...' : this._renderItems(strings, store)}
        </div>
        {this._renderDeleteItemModal(store)}
      </LoggedInLayout>
    )
  }

  _renderNav(strings, store) {
    return (
      <div>
        <Link to={`/new/${strings.urlPart}`}>
          <Button>{strings.newItem}</Button>
        </Link>
      </div>
    )
  }

  _renderItems(strings, store) {
    const { pageIndex, totalPages } = store;
    if (totalPages === 0) {
      return (
        <div>
          {strings.noItems}
        </div>
      )
    }

    return (
      <div>
        <ListGroup>
          {store.items.map((item, i) => {
            return (
              <ListGroupItem key={i}>
                {this._renderLineItem(item)}
              </ListGroupItem>
            )
          })}
        </ListGroup>
        {this._renderPagination(store)}
      </div>
    )
  }

  _renderLineItem(item) {
    const url = `${item.url}${_.isEmpty(item.private_viewing_key) ? '' : '?secret=' + item.private_viewing_key}`
    const urlPart = this._getUrlPart();

    return (
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => this.props.history.push(`/stats/${urlPart}/` + item.id)}>
          {item.title}
        </div>
        <div>
          {this._renderLineItemExtra && this._renderLineItemExtra(item)}
          <a href={url} target='_blank'>
            <Button
              style={{ marginRight: 10 }}
              color='primary'>Open{!_.isEmpty(item.private_viewing_key) && ' (secret URL)'}
              <i style={{ marginLeft: 5 }} className='fa fa-external-link' />
            </Button>
          </a>
          <Link to={`/edit/${urlPart}/` + item.id}>
            <Button
              style={{ marginRight: 10 }}
              color='primary'>Edit<i style={{ marginLeft: 5 }} className='fa fa-pencil' /></Button>
          </Link>
          <Button
            onClick={() => this._getStore().setDeleteItemId(item.id)}
            style={{ marginRight: 10 }}
            color='danger'>Delete<i style={{ marginLeft: 5 }} className='fa fa-trash' />
          </Button>
        </div>
      </div>
    )
  }

  _renderPagination(store) {
    const { pageIndex, totalPages } = store;
    const setPage = dir => () => store.loadPage(pageIndex + dir)

    return (
      <div style={{ marginTop: 10, display: 'flex' }}>
        <ButtonGroup>
          <Button onClick={setPage(-1)} disabled={pageIndex == 0}>Prev</Button>
          <Button onClick={setPage(+1)} disabled={pageIndex + 1 >= totalPages}>Next</Button>
        </ButtonGroup>
        <div style={{ marginTop: 8, marginLeft: 5 }}>
          Page {pageIndex + 1} of {totalPages}
        </div>
      </div>
    )
  }

  _renderDeleteItemModal(store) {
    const customStyles = {
      content: {
        top    : '40%',
        left   : '30%',
        right  : '30%',
        bottom : '40%'
      }
    };

    const onRequestClose = () => {
      store.setDeleteItemId(null);
    };

    return (
      <ReactModal
        style={customStyles}
        isOpen={store.deleteItemId !== null}
        onRequestClose={onRequestClose}>
        <div>
          <p>Are you sure you want to delete selected item?</p>
          <div style={{ textAlign: 'right' }}>
            <Button
              disabled={store.isItemDeleting}
              onClick={() => this._onDeleteItem()}
              style={{ marginRight: 5 }}
              color='danger'>
              {store.isItemDeleting ? 'Loading...' : 'Delete' }
            </Button>
            <Button
              disabled={store.isItemDeleting}
              onClick={onRequestClose}>Cancel</Button>
          </div>
        </div>
      </ReactModal>
    )
  }
}

export default BaseItemsPage;
