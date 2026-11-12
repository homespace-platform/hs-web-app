import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "services/notification.service.ts");
const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const moduleRef = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(
  (name) => {
    if (name === "@/lib/axios-client") return {};
    if (name === "@/types/notification.type") return { NOTIFICATION_CATEGORIES: [] };
    return nodeRequire(name);
  },
  moduleRef,
  moduleRef.exports,
);

const { getNotificationTag, getNotificationRecipientSideLabel } = moduleRef.exports;
const item = (type, recipientSide = "OWNER") => ({
  category: "APPOINTMENT",
  type,
  metadata: { recipientSide },
});

test("appointment badges distinguish each booking event in a narrow dropdown", () => {
  const expected = {
    BOOKING_REQUESTED: "Đặt mới",
    BOOKING_CONFIRMED: "Xác nhận",
    BOOKING_REJECTED: "Từ chối",
    BOOKING_RESCHEDULE_REQUESTED: "Đổi lịch",
    BOOKING_RESCHEDULE_APPROVED: "Đổi lịch ✓",
    BOOKING_RESCHEDULE_REJECTED: "Đổi lịch ×",
    BOOKING_CANCELLED: "Đã hủy",
    BOOKING_COMPLETED: "Hoàn tất",
    BOOKING_EXPIRED: "Hết hạn",
  };
  for (const [type, label] of Object.entries(expected)) {
    assert.equal(getNotificationTag(item(type)), label, type);
  }
  assert.equal(new Set(Object.values(expected)).size, Object.keys(expected).length);
});

test("legacy event types keep the category badge and side is shown only when known", () => {
  assert.equal(getNotificationTag(item("SOMETHING_NEW")), "Lịch hẹn");
  assert.equal(getNotificationTag(item("toString")), "Lịch hẹn");
  assert.equal(getNotificationTag({ ...item("BOOKING_REQUESTED"), category: "SYSTEM" }), "Hệ thống");
  assert.equal(getNotificationRecipientSideLabel(item("BOOKING_REQUESTED", "OWNER")), "Vai trò chủ nhà");
  assert.equal(getNotificationRecipientSideLabel(item("BOOKING_CONFIRMED", "RENTER")), "Vai trò người thuê");
  assert.equal(getNotificationRecipientSideLabel(item("BOOKING_REQUESTED", "OTHER")), null);
  assert.equal(getNotificationRecipientSideLabel({ ...item("BOOKING_REQUESTED"), metadata: null }), null);
});
