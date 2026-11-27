/* eslint-disable @typescript-eslint/no-require-imports -- Node test with the repo's TS loader. */
const assert = require("node:assert/strict");
const vm = require("node:vm");
const test = require("node:test");
const { renderToStaticMarkup } = require("react-dom/server");
const loadPureTs = require("./helpers/load-ts.cjs");
const { loadTs } = require("./helpers/ts-loader.cjs");

const layout = loadPureTs("lib/branch-layout.ts");
const { readStoredDraft, writeStoredDraft } = loadPureTs("lib/branch-layout-draft.ts");
const roomCodes = (draft) => draft.map((floor) => floor.rows.map((row) => row.slots.map((slot) => slot.roomCode)));

function savedDraft() {
  return layout.fromLayout({
    revision: 4,
    floors: [
      { id: "f1", label: "Tầng 1", rows: [
        { id: "r1", label: "Dãy 1", slots: [
          { id: "s1", roomCode: "101" }, { id: "s2" }, { id: "s3", roomCode: "102" },
        ] },
      ] },
      { id: "f2", label: "Tầng 2", rows: [
        { id: "r2", label: "Dãy 1", slots: [{ id: "s4", roomCode: "201" }] },
      ] },
    ],
  });
}

test("P1-01: an unset layout stays empty and both branch routes select the landlord dashboard", () => {
  assert.deepEqual(layout.fromLayout({ revision: 0, floors: [] }), []);
  const { inferRoleFromPath } = loadPureTs("lib/dashboard-role.ts");
  assert.equal(inferRoleFromPath("/dashboard/branches"), "landlord");
  assert.equal(inferRoleFromPath("/dashboard/branches/branch-a"), "landlord");
});

test("P1-02: four templates are editable drafts and HOUSE yields exactly one room", () => {
  const cases = [
    [{ kind: "single", rooms: 2 }, [[["101", "102"]]]],
    [{ kind: "double", rooms: 2 }, [[["101", "102"], ["103", "104"]]]],
    [{ kind: "multi", floors: 2, rooms: 2 }, [[["101", "102"]], [["201", "202"]]]],
    [{ kind: "custom" }, [[[]]]],
    [{ kind: "house" }, [[["Nguyên căn"]]]],
  ];
  for (const [template, codes] of cases) {
    const draft = layout.buildTemplate(template);
    assert.deepEqual(roomCodes(draft), codes);
    assert.equal(draft.every((floor) => !floor.id && floor.rows.every((row) =>
      !row.id && row.slots.every((slot) => !slot.id))), true);
  }
});

test("P1-02: custom editing adds floors, columns, rooms and aisles; undo restores the prior draft", () => {
  const base = layout.buildTemplate({ kind: "custom" });
  let draft = layout.addFloor(base);
  draft = layout.addRow(draft, draft[0].key);
  const target = draft[0].rows[1].key;
  draft = layout.addRooms(draft, target, 2);
  draft = layout.addEmptyCell(draft, target);
  assert.deepEqual(roomCodes(draft), [[[], ["101", "102", null]], [[]]]);
  assert.equal(layout.countRooms(draft), 2);
  assert.deepEqual(layout.validateDraft(draft), []);
  const history = layout.applyEdit(layout.createHistory(base), draft);
  assert.strictEqual(layout.applyEdit(history, draft), history);
  assert.strictEqual(layout.undoEdit(history).present, base);
  assert.deepEqual(roomCodes(base), [[[]]]);
});

test("P1-02: renaming, moving and converting cells keep persisted IDs and array order in PUT", () => {
  const base = savedDraft();
  let draft = layout.renameFloor(base, "f1", " Khu A ");
  draft = layout.renameRow(draft, "r1", " Dãy A ");
  draft = layout.setRoomCode(draft, "s1", " A01 ");
  draft = layout.moveSlot(draft, "s3", -1);
  draft = layout.moveSlotToRow(draft, "s1", "r2");
  draft = layout.toggleEmptyCell(draft, "s3");
  draft = layout.addRooms(draft, "r1");

  assert.deepEqual(layout.toSaveRequest(draft, 4), {
    expectedRevision: 4,
    floors: [
      { id: "f1", label: "Khu A", rows: [{ id: "r1", label: "Dãy A", slots: [
        { id: "s3", roomCode: null }, { id: "s2", roomCode: null }, { roomCode: "101" },
      ] }] },
      { id: "f2", label: "Tầng 2", rows: [{ id: "r2", label: "Dãy 1", slots: [
        { id: "s4", roomCode: "201" }, { id: "s1", roomCode: "A01" },
      ] }] },
    ],
  });
  assert.deepEqual(roomCodes(base), [[["101", null, "102"]], [["201"]]]);
  const reloaded = layout.fromLayout({ revision: 4, floors: layout.toSaveRequest(base, 4).floors });
  assert.equal(layout.sameLayout(reloaded, base), true);
});

test("P1-02: duplicating a floor drops every ID, keeps aisles and assigns distinct codes", () => {
  const base = savedDraft();
  const draft = layout.duplicateFloor(base, "f1");
  const copy = layout.toSaveRequest(draft, 4).floors.at(-1);
  assert.deepEqual(copy, {
    label: "Tầng 3",
    rows: [{ label: "Dãy 1", slots: [{ roomCode: "301" }, { roomCode: null }, { roomCode: "302" }] }],
  });
  assert.deepEqual(layout.validateDraft(draft), []);
  assert.equal(draft.at(-1).rows[0].slots.some((slot) => base[0].rows[0].slots.some((old) => old.key === slot.key)), false);
});

test("P1-02: a floor recode skips codes held outside the scope and keeps empty cells and IDs", () => {
  const base = savedDraft();
  const draft = layout.recodeRooms(base, { floorKey: "f1", start: 200 });
  assert.deepEqual(roomCodes(draft), [[["200", null, "202"]], [["201"]]]);
  assert.deepEqual(draft[0].rows[0].slots.map((slot) => slot.id), ["s1", "s2", "s3"]);
  assert.strictEqual(draft[1], base[1]);
});

test("P1-03: validation rejects missing rooms, blank labels/codes and duplicates across floors", () => {
  const base = savedDraft();
  assert.ok(layout.validateDraft([]).length);
  assert.ok(layout.validateDraft(layout.buildTemplate({ kind: "custom" })).length);
  assert.ok(layout.roomCodeError(base, "s1", " "));
  assert.ok(layout.roomCodeError(base, "s1", " 201 "));
  const renamed = layout.setRoomCode(base, "s4", " aBc ");
  assert.strictEqual(layout.setRoomCode(renamed, "s1", " ABC "), renamed);
  const dto = layout.toSaveRequest(base, 4);
  dto.floors[0].label = " ";
  dto.floors[0].rows[0].slots[0].roomCode = " ";
  dto.floors[0].rows[0].slots[2].roomCode = " 201 ";
  assert.equal(layout.validateDraft(layout.fromLayout(dto)).length, 3);
});

test("P1-02: API client uses Gateway GET/PUT and sends the HOUSE template in the P1 envelope", async () => {
  const calls = [];
  const empty = { revision: 0, floors: [] };
  const saved = { revision: 1, floors: [] };
  const axios = {
    get: async (...args) => { calls.push(["GET", ...args]); return { data: { code: 1000, result: empty } }; },
    put: async (...args) => { calls.push(["PUT", ...args]); return { data: { code: 1000, result: saved } }; },
  };
  const api = loadTs("services/branch-layout.service.ts", { "@/lib/axios-client": axios }).default;
  assert.strictEqual(await api.getLayout("branch-a"), empty);
  const request = layout.toSaveRequest(layout.buildTemplate({ kind: "house" }), 0);
  assert.strictEqual(await api.saveLayout("branch-a", request), saved);
  assert.deepEqual(calls, [
    ["GET", "/api/v1/branches/branch-a/layout"],
    ["PUT", "/api/v1/branches/branch-a/layout", {
      expectedRevision: 0,
      floors: [{ label: "Tầng 1", rows: [{ label: "Dãy 1", slots: [{ roomCode: "Nguyên căn" }] }] }],
    }],
  ]);
});

test("P1-02: add room also works after a valid code with a long numeric suffix", () => {
  const draft = layout.buildTemplate({ kind: "single", rooms: 1 });
  const row = draft[0].rows[0];
  const updated = layout.setRoomCode(draft, row.slots[0].key, "A9007199254740992");

  // An ordinary node:test timeout cannot interrupt synchronous code.
  const added = vm.runInNewContext("layout.addRooms(updated, rowKey)", {
    layout, updated, rowKey: row.key,
  }, { timeout: 1000 });

  assert.equal(layout.countRooms(added), 2);
  assert.deepEqual(layout.validateDraft(added), []);
});

const branchId = "branch-a";
const userId = "owner-a";
const serverLayout = (draft, revision) => ({ revision, floors: layout.toSaveRequest(draft, revision).floors });
const staleResponse = { isAxiosError: true, response: { status: 409, data: { code: 4074 } } };

function mockStorage(t) {
  const previousWindow = global.window;
  const values = new Map();
  const window = new EventTarget();
  window.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  global.window = window;
  t.after(() => { global.window = previousWindow; });
  return window.localStorage;
}

// Run the editor's own effects and button handlers without a browser or a service.
let hooks;
const api = {};
const notifications = [];
const router = {};
const asked = [];
let answer = true;
const Editor = loadTs("components/branch/BranchLayoutEditor.tsx", {
  react: {
    useState: (...args) => hooks.state(...args),
    useRef: (current) => hooks.state(() => ({ current }))[0],
    useEffect: (...args) => hooks.effect(...args),
    useCallback: (callback, deps) => hooks.memo(callback, deps),
    useId: () => "layout-template",
  },
  "next/navigation": { useRouter: () => router },
  sonner: { toast: { success: (message) => notifications.push(message) } },
  "lucide-react": {},
  "@/components/common/ActionDialog": { useActionDialog: () => ({ confirm: async (options) => { asked.push(options); return answer; } }) },
  "@/lib/branch-layout": layout,
  "@/lib/keycloak": { subject: userId },
  "@/services/branch-layout.service": api,
  "./LayoutBoard": {},
  "./LayoutDialogs": {},
}).default;

function mountEditor(t, initial, saveLayout = async () => assert.fail("Unexpected PUT"), links) {
  let cursor;
  let effects;
  let tree;
  const cells = [];
  const sameDeps = (previous, next) => previous && next && next.length === previous.length &&
    next.every((value, index) => Object.is(value, previous[index]));
  const findButton = (node, label) => {
    if (node?.type === "button") {
      const text = [node.props.children].flat().filter((child) => typeof child === "string").join("").trim();
      if (text === label) return node.props;
    }
    const children = node?.props?.children ?? node;
    return Array.isArray(children) ? children.map((child) => findButton(child, label)).find(Boolean)
      : children === node ? undefined : findButton(children, label);
  };

  notifications.length = 0;
  asked.length = 0;
  answer = true;
  api.getLayout = t.mock.fn(async () => initial);
  api.saveLayout = t.mock.fn(saveLayout);
  const render = () => {
    cursor = 0;
    effects = [];
    hooks = {
      state(initialValue) {
        const index = cursor++;
        const cell = cells[index] ??= { value: typeof initialValue === "function" ? initialValue() : initialValue };
        return [cell.value, (value) => { cell.value = typeof value === "function" ? value(cell.value) : value; }];
      },
      memo(callback, deps) {
        const index = cursor++;
        if (!sameDeps(cells[index]?.deps, deps)) cells[index] = { deps, callback };
        return cells[index].callback;
      },
      effect(callback, deps) {
        const index = cursor++;
        if (sameDeps(cells[index]?.deps, deps)) return;
        effects.push(() => {
          cells[index]?.cleanup?.();
          cells[index] = { deps, cleanup: callback() };
        });
      },
    };
    tree = Editor({ branchId, canEdit: true, isHouse: false, setup: false, links });
    for (const effect of effects) effect();
  };
  const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    render();
  };
  render();
  const unmount = () => cells.forEach((cell) => cell?.cleanup?.());
  return { settle, render, unmount, button: (label) => findButton(tree, label) };
}

async function restoreAndSave(editor) {
  await editor.settle();
  editor.button("Khôi phục bản nháp").onClick();
  editor.render();
  editor.button("Lưu sơ đồ").onClick();
}

test("P1-R01: a retry with 409 recognizes a completed PUT at the next revision with newly assigned IDs", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  const sent = layout.addRooms(layout.setRoomCode(base, "s1", "A01"), "r1");
  const committed = serverLayout(sent, 5);
  committed.floors[0].rows[0].slots.at(-1).id = "s-new";
  writeStoredDraft(userId, branchId, { revision: 4, draft: sent });
  const editor = mountEditor(t, serverLayout(base, 4), async () => { throw staleResponse; });
  api.getLayout.mock.mockImplementationOnce(async () => committed, 1);
  await restoreAndSave(editor);
  await editor.settle();

  assert.deepEqual(api.saveLayout.mock.calls[0].arguments, [branchId, layout.toSaveRequest(sent, 4)]);
  assert.deepEqual(notifications, ["Đã lưu sơ đồ."]);
  assert.equal(readStoredDraft(userId, branchId), null);
});

test("P1-R01: a 409 keeps the draft if the server changed a retained ID or moved beyond the next revision", async (t) => {
  const base = savedDraft();
  const sent = layout.setRoomCode(base, "s1", "A01");
  const replaced = serverLayout(sent, 5);
  replaced.floors[0].rows[0].slots[0].id = "s-other";
  for (const [name, latest] of [["replaced ID", replaced], ["intervening revision", serverLayout(sent, 6)]]) {
    await t.test(name, async (scenario) => {
      mockStorage(scenario);
      writeStoredDraft(userId, branchId, { revision: 4, draft: sent });
      const editor = mountEditor(scenario, serverLayout(base, 4), async () => { throw staleResponse; });
      api.getLayout.mock.mockImplementationOnce(async () => latest, 1);
      await restoreAndSave(editor);
      await editor.settle();

      assert.equal(editor.button("Lưu sơ đồ").disabled, true);
      assert.deepEqual(notifications, []);
      assert.deepEqual(readStoredDraft(userId, branchId), { revision: 4, draft: sent });
    });
  }
});

test("P1-R01: a new cell cannot match an old ID that the request drops", () => {
  const base = savedDraft();
  const sent = layout.addRooms(layout.removeSlot(base, "s3"), "r1");
  assert.deepEqual(roomCodes(sent), roomCodes(base));
  assert.equal(layout.isSavedCopy(base, sent, base), false);
});

test("P1-R04: stored drafts are scoped to the user and branch and survive reopening the module", (t) => {
  mockStorage(t);
  const mine = { revision: 4, draft: layout.setRoomCode(savedDraft(), "s1", "A01") };
  const other = { revision: 9, draft: layout.buildTemplate({ kind: "house" }) };
  writeStoredDraft(userId, branchId, mine);
  writeStoredDraft("owner-b", branchId, other);
  writeStoredDraft(userId, "branch-b", other);
  writeStoredDraft(undefined, branchId, other);
  const reopened = loadPureTs("lib/branch-layout-draft.ts");

  assert.deepEqual(reopened.readStoredDraft(userId, branchId), mine);
  assert.deepEqual(reopened.readStoredDraft("owner-b", branchId), other);
  assert.deepEqual(reopened.readStoredDraft(userId, "branch-b"), other);
  assert.equal(reopened.readStoredDraft("owner-c", branchId), null);
  assert.equal(reopened.readStoredDraft(undefined, branchId), null);
  reopened.writeStoredDraft(userId, branchId, null);
  assert.equal(readStoredDraft(userId, branchId), null);
  assert.deepEqual(readStoredDraft("owner-b", branchId), other);
  assert.deepEqual(readStoredDraft(userId, "branch-b"), other);
});

test("P1-R04: reopening a draft from an older revision offers it but blocks PUT after restore", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  const stored = { revision: 4, draft: layout.setRoomCode(base, "s1", "A01") };
  writeStoredDraft(userId, branchId, stored);
  const newer = layout.setRoomCode(base, "s1", "B01");
  const editor = mountEditor(t, serverLayout(newer, 5));
  await editor.settle();
  editor.button("Khôi phục bản nháp").onClick();
  editor.render();

  assert.equal(editor.button("Lưu sơ đồ").disabled, true);
  assert.equal(api.saveLayout.mock.callCount(), 0);
  assert.deepEqual(readStoredDraft(userId, branchId), stored);
});

test("P1-R04: discarding a restored stale draft lets the user edit and save from the loaded revision", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  writeStoredDraft(userId, branchId, { revision: 4, draft: layout.setRoomCode(base, "s1", "A01") });
  const newer = layout.setRoomCode(base, "s1", "B01");
  const committed = serverLayout(layout.addFloor(newer), 6);
  committed.floors.at(-1).id = "f3";
  committed.floors.at(-1).rows[0].id = "r3";
  const editor = mountEditor(t, serverLayout(newer, 5), async () => committed);
  await editor.settle();
  editor.button("Khôi phục bản nháp").onClick();
  editor.render();
  await editor.button("Hủy thay đổi").onClick();
  editor.render();
  editor.button("Thêm tầng").onClick();
  editor.render();

  const saveButton = editor.button("Lưu sơ đồ");
  assert.equal(saveButton.disabled, false);
  saveButton.onClick();
  await editor.settle();
  assert.equal(api.saveLayout.mock.calls[0].arguments[1].expectedRevision, 5);
});

test("P1-R04: reopening keeps an unsaved replacement of a cell even when its code and position match", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  const stored = { revision: 4, draft: layout.addRooms(layout.removeSlot(base, "s3"), "r1") };
  assert.deepEqual(roomCodes(stored.draft), roomCodes(base));
  writeStoredDraft(userId, branchId, stored);
  const editor = mountEditor(t, serverLayout(base, 4));
  await editor.settle();

  assert.deepEqual(readStoredDraft(userId, branchId), stored, "GET at the same revision has not saved the replacement");
  assert.ok(editor.button("Khôi phục bản nháp"));
});

test("P1-R04: a late PUT completion leaves a newer draft written by another tab intact", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  const sent = layout.setRoomCode(base, "s1", "A01");
  writeStoredDraft(userId, branchId, { revision: 4, draft: sent });
  const pending = Promise.withResolvers();
  const editor = mountEditor(t, serverLayout(base, 4), () => pending.promise);
  await restoreAndSave(editor);

  const newer = { revision: 5, draft: layout.setRoomCode(sent, "s4", "B01") };
  writeStoredDraft(userId, branchId, newer);
  pending.resolve(serverLayout(sent, 5));
  await editor.settle();

  assert.deepEqual(readStoredDraft(userId, branchId), newer);
});

test("P1-R04: storage errors and invalid JSON do not interrupt the editor", (t) => {
  const storage = mockStorage(t);
  t.mock.method(storage, "getItem", () => "{");
  assert.equal(readStoredDraft(userId, branchId), null);
  t.mock.method(storage, "setItem", () => { throw new Error("quota"); });
  assert.doesNotThrow(() => writeStoredDraft(userId, branchId, { revision: 4, draft: savedDraft() }));
});

test("P1-R04: a stored draft with missing editor keys is rejected", (t) => {
  mockStorage(t);
  const draft = savedDraft();
  delete draft[0].rows[0].key;
  delete draft[1].rows[0].key;
  writeStoredDraft(userId, branchId, { revision: 4, draft });

  assert.equal(readStoredDraft(userId, branchId), null);
});

test("a reload after a 409 keeps the stored draft until the new map has been loaded", async (t) => {
  mockStorage(t);
  const base = savedDraft();
  const stored = { revision: 4, draft: layout.setRoomCode(base, "s1", "A01") };
  writeStoredDraft(userId, branchId, stored);
  const newer = serverLayout(layout.setRoomCode(base, "s1", "B01"), 5);
  const editor = mountEditor(t, newer);
  await editor.settle();
  editor.button("Khôi phục bản nháp").onClick();
  editor.render();

  api.getLayout.mock.mockImplementationOnce(async () => { throw { isAxiosError: true }; });
  editor.button("Tải lại sơ đồ").onClick();
  await editor.settle();
  assert.deepEqual(readStoredDraft(userId, branchId), stored);

  editor.button("Thử lại").onClick();
  await editor.settle();
  await editor.settle();
  assert.equal(readStoredDraft(userId, branchId), null);
  assert.equal(editor.button("Khôi phục bản nháp"), undefined, "the confirmed reload must not offer the old draft again");
});

/** The links on screen show nothing attached: only the read made at save time may decide. */
const mapLinks = (readRooms) => ({ rooms: new Map(), readRooms, onLayoutSaved() {}, roomPanel: () => null, tray: () => null });
const attached = new Map([["s3", { roomId: "s3", manualStatus: "NONE", listings: [{}], contracts: [], holds: [] }]]);
const offline = async () => { throw new Error("offline"); };

async function openDraft(t, sent, links) {
  mockStorage(t);
  writeStoredDraft(userId, branchId, { revision: 4, draft: sent });
  const editor = mountEditor(t, serverLayout(savedDraft(), 4), async () => serverLayout(sent, 5), links);
  await editor.settle();
  editor.button("Khôi phục bản nháp").onClick();
  editor.render();
  return editor;
}

test("a save that loses a saved room warns from links read at that moment; closing the dialog keeps the draft", async (t) => {
  const base = savedDraft();
  const removed = layout.removeSlot(base, "s3");
  const cases = [
    ["room removed", removed, async () => attached, /liên kết$/, /102.*1 tin đăng/],
    ["room turned into an aisle", layout.toggleEmptyCell(base, "s3"), async () => attached, /liên kết$/, /102.*1 tin đăng/],
    ["read failed", removed, offline, /Chưa kiểm tra được/, /102.*có thể bị gỡ/],
    ["no way to read", removed, undefined, /Chưa kiểm tra được/, /102.*có thể bị gỡ/],
  ];
  for (const [name, sent, read, title, text] of cases) {
    await t.test(name, async (scenario) => {
      const editor = await openDraft(scenario, sent, read && mapLinks(read));
      answer = false;
      editor.button("Lưu sơ đồ").onClick();
      await editor.settle();
      assert.equal(asked.length, 1);
      assert.equal(asked[0].tone, "warning");
      assert.match(asked[0].title, title);
      assert.match(renderToStaticMarkup(asked[0].description), text);
      assert.equal(api.saveLayout.mock.callCount(), 0);
      assert.deepEqual(readStoredDraft(userId, branchId), { revision: 4, draft: sent });

      answer = true;
      editor.button("Lưu sơ đồ").onClick();
      await editor.settle();
      assert.equal(asked.length, 2);
      assert.deepEqual(api.saveLayout.mock.calls[0].arguments, [branchId, layout.toSaveRequest(sent, 4)]);
    });
  }
});

test("no confirmation when the new read shows nothing attached; a save that loses no room reads nothing", async (t) => {
  const base = savedDraft();
  const cases = [
    ["nothing attached", layout.removeSlot(base, "s3"), 1],
    ["rename only", layout.setRoomCode(base, "s1", "A01"), 0],
  ];
  for (const [name, sent, reads] of cases) {
    await t.test(name, async (scenario) => {
      const read = scenario.mock.fn(async () => new Map());
      const editor = await openDraft(scenario, sent, mapLinks(read));
      editor.button("Lưu sơ đồ").onClick();
      await editor.settle();
      assert.equal(read.mock.callCount(), reads);
      assert.equal(asked.length, 0);
      assert.equal(api.saveLayout.mock.callCount(), 1);
    });
  }
});

test("while the links are being read the draft is locked and a second click sends nothing more", async (t) => {
  const sent = layout.removeSlot(savedDraft(), "s3");
  const pending = Promise.withResolvers();
  const read = t.mock.fn(() => pending.promise);
  const editor = await openDraft(t, sent, mapLinks(read));
  const save = editor.button("Lưu sơ đồ");
  save.onClick();
  save.onClick();
  editor.render();
  const busy = editor.button("Đang lưu…");
  assert.equal(busy["aria-disabled"], true);
  busy.onClick();
  assert.equal(editor.button("Hủy thay đổi").disabled, true);
  assert.equal(editor.button("Hoàn tác").disabled, true);
  assert.equal(read.mock.callCount(), 1);
  assert.equal(api.saveLayout.mock.callCount(), 0);
  assert.deepEqual(readStoredDraft(userId, branchId), { revision: 4, draft: sent });

  pending.resolve(new Map());
  await editor.settle();
  assert.equal(api.saveLayout.mock.callCount(), 1);
});

test("leaving the editor during the links read sends no PUT and keeps the stored draft", async (t) => {
  const sent = layout.removeSlot(savedDraft(), "s3");
  const pending = Promise.withResolvers();
  const editor = await openDraft(t, sent, mapLinks(() => pending.promise));
  editor.button("Lưu sơ đồ").onClick();
  editor.unmount();
  pending.resolve(new Map());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(api.saveLayout.mock.callCount(), 0);
  assert.deepEqual(readStoredDraft(userId, branchId), { revision: 4, draft: sent });
});

test("confirming a link away from the editor during the links read sends no PUT", async (t) => {
  const sent = layout.removeSlot(savedDraft(), "s3");
  const pending = Promise.withResolvers();
  const editor = await openDraft(t, sent, mapLinks(() => pending.promise));
  const here = "https://test.invalid/dashboard/branches/branch-a";
  global.window.location = new URL(here);
  global.window.closest = () => ({ href: "https://test.invalid/dashboard", target: "", hasAttribute: () => false });
  router.push = t.mock.fn();
  editor.button("Lưu sơ đồ").onClick();
  editor.render();
  global.window.dispatchEvent(Object.assign(new Event("click"), { button: 0 }));
  await editor.settle();
  pending.resolve(new Map());
  await editor.settle();
  assert.equal(router.push.mock.callCount(), 1);
  assert.equal(api.saveLayout.mock.callCount(), 0);
});

test("the map reads the links anew for a save and never answers from the ones on screen", async () => {
  let read = async () => ({ rooms: [], unplaced: { items: [], page: 0, size: 20, totalElements: 0 } });
  const Child = () => null;
  const BranchMap = loadTs("components/branch/BranchMap.tsx", {
    react: {
      useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
      useRef: (current) => ({ current }),
      useCallback: (callback) => callback,
      useMemo: (create) => create(),
      useEffect: () => {},
    },
    "next/navigation": { useSearchParams: () => new URLSearchParams() },
    "@/services/branch-assignment.service": { getAssignments: (...args) => read(...args) },
    "@/services/branch-overview.service": { isMonth: () => false, isOverviewLayer: () => false },
    "./BranchOverviewLayers": {},
    "./BranchLayoutEditor": Child,
    "./RoomPanel": {},
    "./UnplacedTray": {},
    "./LayoutBoard": {},
    "./linkUi": {},
  }).default;
  const { links } = BranchMap({ branchId }).props.children.find((node) => node?.type === Child).props;
  assert.equal((await links.readRooms()).size, 0);
  read = async (id) => ({ rooms: [{ roomId: id }] });
  assert.deepEqual([...(await links.readRooms()).keys()], [branchId]);
  read = offline;
  await assert.rejects(links.readRooms(), /offline/);
});
