import _ from "lodash";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

import { config } from "../../app";

const jwtSecret = _.get(config, "blog.jwt-secret");
if (!jwtSecret) {
  throw new Error("blog.jwt-secret configuration variable is not set");
}

export default function(passport) {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromExtractors([
          ExtractJwt.fromUrlQueryParameter("state"),
          ExtractJwt.fromAuthHeaderAsBearerToken(),
        ]),
        secretOrKey: jwtSecret,
      },
      (jwtPayload, done) => done(null, jwtPayload.user)
    )
  );
}
