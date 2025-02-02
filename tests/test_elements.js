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

process.stdout.write("Testing dependencies...");
test_dependecies();
process.stdout.write("Ok!\n");
