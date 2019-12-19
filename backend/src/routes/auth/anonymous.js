import { passportDefaultCallback } from "./index";

export default function(passport, router, handleRequest) {
  router.get(
    "/anonymous",
    (req, res, next) => {
      res.locals.authAttemptBackend = "anonymous";
      passportDefaultCallback(
        null,
        req,
        res,
        {
          displayName: "Admin",
          authorizedBy: "_all_",
          emails: [
            {
              value: "admin@elastiquill",
            },
          ],
        },
        next
      );
    },
    handleRequest
  );
}
