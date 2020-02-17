import _ from "lodash";
import $ from "jquery";
import moment from "moment";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonGroup } from "reactstrap";

import defaultItemImage from "../assets/img/default-post-image.jpg";
import LoggedInLayout from "../components/LoggedInLayout";
import ConfirmModal from "../components/ConfirmModal";
import FAIcon from "../components/FAIcon";
import HoverIcon from "../components/Icons/HoverIcon";
import SvgEdit from "../components/Icons/SvgEdit";
import SvgDelete from "../components/Icons/SvgDelete";
import SvgNewWindow from "../components/Icons/SvgNewWindow";
import * as api from "../api";

class BaseItemsPage extends Component {
  _renderContent(strings, store) {
    const { isLoading } = store;

    const toolbar = (
      <div style={{ lineHeight: "38px", width: "100%" }}>
        <div style={{ display: "inline-block", float: "left" }}>
          {this._renderLeftNav && this._renderLeftNav()}
        </div>
        <Link to={`/new/${strings.urlPart}`}>
          <FAIcon icon="plus" style={{ marginRight: "12px" }} />
          {strings.newItem}
        </Link>
        {this._renderNav && this._renderNav()}
      </div>
    );

    return (
      <LoggedInLayout pageTitle={strings.title} toolbar={toolbar}>
        <div className="elastiquill-content">
          {isLoading ? "Loading..." : this._renderItems(strings, store)}
        </div>
        {this._renderDeleteItemModal(store)}
      </LoggedInLayout>
    );
  }

  _renderItems(strings, store) {
    const { totalPages } = store;
    if (totalPages === 0) {
      return (
        <div>
          {store.isSearchResult
            ? "Nothing matched your search"
            : strings.noItems}
        </div>
      );
    }

    return (
      <div>
        <div>
          {store.items.map((item, i) => {
            return <div key={i}>{this._renderLineItem(item)}</div>;
          })}
        </div>
        {this._renderPagination(store)}
      </div>
    );
  }

  _renderLineItem(item) {
    const url = `${item.url}${
      _.isEmpty(item.metadata.private_viewing_key)
        ? ""
        : "?secret=" + item.metadata.private_viewing_key
    }`;
    const urlPart = this._getUrlPart();
    const imageSrc =
      _.get(
        item,
        "draft.metadata.header_image_url",
        item.metadata.header_image_url
      ) || defaultItemImage;

    const onClick = ev => {
      if ($(ev.target).closest(".elastiquill-icon-button").length) {
        return;
      }
      this.props.history.push(`/stats/${urlPart}/` + item.id);
    };

    const image =
      item.type === "post" ? (
        <img
          src={imageSrc}
          style={{ width: "170px", height: "153px", objectFit: "cover" }}
        />
      ) : (
        false
      );

    return (
      <div
        className="elastiquill-card"
        onClick={onClick}
        style={{ display: "flex", marginBottom: "24px", cursor: "pointer" }}
      >
        {image}
        <div
          style={{
            display: "flex",
            flexFlow: "column",
            flex: 1,
            minWidth: "0px",
            paddingLeft: image ? "33px" : undefined,
          }}
        >
          <div style={{ display: "flex" }}>
            {this._renderItemTitle(item)}
            <div style={{ display: "flex" }}>
              {this._renderLineItemExtra && this._renderLineItemExtra(item)}
              {item.is_editable && (
                <div className="elastiquill-icon-button">
                  <Link to={`/edit/${urlPart}/` + item.id}>
                    <HoverIcon icon={SvgEdit} />
                  </Link>
                </div>
              )}
              <div className="elastiquill-icon-button">
                <a href={url} target="_blank">
                  <HoverIcon icon={SvgNewWindow} />
                </a>
              </div>
              {item.is_editable && (
                <div
                  onClick={() => this._getStore().setDeleteItemId(item.id)}
                  className="elastiquill-icon-button"
                >
                  <HoverIcon icon={SvgDelete} />
                </div>
              )}
            </div>
          </div>
          <div
            style={{ marginTop: "10px" }}
            className="elastiquill-text elastiquill-text-ellipsis"
          >
            {item.description || _.get(item, "draft.content", item.content)}
          </div>
          <div style={{ marginTop: "16px" }}>
            {item.series && (
              <div style={{ marginRight: 10 }} className="elastiquill-series">
                {item.series}
              </div>
            )}
            {item.tags &&
              item.tags.map(t => (
                <div key={t} className="elastiquill-tag">
                  {t}
                </div>
              ))}
          </div>
          <div style={{ marginTop: "auto", display: "flex" }}>
            <div className="elastiquill-text" style={{ flex: 1 }}>
              <img
                style={{ width: 31, height: 31, marginRight: 10 }}
                className="rounded-circle"
                src={api.userAvatarUrl(item.author.email)}
                alt="User Avatar"
              />
              {item.author.name}
            </div>
            <div
              className="elastiquill-text"
              style={{ fontSize: "16px", opacity: 0.31 }}
            >
              {moment(item.published_at).format("MMMM DD, YYYY")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  _renderItemTitle(item) {
    const badge = label => (
      <span
        className="badge badge-secondary"
        style={{ fontSize: 12, marginLeft: 5, position: "relative", top: -3 }}
      >
        {label}
      </span>
    );

    return (
      <div
        style={{ flex: 1, paddingRight: 10 }}
        className="elastiquill-header-2 elastiquill-text-ellipsis"
      >
        {_.get(item, "draft.title", item.title)}
        {item.draft && badge("Draft")}
        {item.is_published === false && badge("Not published")}
      </div>
    );
  }

  _renderPagination(store) {
    const { pageIndex, totalPages } = store;
    const setPage = dir => () => store.loadPage(pageIndex + dir);

    return (
      <div style={{ marginTop: 10, display: "flex" }}>
        <ButtonGroup>
          <Button onClick={setPage(-1)} disabled={pageIndex == 0}>
            Prev
          </Button>
          <Button onClick={setPage(+1)} disabled={pageIndex + 1 >= totalPages}>
            Next
          </Button>
        </ButtonGroup>
        <div style={{ marginTop: 8, marginLeft: 5 }}>
          Page {pageIndex + 1} of {totalPages}
        </div>
      </div>
    );
  }

  _renderDeleteItemModal(store) {
    return (
      <ConfirmModal
        label="Are you sure you want to delete selected item?"
        isOpen={store.deleteItemId !== null}
        onRequestClose={() => store.setDeleteItemId(null)}
        onSubmitClicked={() => this._onDeleteItem()}
        isDisabled={store.isItemDeleting}
        submitLabel={store.isItemDeleting ? "Loading..." : "Delete"}
        submitColor="danger"
      />
    );
  }
}

export default BaseItemsPage;
