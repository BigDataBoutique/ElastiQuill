import _ from 'lodash';
import $ from 'jquery';
import moment from 'moment';
import React, {Component} from 'react';
import {inject, observer} from 'mobx-react';
import classnames from 'classnames';
import copyToClipboard from 'copy-to-clipboard';
import ReactModal from 'react-modal';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { Button, ButtonGroup, ListGroup, ListGroupItem } from 'reactstrap';

import defaultItemImage from '../assets/img/default-post-image.jpg';
import deleteIcon from '../assets/img/delete.svg';
import editIcon from '../assets/img/edit.svg';
import newWindowIcon from '../assets/img/newindow.svg';
import LoggedInLayout from '../components/LoggedInLayout';
import SetupWarning from '../components/SetupWarning';
import FAIcon from '../components/FAIcon';
import urls from '../config/urls';
import * as api from '../api';

class BaseItemsPage extends Component {

  _renderContent(strings, store) {
    const { isLoading, itemFormOpen, currentItem } = store;
    const isNew = currentItem === null;

    const toolbar = (
      <div>
        <Link to={`/new/${strings.urlPart}`}>
          <Button className='elastiquill-button'>
            <FAIcon icon='plus' style={{ marginRight: '12px' }} />
            {strings.newItem}
          </Button>
        </Link>
        {this._renderNav && this._renderNav()}
      </div>
    );

    return (
      <LoggedInLayout pageTitle={strings.title} toolbar={toolbar}>
        <div className='elastiquill-content'>
          <SetupWarning />
          {isLoading ? 'Loading...' : this._renderItems(strings, store)}
        </div>
        {this._renderDeleteItemModal(store)}
      </LoggedInLayout>
    )
  }

  _renderItems(strings, store) {
    const { pageIndex, totalPages } = store;
    if (totalPages === 0) {
      return (
        <div>
          {store.isSearchResult ? 'Nothing matched your search' : strings.noItems}
        </div>
      )
    }

    return (
      <div>
        <div>
          {store.items.map((item, i) => {
            return (
              <div key={i}>
                {this._renderLineItem(item)}
              </div>
            )
          })}
        </div>
        {this._renderPagination(store)}
      </div>
    )
  }

  _renderLineItem(item) {
    const url = `${item.url}${_.isEmpty(item.private_viewing_key) ? '' : '?secret=' + item.private_viewing_key}`
    const urlPart = this._getUrlPart();

    let imageSrc = item.metadata.header_image_url || defaultItemImage;

    const onClick = ev => {
      if ($(ev.target).closest('.elastiquill-icon-button').length) {
        return;
      }
      this.props.history.push(`/stats/${urlPart}/` + item.id);
    };

    return (
      <div      
        className='elastiquill-card'
        onClick={onClick}
        style={{ display: 'flex', marginBottom: '24px', cursor: 'pointer' }}>
        <img src={imageSrc} style={{ width: '170px', height: '153px', objectFit: 'cover' }}/>
        <div style={{ display: 'flex', flexFlow: 'column', flex: 1, minWidth: '0px', paddingLeft: '33px' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, paddingRight: 10 }} className='elastiquill-header-2 elastiquill-text-ellipsis'>{item.title}</div>
            <div style={{ display: 'flex' }}>
              {this._renderLineItemExtra && this._renderLineItemExtra(item)}
              <div className='elastiquill-icon-button'>
                <Link to={`/edit/${urlPart}/` + item.id}>
                  <img src={editIcon} />
                </Link>
              </div>
              <div className='elastiquill-icon-button'>
                <a href={url} target='_blank'>
                  <img src={newWindowIcon} />
                </a>
              </div>
              <div onClick={() => this._getStore().setDeleteItemId(item.id)} className='elastiquill-icon-button'>
                <img src={deleteIcon} />
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px' }} className='elastiquill-text elastiquill-text-ellipsis'>
            {item.description || item.content}
          </div>
          <div style={{ marginTop: '16px' }}>
            {item.tags && item.tags.map(t => (
              <div key={t} className='elastiquill-tag'>{t}</div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'flex' }}>
            <div className='elastiquill-text' style={{ flex: 1 }}>
              <img
                style={{ width: 31, height: 31, marginRight: 10 }}
                className='rounded-circle'
                src={api.userAvatarUrl(item.author.email)}
                alt='User Avatar'/>
              {item.author.name}
            </div>
            <div className='elastiquill-text' style={{ fontSize: '16px', opacity: 0.31 }}>
              {moment(item.published_at).format('MMMM DD, YYYY')}
            </div>
          </div>
        </div>
      </div>
    )

    return (
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => this.props.history.push(`/stats/${urlPart}/` + item.id)}>
          {item.title}
          {item.series && <div style={{ marginLeft: 10 }} className='badge badge-secondary'>{item.series}</div>}
        </div>
        <div>
          {this._renderLineItemExtra && this._renderLineItemExtra(item)}
          {item.metadata.is_embed ? (
            <Button
              onClick={() => {
                copyToClipboard(`{{embedContentPage "${item.slug}"}}`);
                toast.success('Copied embed code into clipboard');
              }}
              style={{ marginRight: 10 }}
              color='primary'>Copy embed code
              <i style={{ marginLeft: 5 }} className='fa fa-copy' />
            </Button>
          ) : (
            <a href={url} target='_blank'>
              <Button
                style={{ marginRight: 10 }}
                color='primary'>Open{!_.isEmpty(item.private_viewing_key) && ' (secret URL)'}
                <i style={{ marginLeft: 5 }} className='fa fa-external-link-alt' />
              </Button>
            </a>
          )}
          <Link to={`/edit/${urlPart}/` + item.id}>
            <Button
              style={{ marginRight: 10 }}
              color='primary'>Edit<i style={{ marginLeft: 5 }} className='fa fa-pencil-alt' /></Button>
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
