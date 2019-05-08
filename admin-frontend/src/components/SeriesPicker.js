import React, {Component} from 'react';
import CreatableReactSelect from 'react-select/lib/Creatable';

import * as api from '../api';

class SeriesPicker extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: [],
      series: []
    };

    const makeOptions = (values, type) => values.map(s => ({
      type,
      label: s,
      value: s
    }));

    api.loadAllTags().then(({ tags, series }) => this.setState({
      tags: makeOptions(tags, 'tag'),
      series: makeOptions(series, 'series')
    }));
  }

  render() {
    let value = null;
    if (this.props.value) {
      if (this.props.includeTags) {
        const { tag, is_series } = this.props.value;
        if (is_series) {
          value = _.find(this.state.series, ['value', tag]);
        }
        else {
          value = _.find(this.state.tags, ['value', tag]);
        }
      }
      else {
        value = _.find(this.state.series, ['value', this.props.value]);
      }
    }

    const onChange = option => {
      if (option) {
        if (this.props.includeTags) {
          this.props.onChange({
            tag: option.value,
            is_series: option.type === 'series'
          });
        }
        else {
          this.props.onChange(option.value);
        }
      }
      else {
        this.props.onChange(option);
      }
    };

    let options = this.state.series;
    if (this.props.includeTags) {
      options = [
        {
          label: 'Series',
          options: this.state.series
        },
        {
          label: 'Tags',
          options: this.state.tags
        }
      ];
    }

    return (
      <div style={{ width: '100%' }}>
        <CreatableReactSelect
          isClearable
          isDisabled={this.props.disabled}
          placeholder={this.props.placeholder || 'Series'}
          styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
          menuPortalTarget={document.body}
          options={options}
          value={value}
          onChange={onChange} />
      </div>
    )
  }
}

export default SeriesPicker;
