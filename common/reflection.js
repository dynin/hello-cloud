/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
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

const elementsNamespace = new Namespace("elements");
const viewsNamespace = new Namespace("views");
const stylesNamespace = new Namespace("styles");
const languageNamespace = new Namespace("language");

function addNamespaceType(namespace, name, isInstanceFunction) {
  const result = new Type(namespace, name, isInstanceFunction);
  namespace.addMember(result);
  return result;
}

function addEnumType(namespace, name, values) {
  const all = [];
  function isInstanceFunction(value) { return all.includes(value); }
  const result = addNamespaceType(namespace, name, isInstanceFunction);

  for (let i = 0; i < values.length; ++i) {
    const valueName = values[i];
    const value = { name: valueName, index: i };
    result[valueName] = value;

    all.push(value);
  }

  result['all'] = all;

  for (let i = 0; i < all.length; ++i) {
    namespace.addMember(new Field(namespace, all[i].name, new ConstantReference(all[i], result)));
  }

  return result;
}

function addElementType(name, isInstanceFunction) {
  return addNamespaceType(elementsNamespace, name, isInstanceFunction);
}

const BooleanType = addElementType("boolean", (value) => typeof value == "boolean");

const StringType = addElementType("string", (value) => typeof value == "string");

const IntegerType = addElementType("integer",
    (value) => typeof value == "number" && Number.isInteger(value));

// Arrays used for low-level lists
const ArrayType = addElementType("array", (value) => Array.isArray(value));

const ListType = addElementType("list", (value) => value instanceof List);

// TODO: factor out 'or null'
const ListOrNullType = addElementType("list_or_null",
    (value) => value == null || value instanceof List);

const FunctionType = addElementType("function", (value) => typeof value == "function");

const NullType = addElementType("null", (value) => value == null);

const ObjectType = addElementType("object", (value) => true);

const TypeType = addElementType("type", (value) => value instanceof Type);

const LifespanType = addElementType("lifespan", (value) => value instanceof Lifespan);

const SyncStatus = addEnumType(elementsNamespace, "SyncStatus",
    [ "NOT_INITIALIZED", "NOT_AUTHENTICATED", "OFFLINE", "ONLINE" ]);

const Priority = addEnumType(elementsNamespace, "Priority",
    [ "NONE", "LOWEST", "LOW", "NORMAL", "HIGH", "HIGHEST" ]);

elementsNamespace.addMember(new Method(elementsNamespace, "equalsOp", BooleanType, equalsOp));

elementsNamespace.addMember(new Method(elementsNamespace, "notEqualsOp", BooleanType, notEqualsOp));

elementsNamespace.addMember(new Method(elementsNamespace, "stringJoin", StringType, stringJoin));
