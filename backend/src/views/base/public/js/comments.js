function onClickReply(btn) {
  var commentForm = $("#comment-form");
  commentForm.detach();

  if (btn) {
    var parents = $(btn).parentsUntil("#comments-container", ".comment");
    var recipientCommentId = parents.eq(parents.length - 1).data("id");

    if (parents.length) {
      parents.eq(0).after(commentForm);
    } else {
      $(btn)
        .closest(".comment")
        .find(".replies-container")
        .eq(0)
        .prepend(commentForm);
    }

    $("#recipient-hidden-input").val(recipientCommentId);
    $(".cancel-comment").show();
  } else {
    $("#comments-container").append(commentForm);
    $("#recipient-hidden-input").val("");
    $(".cancel-comment").hide();
  }

  commentForm.show();
}

$(function() {
  if (window.COMMENTS_RECIPIENT_COMMENT_ID) {
    var commentForm = $("#comment-form");
    commentForm.detach();

    var res = $("[data-id=" + window.COMMENTS_RECIPIENT_COMMENT_ID + "]");
    res.find(".replies-container").append(commentForm);
    commentForm
      .find("#recipient-hidden-input")
      .val(window.COMMENTS_RECIPIENT_COMMENT_ID);
  }

  if (window.COMMENTS_ERROR && window.COMMENTS_ERROR.length) {
    $("#comment-form").show();

    if (!window.COMMENTS_RECIPIENT_COMMENT_ID.length) {
      $("#btn-add-comment").hide();
    }
  }
});
