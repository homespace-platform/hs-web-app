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
  assert.match(detail,/Chỉ nhận cọc chưa tạo bản nháp/);
  assert.match(detail,/onboarding\.message/);
  assert.doesNotMatch(detail,/Hệ thống đang tự tạo bản nháp/);
});

test('empty contract lists describe the automatic workflow and never ask the owner to create manually',()=>{
  const list=read('components/contract/ContractListView.tsx');
  assert.match(list,/tự tạo bản nháp khi đã xác nhận đủ cọc và tiền thuê tháng đầu/);
  assert.match(list,/mẫu hợp đồng đã phát hành/);
  assert.doesNotMatch(list,/Bạn có thể tạo hợp đồng từ|xác nhận cọc và tạo hợp đồng/);
});
test('a missing draft is retried rather than cached forever',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');
  assert.match(list,/!contractsByRequest\[request.id\]/);
  assert.match(list,/void loadContracts\(\)/);
  assert.match(list,/window.clearInterval\(interval\)/);
});
