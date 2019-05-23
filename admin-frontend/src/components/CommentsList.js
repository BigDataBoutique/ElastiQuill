import React from 'react';
import md5 from 'md5'

function CommentsList(props) {
  const { comments } = props;
  if (! comments.length) {
    return 'No comments';
  }

  return (
    <div>
      {comments.map((comment, i) => (
        <div key={comment.comment_id}>
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
                </div>
              </div>
              <div dangerouslySetInnerHTML={{ __html: comment.content }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            Commented on post <a target='_blank' href={comment.post_url}>"{comment.post_title}"</a>
          </div>
          {i + 1 !== comments.length && <hr />}
        </div>
      ))}
    </div>
  )
}

export default CommentsList;
