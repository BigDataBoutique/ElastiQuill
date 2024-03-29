import express from "express";
import asyncHandler from "express-async-handler";

import * as emails from "../services/emails";
import * as recaptcha from "../services/recaptcha";
import * as blogPosts from "../services/blogPosts";
import * as logging from "../services/logging";
import { config } from "../config";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("contact", {
    sidebarWidgetData: res.locals.sidebarWidgetData,
  });
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    if (req.body["contact-form-initial-value"]) {
      res.render("contact", {
        values: {
          item_id: req.body["contact-form-item-id"],
          content: req.body["contact-form-initial-value"] + "\n\n",
        },
        sidebarWidgetData: res.locals.sidebarWidgetData,
      });
      return;
    }

    let recipientEmail = null;

    if (req.body["item_id"]) {
      try {
        const item = await blogPosts.getItemById({ id: req.body["item_id"] });
        if (item) {
          recipientEmail = item.author.email;
        }
      } catch (err) {
        if (err.meta.statusCode !== 404) {
          throw err;
        }
      }
    }

    let error = null;
    let validity = null;

    try {
      if (recaptcha.isAvailable()) {
        const success = await recaptcha.verify(
          req.body["g-recaptcha-response"]
        );
        if (!success) {
          const captchaErr = new Error();
          captchaErr.isRecaptcha = true;
          throw captchaErr;
        }
      }

      const { name, email, subject, content, ...rest } = req.body;
      const extraContent = Object.entries(rest)
        .filter(([key]) => key !== "g-recaptcha-response")
        .map(([key, value]) => `- ${key}: ${value}  \n`)
        .join("");
      const mailContent = `${content ? `${content}  \n` : ""}${extraContent}`;

      logging.logEmail(
        {
          to: recipientEmail || config.blog["contact-email"],
          from: email,
          subject,
          message: mailContent,
        },
        req,
        res
      );
      await emails.sendContactMessage({
        name,
        email,
        subject,
        content: mailContent,
        recipient: recipientEmail,
      });
    } catch (err) {
      if (err.isRecaptcha) {
        error = "Invalid recaptcha";
      } else if (err.isJoi) {
        validity = {};
        err.details.forEach(err => {
          validity[err.path] = "has-error";
        });
        error = "Please fill all required fields";
      } else {
        await logging.logError("contact", err);
        error = "Something went wrong. Try again.";
      }
    }

    res.render("contact", {
      validity,
      sidebarWidgetData: res.locals.sidebarWidgetData,
      error: error,
      values: error ? req.body : null,
      success: !error,
    });
  })
);

export default router;
