import { Storage } from '@google-cloud/storage';

export default class MulterGcsStorage {

  constructor(options) {
    this.options = options;
    this.storage = new Storage(options);
    this.bucket = this.storage.bucket(options.bucket);
  }

  _handleFile(req, file, cb) {
    this.options.filename(req, file, (err, filename) => {
      if (err) {
        return cb(err);
      }
      
      file.stream.pipe(this.bucket.file(filename).createWriteStream())
        .on('error', (err) => cb(err))
        .on('finish', (file) => cb(null, {
            path: `https://${this.options.bucket}.storage.googleapis.com/${filename}`,
            filename: filename
          })
        );
    });
  }

  _removeFile() {
    throw new Error('Not implemented');
  }
}