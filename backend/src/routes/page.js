import _ from "lodash";
import express from "express";
import asyncHandler from "express-async-handler";
import * as blogPosts from "../services/blogPosts";
import { preparePage } from "./util";
const router = express.Router();

router.get(
  "/:slug",
  asyncHandler(async (req, res, next) => {
    let page;
    try {
      page = await blogPosts.getItemById({ id: req.params.slug });

      if (!page) {
        throw {
          status: 404,
        };
      }
    } catch (err) {
      next();
      return;
    }

    if (page.metadata.is_embed || page.metadata.is_tag_description) {
      next();
      return;
    }

    res.locals.logData = {
      read_item: {
        id: req.params.slug,
        type: "page",
        slug: page.slug,
      },
    };

    if (!_.isEmpty(page.private_viewing_key)) {
      if (page.private_viewing_key !== req.query.secret) {
        res.status(404).render("error", {
          message: "Page not found",
          error: {
            status: 404,
          },
        });
        return;
      }
    }

    res.render("page", {
      isContentPage: true,
      headerImageUrl: page.metadata.header_image_url,
      title: page.title,
      description: page.description,
      page: preparePage(page),
    });
  })
);

export default router;
