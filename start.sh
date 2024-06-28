#!/bin/sh

cd `dirname $0`

# secrets.json contains secrets that are not checked into source control.
# It should include at least SYNC_TOKEN.
# For mail client to work, it should have GMAIL_CLIENT_ID and GMAIL_API_KEY.
SECRETS=data/secrets.json
if ! test -f $SECRETS
then
  # The file doesn't exist; create it.
  SYNC_TOKEN=`head -c 42 /dev/urandom | base64`
  echo "{\"SYNC_TOKEN\": \"$SYNC_TOKEN\"}" > $SECRETS
fi

node server/main.js
