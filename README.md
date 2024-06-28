# Hello, Cloud!

Simple programming model for building interactive distributed applications.

## Run the demo application

Install [node.js](https://nodejs.org/en), then launch
[`./start.sh`](https://github.com/dynin/hello-cloud/blob/main/start.sh)
and access [localhost:6868](http://localhost:6868) in the browser.
It displays the state of the application, and has controls to update the state.
When the same page is opened in different browser tabs or windows,
the state of the counter is synchronized without any
effort on the part of the programmer.

## View the source

The application code consists of two parts: the backend and the frontend.
The backend consists of the data schema and the business logic, it is declared in
[`counterdata.js`](https://github.com/dynin/hello-cloud/blob/main/common/counterdata.js).
The source for the front end can be accessed from the running app via 'View Source' link.
Its serialized form can be found in
[`countermain.js`](https://github.com/dynin/hello-cloud/blob/main/client/counter/countermain.js)

The source code is laid out as follows:
- [`common`](https://github.com/dynin/hello-cloud/tree/main/common):
  shared between the client and the server;
- [`server`](https://github.com/dynin/hello-cloud/tree/main/server):
  server-side code;
- [`client`](https://github.com/dynin/hello-cloud/tree/main/client):
  code that runs only on the client.

**If you only look at one file**, make it
[`common/elements.js`](https://github.com/dynin/hello-cloud/blob/main/common/elements.js).
It contains the code that defines the foundation of the programming model.

## Running the demo without a server

The counter application can be run from the filesystem by loading
`client/counter/index.html` via a `file:` URL.  Synchronization
is not supported in this mode.

## The mail demo

In addition to the counter example, there is a begining of a mail app.
[localhost:6868/mail](http://localhost:6868/mail) talks to Gmail API, and
requires an account on `dynin.com` to run.
[localhost:6868/mockmail](http://localhost:6868/mockmail) uses a mock backend;
it can be run from the filesystem.

The main implementation of the mail app is in
[`mailmain.js`](https://github.com/dynin/hello-cloud/blob/main/client/mail/mailmain.js).
The [Gmail API](https://developers.google.com/gmail/api/guides) bridge is in
[`gmail.js`](https://github.com/dynin/hello-cloud/blob/main/client/mail/gmail.js).
The dummy backend is in
[mockmail.js](https://github.com/dynin/hello-cloud/blob/main/client/mail/mockmail.js).

## Feedback

[Let me know what you think!](mailto:misha@dynin.com)
