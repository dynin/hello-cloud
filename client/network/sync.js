/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

class DatastoreSync {
  constructor(datastore, isActive) {
    this.datastore = datastore;
    this.isActive = isActive;
    this.transport = new HttpTransport();
    this.isPullEnabled = true;
    this.isRequestPending = false;
    this.isRequestInProgress = false;
    this.shouldPush = false;
    this.datastoreObserver = () => this.datastoreChanged();
    this.startSync = () => this.startSyncRequest();
  }

  start(lifespan) {
    lifespan = defaultLifespan(lifespan);
    this.zone = lifespan.zone;

    this.datastore.observeAll(lifespan, this.datastoreObserver);
    observe(this.isActive, lifespan, () => this.isActiveToggled());
    this.zone.scheduleAction(this.startSync);
  }

  startSyncRequest() {
    this.isRequestPending = false;

    if (getValue(this.isActive)) {
      if (this.shouldPush) {
        this.startPushRequest();
        return;
      } else if (this.isPullEnabled) {
        this.startPullRequest();
        return;
      }
    } else {
      // Synchronization restarted in isActiveToggled() below
      return;
    }

    this.scheduleSyncRequest();
  }

  isActiveToggled() {
    if (getValue(this.isActive) && !this.isRequestInProgress && !this.isRequestPending) {
      this.zone.scheduleAction(this.startSync);
    }
  }

  scheduleSyncRequest() {
    if (!this.isRequestPending && !this.isRequestInProgress) {
      this.zone.scheduleDelayedAction(this.startSync, SYNC_INTERVAL_MS);
      this.isRequestPending = true;
    }
  }

  datastoreChanged() {
    this.shouldPush = true;
    if (!this.isRequestInProgress) {
      this.zone.scheduleAction(() => this.startPushRequest());
    }
  }

  startPullRequest() {
    this.isRequestInProgress = true;
    this.transport.startRequest(PULL_REQUEST, null, (response) => this.pullCallback(response),
        () => this.pullErrorCallback());
  }

  pullCallback(response) {
    this.isRequestInProgress = false;
    this.zone.internalSuppressObserver(this.datastoreObserver);
    this.datastore.fromJson(JSON.parse(response));
    this.zone.internalUnsuppressObserver(this.datastoreObserver);
    setValue(this.datastore.syncStatus, SyncStatus.ONLINE);
    this.scheduleSyncRequest();
  }

  pullErrorCallback() {
    this.isRequestInProgress = false;
    setValue(this.datastore.syncStatus, SyncStatus.OFFLINE);
    this.scheduleSyncRequest();
  }

  startPushRequest() {
    this.isRequestInProgress = true;
    const payload = JSON.stringify(this.datastore.toJson());
    this.shouldPush = false;
    this.transport.startRequest(PUSH_REQUEST, payload, (response) => this.pushCallback(response),
        () => this.pushErrorCallback());
  }

  pushCallback(response) {
    this.isRequestInProgress = false;
    setValue(this.datastore.syncStatus, SyncStatus.ONLINE);
    this.scheduleSyncRequest();
  }

  pushErrorCallback() {
    this.isRequestInProgress = false;
    setValue(this.datastore.syncStatus, SyncStatus.OFFLINE);
    this.shouldPush = true;
    this.scheduleSyncRequest();
  }
}
