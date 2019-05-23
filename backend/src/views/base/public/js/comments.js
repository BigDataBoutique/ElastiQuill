function onClickReply(btn) {
  var commentForm = $("#comment-form");
  commentForm.detach();

  if (btn) {
    var parents = $(btn).parentsUntil('#comments-container', '.comment');
    var path = [];
    for (var i = 0; i < parents.length; ++i) {
      if (i === parents.length - 1) {
        path.push(parents.eq(i).data('id'));
      }
      else {
        path.push(parents.eq(i).data('index'));
      }
    }
    path.reverse();

    $(btn).closest('.comment').find('.replies-container').eq(0).prepend(commentForm);
    $('#recipient-hidden-input').val(JSON.stringify(path));
    $('.cancel-comment').show();
  }
  else {
    $('#comments-container').append(commentForm);
    $('#recipient-hidden-input').val('');
    $('.cancel-comment').hide();
  }

  commentForm.show();
}

$(function() {
  var commentFormPath = null;
  try { commentFormPath = JSON.parse(COMMENTS_RECIPIENT_PATH); } catch {}
  if (commentFormPath) {
    var commentForm = $("#comment-form");
    commentForm.detach();

    var res = $("[data-id="+commentFormPath[0]+"]");
    var indices = commentFormPath.slice(1);
    for (var i = 0; i < indices.length; ++i) {
      res = res.find("[data-index="+indices[i]+"]").first();
    }
    res.find('.list-unstyled').eq(0).prepend(commentForm);
    commentForm.find('#recipient-hidden-input').val(COMMENTS_RECIPIENT_PATH);
  }

  if (COMMENTS_ERROR.length) {
    $("#comment-form").show();

    if (! COMMENTS_RECIPIENT_PATH.length) {
      $("#btn-add-comment").hide();
    }
  }
});
