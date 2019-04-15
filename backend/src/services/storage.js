import _ from 'lodash';
import path from 'path';
import AWS from 'aws-sdk';
import uuid from 'uuid/v1';
import multer from 'multer';
import multerS3 from 'multer-s3';
import MulterGoogleCloudStorage from 'multer-google-storage';

import { config } from '../app';

const storage = getStorage();

export function getUploadHandler() {
  if (! storage) {
    return (req, res, next) => next(new Error('Storage for file upload is not configured.'));
  }

  return multer({ storage }).any();
}

function getStorage() {
  const BUCKET_PREFIX = _.get(config, 'blog.uploads-bucket-prefix');
  const GCLOUD_PROJECT_ID = _.get(config, 'credentials.google.gcloud-project-id');
  const GCS_BUCKET = _.get(config, 'credentials.google.gcs-bucket');
  const GCS_KEYFILE = _.get(config, 'credentials.google.gcs-keyfile');
  const S3_BUCKET = _.get(config, 'credentials.aws.s3-bucket');
  const AWS_ACCESS_KEY_ID = _.get(config, 'credentials.aws.access-key-id');
  const AWS_SECRET_ACCESS_KEY = _.get(config, 'credentials.aws.secret-access-key');

  const GCS_AVAILABLE = GCLOUD_PROJECT_ID && GCS_BUCKET && GCS_KEYFILE;
  const S3_AVAILABLE = S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY;

  if (GCS_AVAILABLE) {
    return new MulterGoogleCloudStorage({
      projectId: GCLOUD_PROJECT_ID,
      bucket: GCS_BUCKET,
      keyFilename: GCS_KEYFILE,
      filename: getFilename,
      acl: 'publicread'
    });
  }
  else if (S3_AVAILABLE) {
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      credentials: new AWS.Credentials({
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      })
    });

    return new multerS3({
      s3,
      acl: 'public-read',
      bucket: S3_BUCKET,
      key: getFilename
    });
  }

  return null;

  function getFilename(req, file, cb) {
    const extName = path.extname(file.originalname);
    cb(null, `${BUCKET_PREFIX}${uuid()}${extName}`);
  }  
}