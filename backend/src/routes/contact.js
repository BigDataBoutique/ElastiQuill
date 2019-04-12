import express from 'express';
import asyncHandler from 'express-async-handler';

import * as emails from '../services/emails';
import * as recaptcha from '../services/recaptcha';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('contact', {
    sidebarWidgetData: res.locals.sidebarWidgetData,
    recaptchaClientKey: recaptcha.clientKey()
  });
});

router.post('/', asyncHandler(async (req, res) => {
  let error = null;
  let validity = null;

  try {
    if (recaptcha.isAvailable()) {
      const success = await recaptcha.verify(req.body['g-recaptcha-response']);
      if (! success) {
        const captchaErr = new Error();
        captchaErr.isRecaptcha = true;
        throw captchaErr;
      }
    }    

    await emails.sendContactMessage({
      name: req.body['name'],
      email: req.body['email'],
      subject: req.body['subject'],
      content: req.body['content']
    });
  }
  catch (err) {
    if (err.isRecaptcha) {
      error = 'Invalid recaptcha';
    }    
    else if (err.isJoi) {
      validity = {};
      err.details.forEach(err => {
        validity[err.path] = 'has-error';
      });
      error = 'Please fill all required fields';
    }
    else {
      throw err;
    }
  }

  res.render('contact', {
    validity,
    sidebarWidgetData: res.locals.sidebarWidgetData,
    recaptchaClientKey: recaptcha.clientKey(),
    error: error,
    values: error ? req.body : null,
    success: ! error
  });
}));

export default router;
