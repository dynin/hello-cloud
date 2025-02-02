/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const HOSTNAME = "0.0.0.0";
const PORT = 6868;

const fs = require("fs");
const vm = require("vm");
const http = require("http");
const querystring = require("querystring");

function loadCommonModule(moduleName) {
  const app = fs.readFileSync("common/" + moduleName + ".js");
  vm.runInThisContext(app);
}

loadCommonModule("elements");
loadCommonModule("reflection");
loadCommonModule("datastore");
loadCommonModule("counterdata");
loadCommonModule("protocol");

const SECRETS_FILENAME = "data/secrets.json";
const DATA_FILENAME = "data/counter.json";

const SECRET_START = "==SECRET_";
const SECRET_END = "==";

const redirects = new Map();
redirects.set("/", "/client/counter/");
redirects.set("/mail", "/client/mail/");
redirects.set("/mockmail", "/client/mail/mockmail.html");

const mimeTypes = new Map();
mimeTypes.set("html", "text/html");
mimeTypes.set("js", "text/javascript");
mimeTypes.set("css", "text/css");

class Server {
  constructor(datastore) {
    this.datastore = datastore;
  }

  start(hostname, port) {
    this.secrets = this.loadSecrets();
    this.syncToken = this.secrets["SYNC_TOKEN"];
    this.loadData(DATA_FILENAME);
    const httpServer = http.createServer(
        (request, response) => this.processRequest(request, response));
    httpServer.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
  }

  processRequest(request, response) {
    const url = request.url;
    console.log(`Serving "${url}"`);

    if (redirects.has(url)) {
      return this.redirect(redirects.get(url), response);
    } else if (url == "/favicon.ico") {
      return this.respondWithStatus(204, response);
    } else if (url == SYNC_ENDPOINT) {
      return this.processSync(request, response);
    }

    var path = url.substring(1);
    if (path.endsWith('/')) {
      path = path + "index.html";
    }

    // Sanity/security checks on the URL
    if (!path.startsWith("common/") && !path.startsWith("client/")) {
      return this.respondWithStatus(403, response);
    }
    const dot = path.lastIndexOf('.');
    if (dot < 0 || path.lastIndexOf('.', dot - 1) > 0) {
      return this.respondWithStatus(403, response);
    }

    if (!fs.existsSync(path)) {
      return this.respondWithStatus(404, response);
    }

    fs.readFile(path, (error, data) => {
      if (error) {
        return this.respondWithStatus(500, response);
      }

      data = this.expandSecrets(data.toString());
      const extension = path.substring(dot + 1);
      response.writeHead(200, {"Content-Type": mimeTypes.get(extension)});
      response.end(data);
    });
  };

  respondWithStatus(status, response) {
    response.writeHead(status);
    response.end(status + "!");
  }

  redirect(location, response) {
    response.writeHead(302, {"Location": location});
    response.end(location);
  }

  expandSecrets(text) {
    if (text.search(SECRET_START) >= 0) {
      for (const name in this.secrets) {
        text = text.replaceAll(SECRET_START + name + SECRET_END, this.secrets[name]);
      }
    }

    return text;
  }

  processSync(request, response) {
    if (request.method != POST_METHOD) {
      return this.respondWithStatus(405, response);
    }

    var body = "";
    request.on("data", data => {
      body += data.toString();
    });
    request.on("end", () => {
      const parameters = querystring.parse(body);
      const request = parameters[REQUEST_PARAMETER];
      const token = parameters[TOKEN_PARAMETER];
      const payload = parameters[PAYLOAD_PARAMETER];

      if (this.syncToken && token != this.syncToken) {
        console.log("Invalid token: " + token);
        return this.respondWithStatus(403, response);
      }

      if (request == PULL_REQUEST) {
        this.processPull(payload, response);
      } else if (request == PUSH_REQUEST) {
        this.processPush(payload, response);
      } else {
        return this.respondWithStatus(400, response);
      }
    });
  }

  processPull(payload, response) {
    const responsePayload = JSON.stringify(this.datastore.toJson());
    console.log("Pull request: " + responsePayload);
    response.writeHead(200, {"Content-Type": "application/json"});
    response.end(responsePayload);
  }

  processPush(payload, response) {
    console.log("Push request: " + payload);
    this.datastore.fromJson(JSON.parse(payload));
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Ok");
    this.storeData(DATA_FILENAME);
  }

  loadData(filename) {
    try {
      const data = fs.readFileSync(filename, { encoding: 'utf8', flag: 'r' });
      console.log("Load data: " + data.trim());
      this.datastore.fromJson(JSON.parse(data));
    } catch (error) {
      console.log("Load error: " + error);
    };
  }

  storeData(filename) {
    const jsonData = JSON.stringify(this.datastore.toJson()) + "\n";
    fs.writeFile(filename, jsonData, error => {
      if (error) {
        panic("Write error: " + error);
      }
    });
  }

  loadSecrets() {
    try {
      const secretsText = fs.readFileSync(SECRETS_FILENAME, { encoding: 'utf8', flag: 'r' });
      const secretsJson = JSON.parse(secretsText);
      var secretsMessage = "Secrets loaded:";
      for (const name in secretsJson) {
        secretsMessage += " " + name;
      }
      console.log(secretsMessage);
      return secretsJson;
    } catch (error) {
      console.log("Secrets load error: " + error);
      return {};
    };
  }
}

new Server(counterData).start(HOSTNAME, PORT);
