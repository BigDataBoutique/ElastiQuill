import React, {Component} from 'react';
import ReactTags from 'react-tag-autocomplete';

import * as api from '../../api';
import './style.css';

class TagsInputContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: []
    };

    api.loadAllTags().then(({ tags }) => this.setState({ tags }));
  }

  render() {
    const value = this.props.value || [];
    const tags = value.map(val => ({
      id: val,
      name: val
    }));

    const suggestions = this.state.tags.map(tag => ({
      name: tag
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
        renderInput={this._autosuggestRenderInput.bind(this)}
        tags={tags}
        suggestions={suggestions}
        allowNew={true}
        minQueryLength={1}
        handleDelete={handleDelete}
        handleAddition={handleAddition}
        value={this.props.value}
        onChange={this.props.onChange} />
    )
  }

  _autosuggestRenderInput({addTag, ...props}) {
    const handleOnChange = (e, {newValue, method}) => {
      if (method === 'enter') {
        e.preventDefault()
      } else {
        props.onChange(e)
      }
    }

    const inputValue = (props.value && props.value.trim().toLowerCase()) || ''
    const inputLength = inputValue.length

    const suggestions = ['Aaa', 'Aaabbb', 'bbbb', 'asdfawf'];

    return (
      <Autosuggest
        ref={props.ref}
        suggestions={suggestions}
        shouldRenderSuggestions={(value) => value && value.trim().length > 0}
        getSuggestionValue={(suggestion) => suggestion}
        renderSuggestion={(suggestion) => <span>{suggestion}</span>}
        inputProps={{...props, onChange: handleOnChange}}
        onSuggestionSelected={(e, {suggestion}) => {
          addTag(suggestion.name)
        }}
        onSuggestionsClearRequested={() => {}}
        onSuggestionsFetchRequested={() => {}}
      />
    )
  }
}

export default TagsInputContainer;
