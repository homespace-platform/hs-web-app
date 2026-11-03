const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const mod={exports:{}};
const source=fs.readFileSync(path.join(__dirname,"../components/contract/detail/InlineAmendmentFields.tsx"),"utf8");
vm.runInThisContext(`(function(require,module,exports){${ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}\n})`)(name=>{
  if(name==="./ContractAmendmentWorkspace")return {useAmendmentWorkspace:()=>undefined};
  if(name.startsWith("@/")||name==="./ContractFieldState")return {};
  return require(name);
},mod,mod.exports);
const rules={paymentWindowDays:5,paymentDueOffsetDays:4,lateFeeGraceDays:0,overdueActionDays:5,maximumPenaltyDays:5,autoRolloverDays:10,terminationReviewHours:24};
const render=policies=>renderToStaticMarkup(React.createElement(mod.exports.BillingSystemRuleLabels,{policies}));
test("five day penalty, ten day rollover and 24 hour review remain separate in the real labels",()=>{
  const html=render({billingRules:rules,latePaymentFeeMode:"FIXED_PER_DAY",latePaymentFeeAmount:100000});
  assert.match(html,/100.000 đ\/ngày × 5 ngày = 500.000 đ/);assert.match(html,/Tối đa 5 ngày tính phạt/);
  assert.match(html,/Sau hết 10 ngày: chốt công nợ/);assert.match(html,/cửa sổ khiếu nại 24 giờ/);
});
test("old metadata cannot advertise a ten day penalty and lower signed caps are preserved without mutation",()=>{
  const policy={billingRules:{...rules,maximumPenaltyDays:10},latePaymentFeeMode:"FIXED_PER_DAY",latePaymentFeeAmount:100000,latePaymentFeeCap:200000,latePaymentFeeGraceDays:2};
  const original=JSON.stringify(policy),html=render(policy);assert.match(html,/Tối đa 5 ngày tính phạt/);assert.match(html,/200.000 đ/);assert.match(html,/sau 2 ngày ân hạn/);
  assert.doesNotMatch(html,/Tối đa 10 ngày tính phạt/);assert.equal(JSON.stringify(policy),original);
});
test("one time and absent penalties do not acquire a daily multiplier",()=>{
  assert.match(render({billingRules:rules,latePaymentFeeMode:"NONE"}),/Không áp dụng phí phạt/);
  const once=render({billingRules:rules,latePaymentFeeMode:"FIXED_ONCE",latePaymentFeeAmount:100000});
  assert.match(once,/Chỉ thu một lần/);assert.doesNotMatch(once,/ngày × 5 ngày/);
});
