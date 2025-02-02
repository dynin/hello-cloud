/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

function notInitialized() {
  panic("mailData not initialized");
}

const mailData = makeDatastore("mail", {
  labelsList: makeBoxed(null, ListOrNullType),
  threadsList: makeBoxed(null, ListOrNullType),
  authenticate: makeBoxed(notInitialized, FunctionType),
  deauthenticate: makeBoxed(notInitialized, FunctionType),
  fetchLabels: makeBoxed(notInitialized, FunctionType),
  fetchThreads: makeBoxed(notInitialized, FunctionType),
});

function main() {
  function renderMessage(message) {
    return makeTextView(message.snippet, Styles.Snippet);
  }

  setRootView(
    makeContainerView(
      makeTextView("Hello, Cloud: Email", Styles.Header),
      makeVisibleView(
        makeButtonView("Authenticate", mailData.authenticate),
        andOp(mailData.isInitialized, notOp(mailData.isAuthenticated))),
      makeVisibleView(
        makeContainerView(
          makeButtonView("Reload", mailData.fetchThreads),
          makeButtonView("Sign Out", mailData.deauthenticate, Styles.RedText),
          makeListView(mailData.threadsList,
              renderMessage,
              makeTextView("No messages", Styles.NoMessages))
        ),
        mailData.isAuthenticated),
      makeStatusView(mailData)
    )
  );
}
