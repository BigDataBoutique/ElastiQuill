import React from 'react';
import md5 from 'md5'

function CommentsList(props) {
  const { comments } = props;
  if (! comments.length) {
    return 'No comments';
  }

  return (
    <div>
      {comments.map(comment => (
        <div className='card card-body p-2' key={comment.comment_id}>
          <div style={{ display: 'flex', flexFlow: 'row' }}>
            <img
              style={{ width: 64, height: 64, marginRight: 10 }}
              src={`https://gravatar.com/avatar/${md5(comment.author.email)}?size=100&default=identicon`} />
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
          <hr style={{ marginBottom: 5 }} />
          <div>
            Commented on post <a target='_blank' href={comment.post_url}>"{comment.post_title}"</a>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CommentsList;
