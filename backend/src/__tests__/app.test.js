import request from "supertest";
import fs from "fs";
import { config } from "../config";

jest.mock("@google-cloud/storage");

const originalReadFileSync = fs.readFileSync;

// Mock the Google credentials file read
jest.spyOn(fs, "readFileSync").mockImplementation((filePath, ...args) => {
  if (filePath.includes("google-credentials.json")) {
    return JSON.stringify({
      project_id: "mock-project",
      private_key_id: "mock-key-id",
      private_key: "mock-private-key",
      client_email: "mock@mock-project.iam.gserviceaccount.com",
      client_id: "mock-client-id",
    });
  }
  return originalReadFileSync(filePath, ...args);
});

const app = require("../app").default;

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
    expect(res.request.url).toMatch(/^http:\/\//);
    expect(res.header.location).toMatch(/^https:\/\//);
    expect(res.redirect).toBe(true);
  });

  it("should not redirect /healthz endpoint", async () => {
    const res = await request(app).get("/healthz");
    expect(res.statusCode).toEqual(200);
    expect(res.redirect).toBe(false);
  });
});
