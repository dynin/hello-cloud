/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

function initalizeMockGmail() {
  setValue(mailData.authenticate, authenticate);
  setValue(mailData.deauthenticate, deauthenticate);
  setValue(mailData.fetchLabels, fetchLabels);
  setValue(mailData.fetchThreads, fetchThreads);
  setValue(mailData.isInitialized, true);
  setValue(mailData.isOnline, true);
}

function authenticate() {
  if (!getValue(mailData.isAuthenticated)) {
    setValue(mailData.isAuthenticated, true);
    fetchLabels();
    fetchThreads();
  };
}

function deauthenticate() {
  if (getValue(mailData.isAuthenticated)) {
    setValue(mailData.labelsList, null);
    setValue(mailData.threadsList, null);
    setValue(mailData.isAuthenticated, false);
  }
}

function makeMockLabel() {
  const randomInteger = Math.floor(Math.random() * 68) + 1;
  const labelName = "Label " + randomInteger;
  return { name: labelName };
}

function fetchLabels() {
  if (getValue(mailData.isAuthenticated)) {
    const result = new Array();
    // Sometimes there are no labels, to check ListView works
    if (Math.floor(Math.random() * 7) != 0) {
      for (var i = 0; i < 7; ++i) {
        result.push(makeMockLabel());
      }
    }
    setValue(mailData.labelsList, result)
  }
}

function makeMockThread() {
  const randomInteger = Math.floor(Math.random() * 68) + 1;
  const mockSnippet = "Snippet " + randomInteger;
  return { snippet: mockSnippet };
}

function fetchThreads() {
  if (getValue(mailData.isAuthenticated)) {
    const result = new Array();
    // Sometimes there are no labels, to check ListView works
    if (Math.floor(Math.random() * 7) != 0) {
      for (var i = 0; i < 7; ++i) {
        result.push(makeMockThread());
      }
    }
    setValue(mailData.threadsList, result)
  }
}

// Intitialize after a short delay, so that 'Authenticate' button doesn't appear right away
setTimeout(initalizeMockGmail, 500)
