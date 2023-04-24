import fs from "fs";
import path from "path";
import _ from "lodash";

export class EmailString {
  constructor(emailString) {
    this.rules = [];

    if (!emailString || !emailString.length) {
      return;
    }

    this.rules = emailString
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  isEmpty() {
    return this.rules.length === 0;
  }

  getRules() {
    return this.rules;
  }

  isMatchAll() {
    for (const rule of this.rules) {
      if (rule === "_all_") return true;
    }
    return false;
  }

  match(email) {
    if (!email) {
      return false;
    }
    for (const rule of this.rules) {
      // first char or none at all
      if (rule.indexOf("@") <= 0) {
        if (rule === "_all_") {
          return rule;
        } else if (email.endsWith(rule)) {
          return rule;
        }
      } else if (rule === email) {
        return rule;
      }
    }
    return false;
  }
}

export function getErrorStatus(err) {
  return err.status || _.get(err, "meta.statusCode") || 500;
}

export function copyFilesSync(source, destination) {
  const files = fs.readdirSync(source);

  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destinationPath = path.join(destination, file);

    const stats = fs.statSync(sourcePath);

    if (stats.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    } else if (stats.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copyFilesSync(sourcePath, destinationPath);
    }
  }
}
