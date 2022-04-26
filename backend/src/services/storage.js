import fs from "fs";
import _ from "lodash";
import path from "path";
import AWS from "aws-sdk";
import { v1 as uuid } from "uuid";
import multer from "multer";
import mime from "mime-types";
import multerS3 from "multer-s3";
import { Storage as GCSStorage } from "@google-cloud/storage";
import MulterGcsStorage from "../lib/multer-gcs-storage";

import { config } from "../config";

let configuredStorageName = null;
let errors = {};

const BUCKET_PREFIX = _.get(config, "blog.uploads-bucket-prefix");
const GCS_BUCKET = _.get(config, "credentials.google.gcs-bucket");
const GCS_KEYFILE = _.get(config, "credentials.google.gcs-keyfile");
const S3_BUCKET = _.get(config, "credentials.aws.s3-bucket");
const AWS_ACCESS_KEY_ID = _.get(config, "credentials.aws.access-key-id");
const AWS_SECRET_ACCESS_KEY = _.get(
  config,
  "credentials.aws.secret-access-key"
);

const GCS_AVAILABLE = GCS_BUCKET && GCS_KEYFILE;
const S3_AVAILABLE = S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY;

export function getStatus() {
  return {
    backend: configuredStorageName,
    errors,
  };
}

export function getUploadHandler(storageOpts) {
  let uploadHandler = null;

  getStorage(storageOpts)
    .then(storage => {
      if (storage) {
        uploadHandler = multer({ storage }).any();
      }
    })
    .catch(err => console.log(`Failed to configure storage: ${err.message}`));

  return async (req, res, next) => {
    if (!uploadHandler) {
      next(new Error("Storage for file upload is not configured."));
      return;
    }

    return uploadHandler(req, res, next);
  };
}

async function getStorage(opts) {
  if (GCS_AVAILABLE) {
    try {
      const storage = await getGCSStorage(opts);
      configuredStorageName = "gcs";
      return storage;
    } catch (err) {
      errors["gcs"] = err.message;

      if (!S3_AVAILABLE) {
        throw err;
      }
    }
  }

  if (S3_AVAILABLE) {
    try {
      const storage = await getS3Storage(opts);
      configuredStorageName = "s3";
      return storage;
    } catch (err) {
      errors["s3"] = err.message;
      throw err;
    }
  }

  return null;
}

async function getGCSStorage(opts) {
  let projectId = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(GCS_KEYFILE).toString());
    projectId = parsed.project_id;
  } catch (err) {
    throw new Error(`Failed to read GCS keyfile ${GCS_KEYFILE}`);
  }

  const gcsStorage = new GCSStorage({
    projectId,
    keyFilename: GCS_KEYFILE,
  });

  let results = null;
  try {
    results = await gcsStorage.bucket(GCS_BUCKET).iam.getPolicy();
  } catch (ignored) {
    // Ignored
  }

  if (results !== null) {
    const found = _.find(results[0].bindings, [
      "role",
      "roles/storage.objectViewer",
    ]);
    if (!found || !found.members.includes("allUsers")) {
      throw new Error(
        `Bucket ${GCS_BUCKET} is not configured for public access.`
      );
    }
  }

  return new MulterGcsStorage({
    projectId,
    bucket: GCS_BUCKET,
    keyFilename: GCS_KEYFILE,
    filename: getFilename.bind(this, opts),
    contentType: getContentType.bind(this, opts),
  });
}

async function getS3Storage(opts) {
  const s3 = new AWS.S3({
    apiVersion: "2006-03-01",
    credentials: new AWS.Credentials({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    }),
  });

  return new multerS3({
    s3,
    acl: "public-read",
    bucket: S3_BUCKET,
    key: getFilename.bind(this, opts),
  });
}

async function getFilename(opts, req, file, cb) {
  const extName = path.extname(file.originalname);
  let filenamePrefix;
  if (opts.filenamePrefix) {
    try {
      filenamePrefix = await opts.filenamePrefix(req, file);
    } catch (err) {
      cb(err);
      return;
    }
  }

  filenamePrefix = filenamePrefix || "";
  cb(null, `${BUCKET_PREFIX}${filenamePrefix}${uuid()}${extName}`);
}

function getContentType(opts, req, file, cb) {
  cb(null, mime.lookup(file.originalname));
}
