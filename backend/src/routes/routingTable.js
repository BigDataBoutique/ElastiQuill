import _ from "lodash";
import express from "express";
import { routingTable } from "../app";

const router = express.Router();

if (routingTable) {
  _.forOwn(routingTable, (opts, route) => {
    const { new_route, http_status_code } = opts;
    if (!new_route) {
      console.error("Routing table", route, "ignored");
      return;
    }

    let statusCode = null;
    switch (http_status_code) {
      case "MovedPermanently":
        statusCode = 301;
        break;
      case "SeeOther":
        statusCode = 303;
        break;
      default:
        statusCode = http_status_code || 301;
    }

    router.get(route, (req, res) => res.redirect(statusCode, new_route));
  });
}

export default router;
