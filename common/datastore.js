/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

/**
 * Convert datastore definition (such as the one in counterdata.js) into
 * Datastore object.
 *
 * The following boolean Boxed objects are added to the datastore:
 * isInitialized —— the datastore can be accessed;
 * isAuthenticated —— user credentials are accepted;
 * isOnline -- the connection to the server is working.
 *
 * TODO: implement three-way merge to handle offline/high-latency environments.
 */
class Datastore extends Namespace {
  constructor(name, members) {
    super(name);

    this.addDataMember("isInitialized", makeBoxed(false, BooleanType));
    this.addDataMember("isAuthenticated", makeBoxed(false, BooleanType));
    this.addDataMember("isOnline", makeBoxed(false, BooleanType));

    for (const memberName in members) {
      this.addDataMember(memberName, members[memberName]);
    }

    const fields = this.getFields(members);

    this.toJson = function() {
      const result = { };
      for (const field of fields) {
        result[field] = getValue(this[field]);
      }
      return result;
    };

    this.fromJson = function(data) {
      for (const field of fields) {
        setValue(this[field], data[field]);
      }
    };

    this.observeAll = function(lifespan, observer) {
      for (const field of fields) {
        observe(this[field], lifespan, observer);
      }
    }
  }

  addDataMember(name, ref) {
    if (!(ref instanceof Reference)) {
      panic("addDataMember() called on a non-reference for " + name);
    }

    this[name] = ref;

    if (ref.type == FunctionType) {
      this.addMember(new Method(this, name, NullType, ref));
    } else {
      this.addMember(new Field(this, name, ref));
    }

    ref.setName(name);
  }

  getFields(members) {
    const result = new Array();

    for (const field in members) {
      const ref = members[field];
      if (ref instanceof Boxed && this.isSerializeble(ref.type)) {
        result.push(field);
      }
    }

    return result;
  }

  isSerializeble(type) {
    return type == BooleanType || type == StringType || type == IntegerType;
  }
}

function makeDatastore(name, members) {
  return new Datastore(name, members);
}
