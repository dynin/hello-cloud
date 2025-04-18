/**
 * Copyright 2024-2025 Dynin Labs, Inc. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file or at
 * https://dynin.com/berkeley-license/
 */

const fs = require("fs");
const vm = require("vm");

function loadCommonModule(moduleName) {
  const app = fs.readFileSync("common/" + moduleName + ".js");
  vm.runInThisContext(app);
}

loadCommonModule("elements");
loadCommonModule("reflection");

function test_enums() {
  const TestEnum = addEnumType(elementsNamespace, "TestEnum", [ "FOO", "BAR", "BAZ" ]);

  if (TestEnum.FOO.index != 0 || TestEnum.FOO.name != "FOO") {
    panic("Failed enum value check");
  }

  if (TestEnum.BAR.index != 1 || TestEnum.BAR.name != "BAR") {
    panic("Failed enum value check");
  }

  if (!TestEnum.isInstance(TestEnum.FOO) ||
      !TestEnum.isInstance(TestEnum.BAZ) ||
      TestEnum.isInstance("FOO")) {
    panic("Failed enum instance check");
  }

  if (SyncStatus.ONLINE.index != 3 || SyncStatus.ONLINE.name != "ONLINE") {
    panic("Failed enum value check");
  }
}

function test_dependecies() {
  const ref1 = makeComputableReference(true, BooleanType);
  const ref2 = makeComputableReference(true, BooleanType);
  const ref3 = makeComputableReference(true, BooleanType);
  ref1.dependsOn(ref2);
  ref2.dependsOn(ref3);

  if (!ref1.introducesCycle(ref1)) {
    panic("Failed self cycle check");
  }
  if (!ref3.introducesCycle(ref1)) {
    panic("Failed cycle check");
  }
}

process.stdout.write("Testing enums...");
test_enums();
process.stdout.write("Ok!\n");

process.stdout.write("Testing dependencies...");
test_dependecies();
process.stdout.write("Ok!\n");
