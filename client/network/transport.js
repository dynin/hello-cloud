/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

class HttpTransport {
  constructor() {
    this.syncToken = "==SECRET_SYNC_TOKEN==";
  }

  startRequest(requestType, payload, callback, errorCallback) {
    const debugLog = this.debugLog;

    debugLog("Requesting " + requestType, payload);
    const request = new XMLHttpRequest();

    request.open(POST_METHOD, SYNC_ENDPOINT, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    var active = true;

    request.onreadystatechange = function() {
      if (request.readyState != 4) {
        return;
      }

      if (!active) {
        return;
      }

      active = false;

      try {
        if (request.status == 200 && request.responseText) {
          debugLog("Request " + requestType + " succeeded", request.responseText);
          if (callback) {
            try {
              callback(request.responseText);
            } catch (e) {
              debugLog("Callback failed: " + e);
            }
          }
        } else {
          debugLog("Request " + requestType + " failed (status: " + request.status + ").");
          if (errorCallback) {
            errorCallback();
          }
        }
      } catch (e) {
        debugLog("Request " + requestType + " failed (exception).");
        if (errorCallback) {
          errorCallback();
        }
      }
    };

    var content = REQUEST_PARAMETER + "=" + this.encodeFormValue(requestType);
    content += "&" + TOKEN_PARAMETER + "=" + this.encodeFormValue(this.syncToken);
    if (payload) {
      content += "&" + PAYLOAD_PARAMETER + "=" + this.encodeFormValue(payload);
    }
    request.send(content);

    setTimeout(function() {
      if (!active) {
        return;
      }
      active = false;
      request.abort();
      debugLog("Request " + requestType + " timed out.");
      if (errorCallback) {
        errorCallback();
      }
    }, TIMEOUT_INTERVAL_MS);
  }

  debugLog(message, details) {
    if (details) {
      message += ": ";
      if (details.length > 100) {
        message += details.substring(0, 100) + "...";
      } else {
        message += details;
      }
    }

    console.log(message);
  }

  encodeFormValue(str) {
    function toHex(c) { return "0123456789ABCDEF".charAt(c); };

    var result = "";
    for (var i = 0; i < str.length; ++i) {
      const c = str.charCodeAt(i);
      if ((c >= 48 && c <= 57) ||   // 0-9
          (c >= 65 && c <= 90) ||   // A-Z
          (c >= 97 && c <= 122)) {  // a-z
        result += str.charAt(i);
      } else {
        result += "%" + toHex(parseInt(c / 16)) + toHex(c % 16);
      }
    }

    return result;
  }
}
