export class AdminEmails {
  constructor(adminEmailsString) {
    this.rules = [];

    if (! adminEmailsString || ! adminEmailsString.length) {
      return;
    }

    this.rules = adminEmailsString.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  isEmpty() {
    return this.rules.length === 0;
  }

  match(email) {
    if (! email) {
      return false;
    }
    for (const rule of this.rules) {
       // first char or none at all
      if (rule.indexOf('@') <= 0) {
        if (rule === '_all_') {
          return true;
        }
        else if (email.endsWith(rule)) {
          return true;
        }
      }
      else if (rule === email) {
        return true;
      }
    }
    return false;
  }
}
