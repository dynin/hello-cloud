/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

// Portions of this code originate from https://developers.google.com/gmail/api/quickstart/js

// Set to client ID and API key from the Developer Console
const CLIENT_ID = "==SECRET_GMAIL_CLIENT_ID==";
const API_KEY = "==SECRET_GMAIL_API_KEY==";

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
function initializeGapiClient() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  }).then(function () {
    gapiInited = true;
    maybeIsInitialized();
  }, requestFailed);
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined later
  });
  gisInited = true;
  maybeIsInitialized();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeIsInitialized() {
  if (gapiInited && gisInited) {
    setValue(mailData.authenticate, authenticate);
    setValue(mailData.deauthenticate, deauthenticate);
    setValue(mailData.fetchLabels, fetchLabels);
    setValue(mailData.fetchThreads, fetchThreads);
    setValue(mailData.isInitialized, true);
    setValue(mailData.isOnline, true);
  }
}

/**
 *  Sign in the user.
 */
function authenticate() {
  tokenClient.callback = (resp) => {
    if (resp.error !== undefined) {
      setValue(mailData.isOnline, false);
      throw (resp);
    }
    setValue(mailData.isOnline, true);
    setValue(mailData.isAuthenticated, true);
    fetchLabels();
    fetchThreads();
  };

  if (gapi.client.getToken() === null) {
    // Prompt the user to select a Google Account and ask for consent to share their data
    // when establishing a new session.
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    // Skip display of account chooser and consent dialog for an existing session.
    tokenClient.requestAccessToken({prompt: ''});
  }
}

/**
 *  Sign out the user.
 */
function deauthenticate() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
    setValue(mailData.labelsList, null);
    setValue(mailData.isAuthenticated, false);
  }
}

function requestFailed(error) {
  setValue(mailData.isOnline, false);
  console.log(error);
}

/**
 * Fetch all user's labels.
 */
function fetchLabels() {
  if (gapi.client.getToken() != null) {
    gapi.client.gmail.users.labels.list({
      'userId': 'me',
    }).then((response) => {
      setValue(mailData.isOnline, true);
      if (getValue(mailData.isAuthenticated)) {
        setValue(mailData.labelsList, response.result.labels);
      }
    }, requestFailed);
  }
}


/**
 * Fetch default message list.
 */
function fetchThreads() {
  if (gapi.client.getToken() != null) {
    gapi.client.gmail.users.threads.list({
      'userId': 'me',
      'maxResults': 20
    }).then((response) => {
      setValue(mailData.isOnline, true);
      if (getValue(mailData.isAuthenticated)) {
        // {"id":"string","snippet":"text","historyId":"number"}
        // TODO: validate the results and handle HTML entities in snippets
        setValue(mailData.threadsList, response.result.threads);
      }
    }, requestFailed);
  }
}
