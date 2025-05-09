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
  setValue(mailData.syncStatus, SyncStatus.NOT_AUTHENTICATED);
}

function authenticate() {
  if (getValue(mailData.syncStatus) == SyncStatus.NOT_AUTHENTICATED) {
    setValue(mailData.syncStatus, SyncStatus.ONLINE);
    fetchLabels();
    fetchThreads();
  };
}

function deauthenticate() {
  if (getValue(mailData.syncStatus) == SyncStatus.ONLINE) {
    setValue(mailData.labelsList, null);
    setValue(mailData.threadsList, null);
    setValue(mailData.syncStatus, SyncStatus.NOT_AUTHENTICATED);
  }
}

function makeMockLabel() {
  const randomInteger = Math.floor(Math.random() * 68) + 1;
  const labelName = "Label " + randomInteger;
  return new Label(labelName);
}

function fetchLabels() {
  if (getValue(mailData.syncStatus) == SyncStatus.ONLINE) {
    const result = new Array();
    // Sometimes there are no labels, to check ListView works
    if (Math.floor(Math.random() * 7) != 0) {
      for (var i = 0; i < 7; ++i) {
        result.push(makeMockLabel());
      }
    }
    setValue(mailData.labelsList, new List(result, LabelType));
  }
}

function makeMockThread() {
  const randomInteger = Math.floor(Math.random() * 68) + 1;
  const mockSnippet = "Snippet " + randomInteger;
  return new Thread(mockSnippet);
}

function fetchThreads() {
  if (getValue(mailData.syncStatus) == SyncStatus.ONLINE) {
    const result = new Array();
    // Sometimes there are no labels, to check ListView works
    if (Math.floor(Math.random() * 7) != 0) {
      for (var i = 0; i < 7; ++i) {
        result.push(makeMockThread());
      }
    }
    setValue(mailData.threadsList, new List(result, ThreadType));
  }
}

// Intitialize after a short delay, so that 'Authenticate' button doesn't appear right away
setTimeout(initalizeMockGmail, 500)
