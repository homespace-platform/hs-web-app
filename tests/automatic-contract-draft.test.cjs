const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

test('automatic workflow stays on Core with an explicit owner fallback shared by list and detail',()=>{
  const list=read('components/rental-request/RentalRequestsManagement.tsx');
  const card=read('components/rental-request/RentalRequestCard.tsx');
  const detail=read('components/rental-request/RentalRequestDetailModal.tsx');
  assert.match(list,/const handleCreateDraft = async/);
  assert.match(card,/<RentalContractFallbackButton/);
  assert.match(detail,/<RentalContractFallbackButton/);
  assert.match(detail,/onCreate=\{onCreateDraft\}/);
  assert.doesNotMatch(detail,/Chỉ nhận cọc chưa tạo bản nháp/);
  // The detail modal now explains the next step through NextActionCard; the contract-lifecycle copy lives on the request card.
  assert.match(detail,/<NextActionCard/);
  assert.match(detail,/onboarding\?\.message/);
  assert.match(card,/Hợp đồng cọc có thể xem và ký ngay sau khi xác nhận nhận tiền/);
  assert.match(card,/Hợp đồng thuê được chuẩn bị khi đến ngày bắt đầu thuê/);
  assert.doesNotMatch(detail,/Hệ thống đang tự tạo bản nháp/);
});

test('empty contract lists describe the automatic workflow and never ask the owner to create manually',()=>{
  const list=read('components/contract/ContractListView.tsx');
  assert.match(list,/hợp đồng cọc sẽ xuất hiện sau khi xác nhận nhận cọc/);
  assert.match(list,/role="tablist"/);
  assert.match(list,/agreementKind,/);
  assert.doesNotMatch(list,/Bạn có thể tạo hợp đồng từ|xác nhận cọc và tạo hợp đồng/);
});
test('a missing draft is retried rather than cached forever',()=>{
  const contracts=read('components/rental-request/useRequestContracts.ts');
  assert.match(contracts,/getByRentalRequest\(id, true\)/);
  assert.match(contracts,/setAgreementsByRequest/);
  assert.match(contracts,/void lookup\(/);
  assert.match(contracts,/window.clearInterval\(interval\)/);
});
