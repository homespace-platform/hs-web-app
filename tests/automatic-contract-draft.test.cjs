const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('automatic workflow stays on Core with an explicit owner fallback shared by list and detail',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');
  const detail=read('components/rental-request/RentalRequestDetailModal.tsx');
  assert.match(list,/const handleCreateDraft = async/);
  assert.match(list,/<RentalContractFallbackButton/);
  assert.match(detail,/<RentalContractFallbackButton/);
  assert.match(detail,/onCreate=\{onCreateDraft\}/);
  assert.doesNotMatch(detail,/Chỉ nhận cọc chưa tạo bản nháp/);
  assert.match(detail,/Hợp đồng cọc được lập sau khi xác nhận nhận cọc/);
  assert.match(detail,/Hợp đồng thuê được chuẩn bị riêng/);
  assert.match(detail,/onboarding\.message/);
  assert.doesNotMatch(detail,/Hệ thống đang tự tạo bản nháp/);
});

test('empty contract lists describe the automatic workflow and never ask the owner to create manually',()=>{
  const list=read('components/contract/ContractListView.tsx');
  assert.match(list,/Hợp đồng cọc sẽ xuất hiện sau khi xác nhận nhận cọc/);
  assert.match(list,/ưu tiên hiển thị hợp đồng thuê và giữ lại tài liệu cọc/);
  assert.doesNotMatch(list,/Bạn có thể tạo hợp đồng từ|xác nhận cọc và tạo hợp đồng/);
});
test('a missing draft is retried rather than cached forever',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');
  assert.match(list,/getByRentalRequest\(r.id, true\)/);
  assert.match(list,/setAgreementsByRequest/);
  assert.match(list,/void loadContracts\(\)/);
  assert.match(list,/window.clearInterval\(interval\)/);
});
