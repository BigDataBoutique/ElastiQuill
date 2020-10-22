import request from "supertest";

import app from "../app";
import { config } from "../config";

describe("blog.force-https", () => {
  let forceHttpsConfig;
  beforeAll(() => {
    forceHttpsConfig = config.blog["force-https"];
    config.blog["force-https"] = true;
  });

  afterAll(() => {
    config.blog["force-https"] = forceHttpsConfig;
  });

  it("should redirect non-https request to https on force-https", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(301);
    expect(res.request.url).toMatch(new RegExp("^http://"));
    expect(res.header.location).toMatch(new RegExp("^https://"));
    expect(res.redirect).toBe(true);
  });

  it("should not redirect /healthz endpoint", async () => {
    const res = await request(app).get("/healthz");
    expect(res.statusCode).toEqual(200);
    expect(res.redirect).toBe(false);
  });
});
