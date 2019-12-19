#!/bin/bash

COMBINED_STATUS=0
DIRS="admin-frontend backend"
for dir in $DIRS; do
  echo
  echo "Checking $dir source"
  (cd $dir && npm run lint)
  DIR_STATUS=$?
  [ $DIR_STATUS -ne 0 ] && COMBINED_STATUS=$DIR_STATUS
done

[ $COMBINED_STATUS -ne 0 ] && exit $DIR_STATUS
exit 0
