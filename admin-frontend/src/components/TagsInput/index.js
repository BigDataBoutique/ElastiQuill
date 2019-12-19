import React, { Component } from "react";
import ReactTags from "react-tag-autocomplete";

import * as api from "../../api";
import "./style.css";

class TagsInputContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: [],
    };

    api.loadAllTags().then(({ tags }) => this.setState({ tags }));
  }

  render() {
    const value = this.props.value || [];
    const tags = value.map(val => ({
      id: val,
      name: val,
    }));

    const suggestions = this.state.tags.map(tag => ({
      name: tag,
    }));

    const handleAddition = tag => {
      this.props.onChange(value.concat(tag.name));
    };

    const handleDelete = index => {
      value.splice(index, 1);
      this.props.onChange(value);
    };

    return (
      <ReactTags
        addOnBlur
        allowNew
        tags={tags}
        suggestions={suggestions}
        minQueryLength={1}
        handleDelete={handleDelete}
        handleAddition={handleAddition}
        value={this.props.value}
        onChange={this.props.onChange}
      />
    );
  }
}

export default TagsInputContainer;
