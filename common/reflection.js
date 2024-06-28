/**
 * Copyright 2024 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

class Namespace {
  constructor(name) {
    this.name = name;

    if (Namespace.namespacesByName.has(name)) {
      panic("Duplicate namespace for " + name);
    }

    Namespace.namespacesByName.set(name, this);
    this.membersByName = new Map();
  }

  addMember(member) {
    if (!(member instanceof Member)) {
      panic("Member expected");
    }

    if (this.membersByName.has(member.name)) {
      panic("Member already exists for " + member.name);
    }

    this.membersByName.set(member.name, member);
  }

  getMember(memberName) {
    return this.membersByName.get(memberName);
  }

  toString() {
    return this.name;
  }

  static namespacesByName = new Map();
}

class Member {
  constructor(namespace, name) {
    this.namespace = namespace;
    this.name = name;
  }

  toString() {
    return this.constructor.name + " " + this.namespace + ":" + this.name;
  }
}

class Type extends Member {
  constructor(namespace, name, isInstanceFunction) {
    super(namespace, name);
    this.isInstance = isInstanceFunction;
  }

  check(value) {
    if (!this.isInstance(value)) {
      panic("Type check failed: '" + value + "' (" + value.constructor.name +
          ") is not " + this.name);
    }
  }
}

class Field extends Member {
  constructor(namespace, name, fieldReference) {
    super(namespace, name);
    this.fieldReference = fieldReference;
  }
}

class Method extends Member {
  constructor(namespace, name, resultType, implementation) {
    super(namespace, name);
    this.resultType = resultType;
    this.implementation = implementation;
  }

  getImplementation() {
    return getValue(this.implementation);
  }

  call(callArguments) {
    const fn = this.getImplementation();
    return fn(...callArguments);
  }
}

function lookupMember(identifier) {
  const colon = identifier.indexOf(':');
  if (colon < 0) {
    return null;
  }

  const namespace = Namespace.namespacesByName.get(identifier.substring(0, colon));
  if (namespace == null) {
    return null;
  }

  return namespace.getMember(identifier.substring(colon + 1));
}

const elementsNamespace = new Namespace("elements");

function addNamespaceType(namespace, name, isInstanceFunction) {
  const result = new Type(namespace, name, isInstanceFunction);
  namespace.addMember(result);
  return result;
}

function addElementType(name, isInstanceFunction) {
  return addNamespaceType(elementsNamespace, name, isInstanceFunction);
}

const BooleanType = addElementType("boolean", (value) => typeof value == "boolean");

const StringType = addElementType("string", (value) => typeof value == "string");

const IntegerType = addElementType("integer",
    (value) => typeof value == "number" && Number.isInteger(value));

const ListType = addElementType("list", (value) => Array.isArray(value));

// TODO: factor out 'or null'
const ListOrNullType = addElementType("list_or_null",
    (value) => value == null || Array.isArray(value));

const FunctionType = addElementType("function", (value) => typeof value == "function");

const NullType = addElementType("null", (value) => value == null);

const ObjectType = addElementType("object", (value) => true);

const TypeType = addElementType("type", (value) => value instanceof Type);

const LifespanType = addElementType("lifespan", (value) => value instanceof Lifespan);

elementsNamespace.addMember(new Method(elementsNamespace, "stringJoin", StringType, stringJoin));
