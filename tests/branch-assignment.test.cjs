/* eslint-disable @typescript-eslint/no-require-imports -- Node test and isolated TS loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { loadTs } = require("./helpers/ts-loader.cjs");

const assignment = loadTs("lib/branch-assignment.ts");
const { readRoomLinkParams, listRooms, withRoomId, roomCodePrefill } = loadTs("lib/listing-room-link.ts");
const { buildCreateListingPayload } = loadTs("app/dashboard/properties/new/utils/buildListingPayload.ts");

const layout = [{ label: "Tầng 1", rows: [{ label: "Dãy A", slots: [
  { id: "r1", roomCode: "101" }, { id: "aisle", roomCode: null }, { id: "r2", roomCode: "102" },
] }] }];
const page = { items: [], page: 0, size: 20, totalElements: 0 };

test("assignment parsing keeps server ids and paginates the tray independently", () => {
  const unplaced = { ...page, totalElements: 101, items: [{ kind: "LISTING", id: "l2", label: "Tin trùng tên" }] };
  assert.deepEqual(assignment.parseAssignments({ rooms: [{ roomId: "r1" }], unplaced }), {
    rooms: [assignment.emptyRoom("r1")], unplaced,
  });
  assert.equal(assignment.pageCount(unplaced), 6);
  assert.equal(assignment.pageCount(page), 1);
  assert.throws(() => assignment.parseAssignments("<html>"));
  assert.throws(() => assignment.parseCandidates({ ...page, size: "20" }));
  assert.deepEqual(assignment.parseCandidates({ ...page, items: [{ id: "c1", label: "HĐ" }] }).items,
    [{ id: "c1", label: "HĐ", roomId: null }]);
});

test("room options and removal warnings use saved room ids and skip aisles", () => {
  const [first, second] = assignment.roomOptions(layout);
  assert.deepEqual([first.id, second.id], ["r1", "r2"]);
  assert.deepEqual(listRooms({ floors: layout }).map(room => room.id), ["r1", "r2"]);
  const room = { ...assignment.emptyRoom("r1"), holds: [{ rentalRequestId: "hold-1" }] };
  const next = [{ label: "Tầng 1", rows: [{ label: "Dãy A", slots: [
    { id: "r1", roomCode: null }, { id: "r2", roomCode: "201" }, { roomCode: "202" },
  ] }] }];
  assert.deepEqual(assignment.lostAttachedRooms(layout, next, new Map([["r1", room]])),
    [{ id: "r1", code: "101", text: "1 lượt giữ chỗ" }]);
  assert.deepEqual(assignment.roomOptions(next).map(room => room.id), ["r2"]);
});

test("only contracts can move directly and pending layout writes block room actions", () => {
  const rooms = assignment.roomOptions(layout);
  const placed = { id: "item", label: "Mục", roomId: "r1" };
  assert.equal(assignment.candidateState("LISTING", placed, "r2", rooms).disabled, true);
  assert.equal(assignment.candidateState("CONTRACT", placed, "r1", rooms).disabled, true);
  assert.equal(assignment.candidateState("CONTRACT", placed, "r2", rooms).disabled, false);
  assert.equal(assignment.candidateState("CONTRACT", { ...placed, roomId: null }, null, rooms, true).disabled, true);
  assert.equal(assignment.permissionBlock(false, "Thiếu quyền đăng tin"), "Thiếu quyền đăng tin");
  assert.ok(assignment.unsavedBlock(true, false));
  assert.ok(assignment.unsavedBlock(false, true));
  assert.equal(assignment.unsavedBlock(false, false), null);
});

test("room summary preserves source arrays and links to domain pages by id", () => {
  const room = { ...assignment.emptyRoom("r1"), manualStatus: "REPAIR",
    contracts: [{ status: "CLOSED", tenantName: "Cũ" }, { status: "ACTIVE", tenantName: "Hiện tại" }],
    holds: [{ tenantName: "Sắp vào" }], listings: [{ id: "l1" }] };
  assert.match(assignment.roomLines(room).join(" "), /Đang sửa chữa.*Hiện tại.*Giữ chỗ: Sắp vào.*1 tin đăng/);
  assert.equal(room.contracts[0].status, "CLOSED");
  assert.equal(assignment.itemPath("CONTRACT", "c1"), "/dashboard/landlord/contracts/c1");
  assert.equal(assignment.itemPath("LISTING", "l/1"), "/dashboard/properties/view?id=l%2F1");
  assert.equal(assignment.rentalRequestPath("r/1"), "/dashboard/rental-requests?requestId=r%2F1");
  assert.equal(assignment.formatDay("2026-11-27"), "27/11/2026");
});

function listingPayload(branchId, extra = {}) {
  return buildCreateListingPayload({
    basicInfo: { category: "room", branchId, title: "Phòng có cửa sổ", description: "Tin thử", availableDate: "2026-11-27" },
    roomDetails: {}, furnishingAssets: [], selectedAmenities: [], monthlyExpenses: { customFees: [] },
    pricing: { priceMonthly: "3000000", depositType: "NONE" },
    addressMode: "saved", savedAddressId: "address-1", uploadedMediaList: [],
    submissionAction: "SAVE_DRAFT", ...extra,
  });
}

test("a plain create submits the old payload verbatim without roomId", () => {
  const draft = listingPayload("b1");
  const params = readRoomLinkParams("create", new URLSearchParams("branchId=b1"));
  assert.equal(params, null);
  const request = withRoomId(draft, params?.roomId ?? null);
  assert.strictEqual(request, draft);
  assert.equal(JSON.stringify(request), JSON.stringify(draft));
  assert.equal(Object.hasOwn(request, "roomId"), false);
});

test("creating from a room adds only roomId, never the layout room code to listing text", () => {
  const path = assignment.newRoomListingPath("b/1", "r/1");
  const link = readRoomLinkParams("create", new URL(path, "https://test.invalid").searchParams);
  assert.deepEqual(link, { branchId: "b/1", roomId: "r/1" });
  const draft = listingPayload(link.branchId);
  assert.deepEqual(withRoomId(draft, link.roomId), { ...draft, roomId: "r/1" });
  assert.equal(Object.hasOwn(draft, "roomId"), false);
});

test("edit and duplicate leave the old request without roomId", () => {
  const params = new URLSearchParams("branchId=b1&roomId=r1");
  assert.equal(readRoomLinkParams("edit", params), null);
  assert.equal(readRoomLinkParams("create", new URLSearchParams("roomId=r1")), null);
  params.set("duplicateFrom", "source");
  assert.equal(readRoomLinkParams("create", params), null);
  for (const payload of [listingPayload("b1", { id: "edit" }), listingPayload("b1", { duplicateSourceListingId: "source" })]) {
    assert.strictEqual(withRoomId(payload, "r1"), payload);
    assert.equal(Object.hasOwn(payload, "roomId"), false);
  }
});

test("the editor drops the room on branch change, including when switching back", () => {
  const file = require.resolve("../app/dashboard/properties/new/ListingEditor.tsx");
  const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const snippets = new Map();
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "handleSelectBranch") {
      snippets.set("select", node.getText(ast));
    }
    if (ts.isVariableDeclaration(node) && ["roomLink", "linkedRoomId"].includes(node.name.getText(ast))) {
      snippets.set(node.name.getText(ast), node.initializer.getText(ast));
    }
    ts.forEachChild(node, visit);
  })(ast);
  assert.equal(snippets.size, 3);
  const script = ts.transpileModule(`
    globalThis.select = (branchId) => {
      const roomLink = ${snippets.get("roomLink")};
      ${snippets.get("select")}
      handleSelectBranch(branchId);
    };
    globalThis.request = () => {
      const roomLink = ${snippets.get("roomLink")};
      return withRoomId(listingPayload(basicInfo.branchId), ${snippets.get("linkedRoomId")});
    };
  `, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const changedBranch of ["b2", ""]) {
    const context = {
      basicInfo: { branchId: "b1", category: "room" },
      roomLinkParams: { branchId: "b1", roomId: "r1" },
      isRoomLinkRemoved: false,
      pickedRoomId: null,
      isEditMode: false,
      isDuplicateMode: false,
      branches: [{ id: "b1" }, { id: "b2" }],
      setBasicInfo: change => { context.basicInfo = change(context.basicInfo); },
      setIsRoomLinkRemoved: value => { context.isRoomLinkRemoved = value; },
      setMonthlyExpenses() {},
      toast: { info() {}, warning() {} },
      withRoomId,
      listingPayload,
    };
    vm.runInNewContext(script, context);
    assert.equal(context.request().roomId, "r1");
    context.select(changedBranch);
    assert.deepEqual(context.request(), listingPayload(changedBranch));
    context.select("b1");
    assert.deepEqual(context.request(), listingPayload("b1"));
  }
});

test("assignment client adds to the tray without clearing a saved room", async () => {
  const calls = [];
  const client = {
    get: async (path, config) => {
      calls.push(["GET", path, config]);
      return { data: { result: path.endsWith("/assignments") ? { rooms: [], unplaced: page } : page } };
    },
    put: async (...args) => { calls.push(["PUT", ...args]); },
    delete: async (...args) => { calls.push(["DELETE", ...args]); },
  };
  const { default: api } = loadTs("services/branch-assignment.service.ts", { "@/lib/axios-client": client });
  await api.getAssignments("b");
  await api.getCandidates("b", "CONTRACT", 2, 50);
  await api.linkListing("b", "r", "l");
  await api.unlinkListing("b", "r", "l");
  await api.addContractToTray("b", "c");
  await api.putContract("b", "c", null);
  await api.removeContract("b", "c");
  await api.setManualStatus("b", "r", "REPAIR");
  const base = "/api/v1/branches/b";
  assert.deepEqual(calls, [
    ["GET", base + "/assignments", { params: { page: 0, size: 20 } }],
    ["GET", base + "/assignment-candidates", { params: { kind: "CONTRACT", page: 2, size: 50 } }],
    ["PUT", base + "/rooms/r/listings/l"], ["DELETE", base + "/rooms/r/listings/l"],
    ["PUT", base + "/contracts/c", { addToTray: true }],
    ["PUT", base + "/contracts/c", { roomId: null }], ["DELETE", base + "/contracts/c"],
    ["PUT", base + "/rooms/r/manual-status", { status: "REPAIR" }],
  ]);
});

test("a listing code only warns when it is declared and differs from the cell, ignoring case and spaces", () => {
  assert.equal(assignment.codeMismatch("102", "101"), true);
  assert.equal(assignment.codeMismatch(" p101 ", "P101"), false);
  for (const unknown of [undefined, null, "", "  "]) assert.equal(assignment.codeMismatch(unknown, "101"), false);
  const room = { ...assignment.emptyRoom("r1"), listings: [{ id: "a", roomCode: "101" }, { id: "b", roomCode: "102" }, { id: "c" }, { id: "d", roomCode: null }] };
  assert.deepEqual(assignment.mismatchedListings(room, "101").map(l => l.id), ["b"]);
  assert.deepEqual(assignment.mismatchedListings(undefined, "101"), []);
});

test("candidates with the cell's code come first, the server order is kept otherwise", () => {
  const items = [{ id: "1", roomCode: "102" }, { id: "2" }, { id: "3", roomCode: "101" }, { id: "4", roomCode: "101 " }, { id: "5", roomCode: null }];
  assert.deepEqual(assignment.sortCandidates(items, "101").map(i => i.id), ["3", "4", "1", "2", "5"]);
  assert.strictEqual(assignment.sortCandidates(items, undefined), items);
  assert.deepEqual(items.map(i => i.id), ["1", "2", "3", "4", "5"]);
});

test("room codes from the server survive parsing and the edit link points at the listing editor", () => {
  const room = { roomId: "r1", listings: [{ id: "l1", title: "T", operationalStatus: "PUBLISHED", roomCode: "102" }] };
  assert.equal(assignment.parseAssignments({ rooms: [room], unplaced: page }).rooms[0].listings[0].roomCode, "102");
  assert.equal(assignment.parseCandidates({ ...page, items: [{ id: "c", label: "x", roomCode: "103" }] }).items[0].roomCode, "103");
  assert.equal(assignment.listingEditPath("l/1"), "/dashboard/properties/l%2F1/edit");
});

test("a listing started from a room gets the map code in its empty code field, never in the title", () => {
  assert.deepEqual(roomCodePrefill("room", " 101 ", "", ""), { target: "room", value: "101" });
  assert.deepEqual(roomCodePrefill("apartment", "A-12", "", ""), { target: "apartment", value: "A-12" });
  assert.equal(roomCodePrefill("room", "101", "P5", ""), null, "an entered code is kept");
  assert.equal(roomCodePrefill("apartment", "101", "", " X "), null);
  assert.equal(roomCodePrefill("house", "101", "", ""), null);
  assert.equal(roomCodePrefill("room", undefined, "", ""), null);
  assert.equal(listRooms({ floors: layout }).find(room => room.id === "r1").code, "101");
});

test("the room's one main step follows what is on it: running contract, hold, listing, history, then attach", () => {
  const room = (extra) => ({ ...assignment.emptyRoom("r1"), ...extra });
  const closed = { id: "c0", status: "CLOSED" }, active = { id: "c1", status: "ACTIVE" }, upcoming = { id: "c2", status: "SIGNED" };
  const hold = { rentalRequestId: "h1" }, listing = { id: "l1" };
  assert.deepEqual(assignment.roomPrimary(room({ contracts: [closed, active], holds: [hold], listings: [listing] })), { kind: "CONTRACT", id: "c1" });
  assert.deepEqual(assignment.roomPrimary(room({ contracts: [closed, upcoming], listings: [listing] })), { kind: "CONTRACT", id: "c2" });
  assert.deepEqual(assignment.roomPrimary(room({ contracts: [closed], holds: [hold] })), { kind: "HOLD", id: "h1" });
  assert.deepEqual(assignment.roomPrimary(room({ contracts: [closed], listings: [listing] })), { kind: "LISTING", id: "l1" });
  assert.deepEqual(assignment.roomPrimary(room({ contracts: [closed] })), { kind: "CONTRACT", id: "c0" });
  assert.deepEqual(assignment.roomPrimary(room({ manualStatus: "REPAIR" })), { kind: "ATTACH" });
});
