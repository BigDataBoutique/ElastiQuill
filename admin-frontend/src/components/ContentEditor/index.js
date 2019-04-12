import _ from 'lodash';
import $ from 'jquery';
import React, {Component} from 'react';

import Showdown from 'showdown';
import TurndownService from 'turndown';
import MediumEditor from 'medium-editor';

import './add-hr-plugin';
import './embeds-patched-plugin';

class TurndownServiceProxy extends TurndownService {
  constructor(...args) {
    super(...args);
  }

  turndown(html) {
    var content = $('<div>' + html + '</div>');
    content.find('.medium-insert-buttons').remove();

    var cleanedHtml = content.html();
    var mediumEmbedHtmls = {};

    content.find('.medium-insert-embeds').toArray().forEach((el, i) => {
      var key = 'MEDIUM-EMBED-' + i;
      mediumEmbedHtmls[key] = el.outerHTML;
      cleanedHtml = cleanedHtml.replace(el.outerHTML, key);
    });

    var markdown = super.turndown(cleanedHtml);

    for (let key in mediumEmbedHtmls) {
      markdown = markdown.replace(key, mediumEmbedHtmls[key]);
    }

    return markdown;
  }
}

const converter = new Showdown.Converter();

class ContentEditor extends Component {
  constructor(props) {
    super(props);
    this.container = React.createRef();
  }

  componentDidMount() {
    this.editor = new MediumEditor(this.container.current);
    if (this.props.contentType === 'html') {
      this.container.current.innerHTML = this.props.value;
    }
    else {
      this.container.current.innerHTML = converter.makeHtml(this.props.value);
    }

    const turndown = new TurndownServiceProxy();
    this.editor.subscribe('editableInput', (event, editable) => {
      if (this.props.contentType === 'html') {
        this.props.onChange(editable.innerHTML);
      }
      else {
        this.props.onChange(turndown.turndown(editable.innerHTML));
      }
    });

    $(this.container.current).mediumInsert({
      editor: this.editor,
      addons: {
        images: false,
        embeds: false,
        embedsPatched: {
          styles: false,
          captions: false,
          oembedProxy: false
        },
        addHr: {
          test: true
        }
      }
    });
    $(this.container.current).removeClass('medium-editor-placeholder');
    $(this.container.current).html($(this.container.current).html());
  }

  componentWillUnmount() {
    this.editor.destroy();
  }

  render() {
    return (
      <div style={{ minHeight: '300px' }} ref={this.container} />
    )
  }
}

export default ContentEditor;
