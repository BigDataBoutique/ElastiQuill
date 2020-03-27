#!/bin/bash

echo
echo "Running backend tests"
(cd backend && npm test)
BACKEND_STATUS=$?

[ $BACKEND_STATUS -ne 0 ] && exit $BACKEND_STATUS
exit 0