import express from 'express';
import asyncHandler from 'express-async-handler';

import * as emails from '../services/emails';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('contact', {
    sidebarWidgetData: res.locals.sidebarWidgetData
  });
});

router.post('/', asyncHandler(async (req, res) => {
  let error = null;
  let validity = null;

  try {
    const resp = await emails.sendContactMessage(req.body);
  }
  catch (err) {
    if (err.isJoi) {
      validity = {};
      err.details.forEach(err => {
        validity[err.path] = 'has-error';
      });
      error = 'Please fill all required fields';
    }
    else {
      error = 'Server Error';
      console.error(err);
    }
  }

  res.render('contact', {
    sidebarWidgetData: res.locals.sidebarWidgetData,
    validity,
    error: error,
    values: error ? req.body : null,
    success: ! error
  });
}));

export default router;
