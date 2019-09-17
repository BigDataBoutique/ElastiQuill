import React from 'react';
import { Badge } from 'reactstrap';
import { toast } from 'react-toastify';

import ConfirmModal from './ConfirmModal';
import * as api from '../api';

export default class CommentsList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      spamModalComment: null,
      deleteModalComment: null,
      isLoading: false
    };
  }

  render() {
    const { comments } = this.props;
    if (! comments.length) {
      return 'No comments';
    }

    return (
      <div>
        {comments.map((comment, i) => (
          <div key={comment.comment_id}>
            {this._renderComment(comment, i + 1 === comments.length)}
          </div>
        ))}
        {this._renderSpamModal()}
        {this._renderDeleteModal()}
      </div>
    )
  }

  _renderComment(comment, isLast, parentPath = []) {
    const isRoot = parentPath.length === 0;
    comment.path = parentPath.concat(comment.id || comment.comment_id);

    return (
      <React.Fragment>
        <div style={{ display: 'flex', flexFlow: 'row' }}>
          <img
            style={{ width: 64, height: 64, marginRight: 10 }}
            src={comment.author.avatar} />
          <div style={{ flex: 1 }}>
            <div>
              {comment.author.name}
              <div style={{ float: 'right' }}>
                <a target='_blank' href={comment.url}>
                  {new Date(comment.published_at).toLocaleString()}
                </a>
                {this._renderCommentButtons(comment)}
              </div>
            </div>
            <div dangerouslySetInnerHTML={{ __html: comment.content }} />
          </div>
        </div>
        {isRoot && !this.props.hidePostLink && (
        <div style={{ marginTop: 10 }}>
          Commented on post <a target='_blank' href={comment.post_url}>"{comment.post_title}"</a>
        </div>
        )}
        {this.props.treeView && comment.replies.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {comment.replies.map((reply, i) => (
            <div key={reply.comment_id} style={{ marginLeft: 20 }}>
              {this._renderComment(reply, i + 1 === comment.replies.length, comment.path)}
            </div>
          ))}
        </div>
        )}
        {! isLast && <hr />}
      </React.Fragment>
    )
  }

  _renderSpamModal() {
    const onSubmitClicked = async () => {
      try {
        const comment = this.state.spamModalComment;

        this.setState({ isLoading: true });
        await api.updateCommentIsSpam(comment.path, false);
        toast.success('Comment published');
        this.props.requestReload();
      }
      catch (err) {
        toast.error('Failed to publish the comment');
        console.log(err);
      }
      finally {
        this.setState({
          spamModalComment: null,
          isLoading: false
        });
      }
    };

    const onRequestClose = () => this.setState({ spamModalComment: null });

    return (
      <ConfirmModal
        label='Are you sure you want to publish selected comment?'
        isOpen={this.state.spamModalComment !== null}
        onSubmitClicked={onSubmitClicked}
        onRequestClose={onRequestClose}
        isDisabled={this.state.isLoading} 
        submitLabel='Publish'
        submitColor='primary'
      />
    )
  }
  
  _renderDeleteModal() {
    const onSubmitClicked = async () => {
      try {
        const comment = this.state.deleteModalComment;

        this.setState({ isLoading: true });
        await api.deleteComment(comment.path);
        toast.success('Comment is deleted');
        this.props.requestReload();
      }
      catch (err) {
        toast.error('Failed to remove the comment');
        console.log(err);
      }
      finally {
        this.setState({
          deleteModalComment: null,
          isLoading: false
        });
      }
    };

    const onRequestClose = () => this.setState({ deleteModalComment: null });

    return (
      <ConfirmModal
        label='Are you sure you want to delete this comment?'
        isOpen={this.state.deleteModalComment !== null}
        onSubmitClicked={onSubmitClicked}
        onRequestClose={onRequestClose}
        isDisabled={this.state.isLoading} 
        submitLabel={this.state.isLoading ? 'Deleting...' : 'Delete'}
        submitColor='danger'
      />
    )
  }

  _renderCommentButtons(comment) {
    if (! this.props.showButtons) {
      return false;
    }

    const onSpamToggle = () => this.setState({
      spamModalComment: comment
    });

    const onDeleteComment = () => this.setState({
      deleteModalComment: comment
    });

    return (
      <div style={{ textAlign: 'right' }}>
        {comment.spam && (
          <Badge color='dark' onClick={onSpamToggle} style={{ cursor: 'pointer' }}>
            Marked as spam
          </Badge>
        )}
        <Badge color='danger' onClick={onDeleteComment} style={{ cursor: 'pointer', marginLeft: 5 }}>
          <i className='fas fa-trash-alt' />
        </Badge>
      </div>
    )
  }
}