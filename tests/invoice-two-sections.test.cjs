const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript");
const React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
function load(file) {
  const module={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`)(name=>name.startsWith("@/lib/")?load(name.replace("@/","")+".ts")
    :name==="next/link"?{default:props=>React.createElement("a",props,props.children)}:require(name),module,module.exports);
  return module.exports;
}
const Card=load("components/dashboard/invoices/ContractPaymentCard.tsx").default;
test("real card renders two financial sections, month-one invoice and retained deposit without initial block",()=>{
  const html=renderToStaticMarkup(React.createElement(Card,{role:"landlord",bundle:{
    contract:{id:"root",contractNumber:"HD-TEST",status:"CANCELLED"},invoices:[{id:"first",status:"PAID",totalAmount:5000000,periodIndex:-1}],payments:[],
    onboarding:{deposit:{status:"RETAINED_BY_LANDLORD",heldAmount:0,retainedAmount:10000000,retainedReason:"Quá hạn sau thông báo"}}}}));
  assert.equal((html.match(/section=monthly/g)||[]).length,1);assert.equal((html.match(/section=deposit/g)||[]).length,1);
  assert.match(html,/md:grid-cols-2/);assert.match(html,/Hóa đơn theo kỳ/);assert.match(html,/Cọc &amp; hoàn cọc/);
  assert.match(html,/Chủ nhà đã giữ cọc/);assert.match(html,/10.000.000/);assert.doesNotMatch(html,/Thanh toán ban đầu|section=initial/);
});
