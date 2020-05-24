$(function() {
  onImgLoad(".post-image>img, .fresh-post__img img, .post-img img", function() {
    if (this.naturalWidth / this.naturalHeight > 2) {
      $(this).css("object-fit", "cover");
    }
  });

  $("time").each(function() {
    $(this).attr("title", new Date($(this).attr("datetime")).toLocaleString());
  });

  $("pre code").each(function() {
    hljs.highlightBlock($(this)[0]);
  });

  if (window.ELASTIQUILL_ITEM_ID) {
    shareSelectedText(".post-page .post-content", {
      tooltipClass: "elastiquill-share-select-text",
      sanitize: true,
      buttons: ["twitter", "facebook"],
      facebookAppID: window.ELASTIQUILL_FACEBOOK_APP_ID,
      facebookDisplayMode: "popup",
      tooltipTimeout: 250,
    });

    $(".elastiquill-share-select-text").prepend(
      makeButton("Contact", function(text) {
        var form = $("<form/>")
          .attr("method", "POST")
          .attr("action", "/contact")
          .append(
            $('<textarea name="contact-form-item-id">').val(
              window.ELASTIQUILL_ITEM_ID
            )
          )
          .append(
            $('<textarea name="contact-form-initial-value">').val(
              quoteText(text)
            )
          );

        $(document.body).append(form);
        form.submit();
      })
    );

    // if comments are enabled
    if ($("#comment-form").length) {
      $(".elastiquill-share-select-text").prepend(
        makeButton("Respond", function(text) {
          var textarea = $("#comment-form textarea");
          textarea.val(quoteText(text) + "\n\n" + textarea.val());
          textarea.focus();
        })
      );
    }
  }

  function quoteText(text) {
    return text
      .split("\n")
      .filter(function(paragraph) {
        return $.trim(paragraph).length > 0;
      })
      .map(function(paragraph) {
        return ">" + paragraph;
      })
      .join("\n");
  }

  function makeButton(label, onClick) {
    var data = { text: "" };
    return $("<div/>")
      .addClass("share-selected-text-btn")
      .css("font-size", "13px")
      .css("cursor", "pointer")
      .html(label)
      .mouseover(function() {
        data.text = getSelectedText();
      })
      .click(function() {
        onClick(data.text);
      });
  }

  function getSelectedText() {
    if (window.getSelection) {
      return window.getSelection().toString();
    } else if (document.selection && document.selection.type !== "Control") {
      return document.selection.createRange().text;
    }
    return "";
  }

  function onImgLoad(selector, callback) {
    $(selector).each(function() {
      var self = this;
      if (self.complete) {
        callback.apply(self);
      } else {
        $(self).on("load", function() {
          callback.apply(self);
        });
      }
    });
  }
});
