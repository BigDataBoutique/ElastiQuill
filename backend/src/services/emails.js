import Joi from 'joi';
import uid from 'uid';
import md5 from 'md5';
import ellipsize from 'ellipsize';
import MarkdownIt from 'markdown-it';

import { config } from '../app';

const markdown = new MarkdownIt();

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.credentials.sendgrid);

const ContactMessageArgSchema = Joi.object().keys({
  "name": Joi.string().required(),
  "email": Joi.string().email().required(),
  "subject": Joi.string().required(),
  "content": Joi.string().required()
});

const SendNewCommentNotificationArgSchema = Joi.object().keys({
  "opEmail": Joi.string().email().required(),
  "opTitle": Joi.string().required(),
  "opUrl": Joi.string().required(),
  "opComment": Joi.object({
    author: Joi.string().required(),
    email: Joi.string().email().required(),
    content: Joi.string().required(),
    website: Joi.string().allow(''),
  }).optional(),
  "comment": Joi.object({
    author: Joi.string().required(),
    email: Joi.string().email().required(),
    content: Joi.string().required(),
    website: Joi.string().allow(''),
  }).required()
});

export function sendContactMessage(message) {
  const result = Joi.validate(message, ContactMessageArgSchema);
  if (result.error) {
    throw result.error;
  }

  const msg = {
    to: config.blog['contact-email'],
    from: message.email,
    subject: `[Contact] ${message.subject}`,
    html: `<p>From: ${message.name}</p><div>${message.content}</div>`
  };
  sgMail.send(msg);
}

export function sendNewCommentNotification(args) {
  const result = Joi.validate(args, SendNewCommentNotificationArgSchema);
  if (result.error) {
    throw result.error;
  }

  let subject = `New comments under "${args.opTitle}"`;
  if (args.opComment) {
    subject = `Replies to your comment "${ellipsize(args.opComment.content, 20)}"`;
  }

  const msg = {
    to: args.opEmail,
    from: config.blog['comments-noreply-email'],
    subject,
    html: `
    <div>      
      ${args.opComment ? (
        `<h3>New reply to your comment on <a href="${args.opUrl}">blog post</a>:</h3>` + renderComment(args.opComment)
      ) : (
        `<h3>New reply to your post <a href="${args.opUrl}">${args.opTitle}</a></h3>`
      )}
      ${renderComment(args.comment)}
    </div>
    `
  };

  sgMail.send(msg);
}

function renderComment(comment) {
  const website = comment.website ? comment.website : '#';
  return `
    <div style="border: 1px solid #eee; margin: 10px; padding: 10px;">
      <div style="display: flex;">
        <img
          style="border: 1px solid #eee; width: 100px; height:100px;"
          src="https://www.gravatar.com/avatar.php?gravatar_id=${md5(comment.email)}&amp;size=100&amp;default=identicon">
        <p style="margin-left: 10px;">
          ${markdown.render(comment.content)}
        </p>
      </div>
      <br/>
      By: <a href=${website}>${comment.author}</a>
    </div>
  `;
}
