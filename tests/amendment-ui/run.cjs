/* Isolated browser fixtures: real components, fake API, no user session or SmartCA/payment writes. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const webpack = require("next/dist/compiled/webpack/webpack");
const { chromium } = require(process.argv[2] || "playwright");
const root = path.resolve(__dirname,"../.."), output = path.join(__dirname,"output");
const exempt = ["FREE","INCLUDED","NOT_APPLICABLE"];
const billingMethodsByChargeType = {INTERNET:["PER_MONTH",...exempt],SERVICE_OR_GARBAGE:["PER_MONTH","PER_PERSON_MONTH",...exempt],MOTORBIKE_PARKING:["PER_VEHICLE_MONTH",...exempt],CAR_PARKING:["PER_VEHICLE_MONTH",...exempt],MANAGEMENT:["PER_MONTH","PER_M2_MONTH",...exempt],ELECTRICITY:["PER_KWH",...exempt],WATER:["PER_M3","PER_PERSON_MONTH","PER_MONTH",...exempt],OTHER:["PER_MONTH","PER_PERSON_MONTH",...exempt]};
const baseline = {
  serverNow:"2026-10-14T03:00:00Z",canPropose:true,currentTermsRevisionId:"original",availableDates:["2026-11-14","2026-12-14"],proposals:[],
  currentTerms:{billingRules:{paymentWindowDays:5,paymentDueOffsetDays:4,lateFeeGraceDays:0,overdueActionDays:5,maximumPenaltyDays:10},financial:{amountValue:"12400000",amountNumber:"12.400.000 VNĐ/tháng",depositAmountNumber:"24.800.000 VNĐ"},tenant:{occupantCount:4,motorbikeCount:0,carCount:0},property:{maxOccupants:4},
    charges:[],equipments:[{name:"Giường",quantity:1,condition:"Còn tốt"}],amenities:[],policies:{petsAllowed:false},specialTerms:"Điều khoản gốc"},
};
async function bundle() {
  await new Promise((resolve,reject) => webpack.webpack({mode:"development",target:"web",context:root,entry:path.join(__dirname,"harness.tsx"),output:{path:output,filename:"bundle.js"},devtool:false,
    resolve:{extensions:[".tsx",".ts",".mjs",".js"],alias:{"@":root}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(__dirname,"loader.cjs")},{test:/\.css$/,type:"asset/source"}]},
    plugins:[new webpack.webpack.DefinePlugin({"process.env":JSON.stringify({NODE_ENV:"development"}),"process.env.NEXT_PUBLIC_GATEWAY_BASE_URL":JSON.stringify("http://localhost"),"process.env.NEXT_PUBLIC_KEYCLOAK_BASE_URL":JSON.stringify("http://localhost/auth"),"process.env.NEXT_PUBLIC_KEYCLOAK_REALM":JSON.stringify("fixture"),"process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID":JSON.stringify("fixture"),"process.env.__NEXT_ROUTER_BASEPATH":JSON.stringify(""),"process.env.__NEXT_I18N_SUPPORT":"false","process.env.__NEXT_APP_BASE_PATH":JSON.stringify("")})]
  },(error,stats) => error ? reject(error) : stats.hasErrors() ? reject(new Error(stats.toString({all:false,errors:true}))) : resolve()));
  const css = await require("postcss")([require("@tailwindcss/postcss")({base:root})]).process(fs.readFileSync(path.join(root,"app/globals.css"),"utf8"),{from:path.join(root,"app/globals.css")});
  fs.writeFileSync(path.join(output,"style.css"),css.css + "\n" + fs.readFileSync(require.resolve("react-day-picker/style.css"),"utf8"));
}
async function fixturePage(browser,data,role,viewport={width:1280,height:900}) {
  const page = await browser.newPage({viewport}), requests=[],errors=[];
  page.on("pageerror",e => errors.push(e.message));
  await page.context().route("**/*",async route => {
    const req=route.request(),url=new URL(req.url()),method=req.method(),body=["POST","PUT"].includes(method) ? req.postDataJSON() : null;
    const fulfill = result => route.fulfill({json:{result}});
    if (url.pathname === "/bundle.js") return route.fulfill({contentType:"application/javascript; charset=utf-8",body:fs.readFileSync(path.join(output,"bundle.js"))});
    if (url.pathname === "/style.css") return route.fulfill({contentType:"text/css",body:fs.readFileSync(path.join(output,"style.css"))});
    if(url.pathname.endsWith(".js")&&fs.existsSync(path.join(output,path.basename(url.pathname))))return route.fulfill({contentType:"application/javascript",body:fs.readFileSync(path.join(output,path.basename(url.pathname)))});
    if(url.hostname==="unpkg.com"&&url.pathname.endsWith("pdf.worker.min.mjs"))return route.fulfill({contentType:"application/javascript",body:fs.readFileSync(require.resolve("pdfjs-dist/build/pdf.worker.min.mjs"))});
    if(data.historyFixture&&/^\/api\/v1\/contracts\/[^/]+$/.test(url.pathname)){
      requests.push({path:url.pathname,method,body});const id=url.pathname.split("/").pop();
      const contract=data.historyFixture.contract;
      return fulfill(id==="root"?(data.historyFixture.rootContract??contract):id===contract.id?contract:null);
    }
    if(data.historyFixture&&url.pathname==="/api/v1/contracts/root/effective-document"){
      requests.push({path:url.pathname,method,body});
      const doc=Object.values(data.historyFixture.files).flat().find(d=>d.id===(data.historyFixture.effectiveFileId??"root-final"));
      return fulfill(doc?{...doc,viewUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`,downloadUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`}:null);
    }
    if(data.historyFixture&&url.pathname.startsWith("/api/v1/contracts/documents/")){
      requests.push({path:url.pathname,method,body});
      const doc=Object.values(data.historyFixture.files).flat().find(d=>d.id===url.pathname.split("/").pop());
      return doc?fulfill({...doc,viewUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`,downloadUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`}):route.fulfill({status:404,json:{message:"No document"}});
    }
    if(data.historyFixture&&/\/api\/v1\/contracts\/[^/]+\/(documents|signatures\/state)$/.test(url.pathname)){
      const id=url.pathname.split("/")[4];requests.push({path:url.pathname,method,body});
      if(url.pathname.endsWith("/documents")){
        if(data.failDocumentOnce===id){delete data.failDocumentOnce;return route.fulfill({status:503,json:{message:"Fixture temporarily unavailable"}});}
        return fulfill((data.historyFixture.files[id]??[]).map(doc=>({...doc,viewUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`,downloadUrl:`http://localhost/files/${doc.id}.pdf?fresh=1`})));
      }
      return fulfill({signatureMode:"SMARTCA",smartCaEnabled:true,allRequests:data.historyFixture.signatures[id]??[]});
    }
    if(url.pathname.startsWith("/files/")){
      const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Contents 4 0 R >>","<< /Length 0 >>\nstream\n\nendstream"];
      let pdf="%PDF-1.4\n",offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
      const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return route.fulfill({contentType:"application/pdf",headers:{"access-control-allow-origin":"*"},body:Buffer.from(pdf)});
    }
    if (url.pathname.startsWith("/api/v1/contracts/root/amendments")) {
      if (body) requests.push({path:url.pathname,method,body});
      if (url.pathname.endsWith("/options")) return fulfill({listingId:"listing",category:"ROOM",billingMethodsByChargeType,amenities:[{code:"WIFI",name:"WiFi",scope:"Dùng chung",sourceType:"SHARED_PROPERTY",costText:"Theo biểu phí",conditionText:"Theo nội quy"},{code:"CUSTOM",name:"Sân phơi chung",scope:"Dùng chung",sourceType:"CUSTOM",costText:"Theo biểu phí",conditionText:"Theo nội quy"}],equipments:[{name:"Máy giặt",quantity:1,condition:"Còn tốt"}],furnishingCatalog:[{code:"DESK",name:"Bàn làm việc"}]});
      if (url.pathname.endsWith("/draft")) { if (method === "PUT") data.draft=body; if (method === "DELETE") data.draft=null; return fulfill(data.draft ?? null); }
      if (url.pathname.endsWith("/preview")) return fulfill({terms:data.currentTerms,comparison:body.changes.rentAmount ? [{field:"rentAmount",label:"Giá thuê / tháng",before:"12400000",after:body.changes.rentAmount}] : [{field:"policies.petsAllowed",label:"Vật nuôi",before:"Không được phép",after:"Được phép"}]});
      if (url.pathname.endsWith("/decision")) {
        const p=data.proposals.find(p => url.pathname.includes(p.id));
        if (url.pathname.includes("/tenant-requests/")) p.status=body.action === "ACCEPT" ? "TENANT_ACCEPTED" : "TENANT_REJECTED";
        else if (body.action === "APPROVE") { p.status="APPROVED";p.agreementContractId="appendix";p.agreementStatus="DRAFT"; }
        else p.status=body.action === "REQUEST_CHANGES" ? "CHANGES_REQUESTED" : body.action === "REJECT" ? "REJECTED" : "WITHDRAWN";
      } else if (body) {
        if (body.tenantRequestId) data.proposals.find(p => p.id === body.tenantRequestId).status="TENANT_FULFILLED";
        if (body.previousProposalId) {const previous=data.proposals.find(p => p.id === body.previousProposalId);if(previous.status!=="SCHEDULED")previous.status="SUPERSEDED";else previous.canReplace=false;}
        data.proposals.unshift({id:body.requestId,proposerId:role,recipientId:role === "owner" ? "tenant" : "owner",status:body.message ? "TENANT_REQUESTED" : "REQUESTED",effectiveOn:body.effectiveOn || "2026-10-14",immediateEffect:!!body.changes?.applyImmediately,reason:body.reason ?? body.message,changes:body.changes ?? {},comparison:body.message ? [] : body.changes.rentAmount ? [{field:"rentAmount",label:"Giá thuê / tháng",before:"12400000",after:body.changes.rentAmount}] : [{field:"policies.petsAllowed",label:"Vật nuôi",before:"Không được phép",after:"Được phép"}],evidenceIds:[],submittedAt:data.serverNow,respondBy:"2026-10-16T03:00:00Z",signBy:"2026-10-16T03:00:00Z"});
        data.canPropose=false;data.blockedReason="Hãy xử lý yêu cầu hiện tại trước.";
      }
      return fulfill(data);
    }
    if (url.pathname === "/") return route.fulfill({contentType:"text/html; charset=utf-8",body:'<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script>window.historyFixture='+JSON.stringify(data.historyFixture??null).replace(/</g,"\\u003c")+';window.exportFixture='+JSON.stringify(data.exportFixture??null).replace(/</g,"\\u003c")+'</script><script src="/bundle.js"></script></body></html>'});
    return route.abort();
  });
  await page.goto(`http://localhost/?role=${role}`); await page.getByRole("heading",{name:"Phụ lục & điều chỉnh",exact:true}).waitFor();
  return {page,requests,errors};
}
async function editRent(page) {
  await page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
  await assertChatClearance(page,page.getByRole("region",{name:"Thao tác lưu phụ lục"}));
  await page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).fill("12000000");
  await page.getByLabel("Lý do và mô tả thay đổi").fill("Hai bên thỏa thuận giảm giá thuê");
}
async function assertChatClearance(page,bar) {
  await bar.waitFor();
  const a=await bar.boundingBox(),b=await page.getByRole("button",{name:"Chat fixture",exact:true}).boundingBox();
  assert.ok(a&&b&&a.x+a.width+16<=b.x,`Contract action bar must sit left of chat with at least 16px clearance: ${JSON.stringify({a,b})}`);
  assert.ok(Math.abs(a.y+a.height-(b.y+b.height))<=2,`Action bar and chat must align along the bottom: ${JSON.stringify({a,b})}`);
}
async function reviewRent(page) { await editRent(page); await page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click(); await page.getByRole("dialog").waitFor(); }
(async () => {
  const utility = {};
  require("node:vm").runInNewContext(require("typescript").transpileModule(fs.readFileSync(path.join(root,"lib/vnd-input.ts"),"utf8"),{compilerOptions:{module:require("typescript").ModuleKind.CommonJS,target:require("typescript").ScriptTarget.ES2020}}).outputText,{exports:utility});
  assert.equal(utility.formatVndInput("30000.00"),"30.000");assert.equal(utility.formatVndInput("0.00"),"0");
  assert.equal(utility.parsePastedVnd("12.400.000 đ"),"12400000");assert.equal(utility.parsePastedVnd("100.00"),"100");
  assert.equal(utility.parsePastedVnd("12.400.000,00"),"12400000");assert.equal(utility.parsePastedVnd("100.50"),null);
  assert.equal(utility.parsePastedVnd("-100"),null);assert.equal(utility.parsePastedVnd("1e6"),null);
  assert.deepEqual(Array.from(utility.vndSuggestions("100")).slice(0,3),["1000","10000","100000"]);
  assert.equal(utility.vndSuggestions("1000000000").length,0);
  console.log("PASS currency normalization, safe paste and bounded suggestions");
  const policyUtilities = {};
  require("node:vm").runInNewContext(require("typescript").transpileModule(fs.readFileSync(path.join(root,"types/listing-policy.type.ts"),"utf8"),{compilerOptions:{module:require("typescript").ModuleKind.CommonJS,target:require("typescript").ScriptTarget.ES2020}}).outputText,{exports:policyUtilities});
  const posting = policyUtilities.policyInputs([{code:"petPolicy",value:"APPROVAL_REQUIRED",note:"  Giữ vệ sinh  "},{code:"quietHoursPolicy",value:" 23:00–06:00 "},{code:"alterationsPolicy",value:"ALLOWED"},{code:"smokingPolicy",value:""}],[{code:"petPolicy"},{code:"quietHoursPolicy"},{code:"smokingPolicy"}]);
  assert.equal(posting.length,2);assert.equal(posting[0].value,"APPROVAL_REQUIRED");assert.equal(posting[0].note,"Giữ vệ sinh");assert.equal(posting[1].value,"23:00–06:00");
  console.log("PASS posting policy payload filters category-only fields, preserves permission/notes and supports partial drafts");
  const typedInputs={};
  require("node:vm").runInNewContext(require("typescript").transpileModule(fs.readFileSync(path.join(root,"lib/contract-amendment-input.ts"),"utf8"),{compilerOptions:{module:require("typescript").ModuleKind.CommonJS,target:require("typescript").ScriptTarget.ES2020}}).outputText,{exports:typedInputs});
  assert.equal(typedInputs.amendmentDateInput("14/10/2026"),"2026-10-14");assert.equal(typedInputs.amendmentDateText("2026-11-14"),"14/11/2026");
  assert.equal(typedInputs.amendmentLeasePatch({startDateText:"31/01/2026",durationMonths:3},"durationMonths","1").endDateText,"27/02/2026");
  assert.equal(typedInputs.amendmentLeasePatch({startDateText:"14/10/2026",durationMonths:3},"durationMonths","6").endDateText,"13/04/2027");
  console.log("PASS typed date roundtrip and month-end lease calculations without timezone drift");
  await bundle(); const browser=await chromium.launch({headless:true,...(process.argv[3] ? {executablePath:process.argv[3]} : {})});
  try {
    if(process.argv[4]!=="--effective-documents-only") {
    for (const width of [1280,390]) {
      const exported=await fixturePage(browser,{...structuredClone(baseline),exportFixture:{status:"DRAFT",smartCaMode:true}},"owner",{width,height:900});
      const bar=exported.page.getByRole("region",{name:"Thao tác kết xuất hợp đồng"});
      await exported.page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      await bar.getByRole("button",{name:"Kết xuất file",exact:true}).waitFor();
      assert.equal(await bar.evaluate(el=>getComputedStyle(el).position),"fixed");
      const box=await bar.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=900,"Export bar stays in the viewport after scrolling");
      await assertChatClearance(exported.page,bar);
      assert.equal(await exported.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await exported.page.screenshot({path:path.join(output,`export-sticky-${width}.png`)});
      await bar.getByRole("button",{name:"Kết xuất file",exact:true}).click();
      await exported.page.waitForFunction(()=>window.scrollY===0);
      assert.equal(await bar.getByRole("button",{name:"Đang kết xuất...",exact:true}).isDisabled(),true);
      assert.equal(await exported.page.evaluate(()=>document.documentElement.dataset.exports),"1");
      await exported.page.evaluate(()=>window.finishFixtureExport());
      await exported.page.getByRole("status").filter({hasText:"PDF đã sẵn sàng để ký"}).waitFor();
      assert.equal(await bar.getByRole("button",{name:"Kết xuất file",exact:true}).isEnabled(),true);
      assert.equal(exported.errors.length,0);
      await exported.page.close();
    }
    for (const [role,status] of [["tenant","DRAFT"],["owner","ACTIVE"]]) {
      const hidden=await fixturePage(browser,{...structuredClone(baseline),exportFixture:{status,smartCaMode:true}},role);
      assert.equal(await hidden.page.getByRole("region",{name:"Thao tác kết xuất hợp đồng"}).count(),0);
      await hidden.page.close();
    }
    console.log("PASS sticky export on desktop/mobile, scroll to top, pending guard, ready-to-sign feedback and role/status permissions");
    for(const type of ["Nhà nguyên căn","Căn hộ chung cư","Phòng trọ"]) {
      const banks=structuredClone(baseline);
      banks.currentTerms.landlord={fullName:"Chủ nhà",bankName:"Ngân hàng A",bankAccountNumber:"000123456",bankAccountHolder:"CHU TAI KHOAN A"};
      Object.assign(banks.currentTerms.tenant,{bankName:"Ngân hàng B",bankAccountNumber:"000987654",bankAccountHolder:"CHU TAI KHOAN B"});
      banks.currentTerms.property.propertyType=type;
      banks.currentTerms.initialPayment={status:"CONFIRMED",totalAmount:37200000,monthlyRent:12400000,depositAmount:24800000,transferReference:"REF-INITIAL",payerReportedAt:"2026-10-15T01:00:00Z",payeeConfirmedAt:"2026-10-15T01:05:00Z",confirmedAt:"2026-10-15T01:05:00Z",bankTransactionReference:"BANK-INITIAL"};
      for(const role of ["owner","tenant"]) {
        const bankPage=await fixturePage(browser,banks,role,{width:390,height:900});
        const parties=bankPage.page.locator("#amendment-residents"),initial=bankPage.page.getByRole("region",{name:"Ghi nhận thanh toán ban đầu"});
        for(const value of ["Ngân hàng A","Ngân hàng B","000123456","000987654","CHU TAI KHOAN A","CHU TAI KHOAN B"])await parties.getByText(value,{exact:true}).waitFor();
        for(const value of ["REF-INITIAL","BANK-INITIAL"])await initial.getByText(value,{exact:true}).waitFor();
        assert.equal(await initial.locator("input,select,textarea").count(),0);
        assert.equal(await bankPage.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(type==="Nhà nguyên căn"&&role==="owner") {
          await parties.screenshot({path:path.join(output,"bank-accounts-mobile.png")});
          await initial.screenshot({path:path.join(output,"initial-payment-mobile.png")});
        }
        if(role==="owner") {
          await bankPage.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
          assert.equal(await bankPage.page.getByLabel("Số tài khoản",{exact:true}).first().inputValue(),"000123456");
          assert.equal(await bankPage.page.getByLabel("Số tài khoản",{exact:true}).last().inputValue(),"000987654");
          await bankPage.page.getByLabel("Số tài khoản",{exact:true}).first().fill("000111222");
          await bankPage.page.getByLabel("Số tài khoản",{exact:true}).last().fill("000333444");
          await bankPage.page.getByLabel("Lý do và mô tả thay đổi").fill("Đổi thông tin tài khoản trên văn bản phụ lục");
          await bankPage.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
          await bankPage.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
          await bankPage.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
          await bankPage.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
          const sent=bankPage.requests.find(r=>r.path.endsWith("/amendments")).body.changes;
          assert.equal(sent.fields.landlord.bankAccountNumber,"000111222");assert.equal(sent.fields.tenant.bankAccountNumber,"000333444");assert.equal(sent.fields.initialPayment,undefined);
          assert.equal(banks.currentTerms.landlord.bankAccountNumber,"000123456");assert.equal(banks.currentTerms.initialPayment.totalAmount,37200000);
        }
        assert.equal(bankPage.errors.length,0);await bankPage.page.close();
      }
    }
    console.log("PASS all three property categories: both bank snapshots visible to both parties, zero-prefixed accounts editable, ledger read-only and no premature application");
    const colorsData=structuredClone(baseline);
    colorsData.currentTerms.landlord={fullName:"Tên chủ nhà gốc",bankAccountNumber:"000123"};
    colorsData.currentTerms.lease={startDateText:"14/10/2026",endDateText:"13/01/2027",durationMonths:3,durationText:"3 tháng",handoverDateText:"14/10/2026"};
    colorsData.currentTerms.financial.amountWords="Mười hai triệu bốn trăm nghìn đồng";
    colorsData.currentTerms.equipments=[{name:"Giường",quantity:1,condition:"Còn tốt",note:""},{name:"Bàn",quantity:2,condition:"Mới",note:""}];
    colorsData.currentTerms.charges=[{name:"Internet",chargeType:"INTERNET",billingMethod:"PER_MONTH",unitAmount:"90000",includedInRent:false,note:"Ghi chú gốc"}];
    colorsData.currentTerms.policies.listingPolicies=[{code:"petPolicy",label:"Vật nuôi",valueType:"TEXT",value:"Không nuôi",displayValue:"Không nuôi"}];
    colorsData.currentTerms.property.features=[{featureName:"Diện tích đất",featureValue:"50 mét vuông"}];
    colorsData.currentTerms.initialPayment={status:"CONFIRMED",totalAmount:37200000,transferReference:"REF-COLOR"};
    const colors=await fixturePage(browser,colorsData,"owner");
    const fieldState=control=>control.locator('xpath=ancestor-or-self::*[@data-contract-field-state][1]');
    await colors.page.getByRole("complementary",{name:"Chú thích màu trường hợp đồng"}).waitFor();
    assert.equal(await colors.page.getByText("Tên chủ nhà gốc",{exact:true}).getAttribute("data-contract-field-state"),"editable");
    assert.equal(await colors.page.getByText("Mười hai triệu bốn trăm nghìn đồng",{exact:true}).getAttribute("data-contract-field-state"),"readonly");
    await colors.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    const nameInput=colors.page.getByLabel("Họ và tên",{exact:true}).first(),rentInput=colors.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true});
    const blue=await nameInput.evaluate(el=>getComputedStyle(el).color);
    assert.equal(await fieldState(nameInput).getAttribute("data-contract-field-state"),"editable");
    await nameInput.fill("Tên mới trên phụ lục");assert.equal(await fieldState(nameInput).getAttribute("data-contract-field-state"),"changed");
    assert.notEqual(await nameInput.evaluate(el=>getComputedStyle(el).color),blue);
    assert.equal(await nameInput.evaluate(el=>getComputedStyle(el).color),await colors.page.getByText("● Đã sửa trong bản đang soạn",{exact:true}).evaluate(el=>getComputedStyle(el).color));
    await nameInput.fill("Tên chủ nhà gốc");assert.equal(await fieldState(nameInput).getAttribute("data-contract-field-state"),"editable");
    assert.equal(await nameInput.evaluate(el=>getComputedStyle(el).color),blue);
    await rentInput.fill("12000000");assert.equal(await fieldState(rentInput).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Số tài khoản",{exact:true}).first().fill("123");assert.equal(await fieldState(colors.page.getByLabel("Số tài khoản",{exact:true}).first()).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Ngày bàn giao tài sản",{exact:true}).fill("2026-10-16");assert.equal(await fieldState(colors.page.getByLabel("Ngày bàn giao tài sản",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByRole("button",{name:"Xóa dòng equipments 1",exact:true}).click();
    assert.equal(await fieldState(colors.page.getByLabel("Số lượng 1",{exact:true})).getAttribute("data-contract-field-state"),"editable");
    await colors.page.getByLabel("Số lượng 1",{exact:true}).fill("3");assert.equal(await fieldState(colors.page.getByLabel("Số lượng 1",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    assert.equal(await fieldState(colors.page.getByLabel("Tên tài sản 1",{exact:true})).getAttribute("data-contract-field-state"),"editable");
    await colors.page.getByRole("button",{name:"Thêm dòng nội thất",exact:true}).click();assert.equal(await fieldState(colors.page.getByLabel("Tên tài sản 2",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Tên tài sản 2",{exact:true}).fill("Tủ mới");
    await colors.page.getByLabel("Hiện trạng 2",{exact:true}).fill("Mới");
    await colors.page.getByLabel("Đơn giá Internet (đ)",{exact:true}).fill("100000");assert.equal(await fieldState(colors.page.getByLabel("Đơn giá Internet (đ)",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Cách tính 1",{exact:true}).fill("Tháng");assert.equal(await fieldState(colors.page.getByLabel("Cách tính 1",{exact:true})).getAttribute("data-contract-field-state"),"editable");
    await colors.page.getByLabel("Vật nuôi",{exact:true}).fill("Cho nuôi mèo");assert.equal(await fieldState(colors.page.getByLabel("Vật nuôi",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).fill("60");assert.equal(await fieldState(colors.page.getByLabel("Giá trị đặc điểm 1",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Điều khoản thỏa thuận khác",{exact:true}).fill("Thỏa thuận sửa thêm");assert.equal(await fieldState(colors.page.getByLabel("Điều khoản thỏa thuận khác",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await colors.page.getByLabel("Cách tính phí chậm trả",{exact:true}).selectOption("FIXED_ONCE");assert.equal(await fieldState(colors.page.getByLabel("Cách tính phí chậm trả",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    const ledger=colors.page.getByRole("region",{name:"Ghi nhận thanh toán ban đầu"});assert.equal(await ledger.getByText("REF-COLOR",{exact:true}).getAttribute("data-contract-field-state"),"readonly");
    await colors.page.locator("#amendment-residents").screenshot({path:path.join(output,"field-colors-desktop.png")});
    await colors.page.setViewportSize({width:390,height:900});assert.equal(await colors.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await colors.page.locator("#amendment-equipments").screenshot({path:path.join(output,"field-colors-table-mobile.png")});
    await colors.page.getByLabel("Lý do và mô tả thay đổi").fill("Lưu nháp để kiểm tra màu thay đổi");await colors.page.getByRole("button",{name:"Lưu nháp",exact:true}).click();
    await colors.page.getByText("Đã lưu bản nháp riêng. Chưa gửi cho người thuê.",{exact:true}).waitFor();
    colors.page.on("dialog",dialog=>dialog.accept());await colors.page.reload();await colors.page.getByRole("button",{name:"Tiếp tục bản nháp",exact:true}).click();
    assert.equal(await fieldState(colors.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    assert.equal(await fieldState(colors.page.getByLabel("Họ và tên",{exact:true}).first()).getAttribute("data-contract-field-state"),"editable");
    assert.equal(colors.errors.length,0);await colors.page.close();
    console.log("PASS blue editable/black read-only/green changed fields, real CSS, revert, saved draft, dates/money/tables/policies, stable remaining rows and mobile layout");
    const data=structuredClone(baseline),owner=await fixturePage(browser,data,"owner");
    assert.equal(await owner.page.locator('input:not([type="hidden"]),select,textarea').count(),0);
    assert.equal(await owner.page.locator('#contract-amendment-actions').getByText(/^Đang áp dụng:/).count(),0);
    await reviewRent(owner.page); assert.equal(await owner.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).isDisabled(),true);
    await owner.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await owner.page.screenshot({path:path.join(output,"review-desktop.png"),fullPage:true});
    await owner.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await owner.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const sent=owner.requests.find(r => r.path.endsWith("/amendments")); assert.equal(sent.body.changes.rentAmount,"12000000");assert.equal(sent.body.effectiveOn,"2026-11-14");assert.equal(owner.errors.length,0);
    console.log("PASS read-only default, inline rent edit, comparison modal and explicit consent");
    const tenant=await fixturePage(browser,data,"tenant"); await tenant.page.getByRole("button",{name:"Xem nội dung đề xuất →"}).click();
    assert.equal(await tenant.page.getByRole("button",{name:"Đồng ý nội dung",exact:true}).isDisabled(),true);
    await tenant.page.getByRole("checkbox",{name:/Tôi đã đọc và đồng ý/}).check(); await tenant.page.getByRole("button",{name:"Đồng ý nội dung",exact:true}).click();
    await tenant.page.getByText("Bạn đã đồng ý nội dung. Chờ chủ nhà ký trước.").waitFor();
    assert.equal(await tenant.page.getByRole("link",{name:/Xem hồ sơ phụ lục/}).getAttribute("href"),"/dashboard/tenant/contracts/appendix"); assert.equal(tenant.errors.length,0);
    console.log("PASS tenant consent and landlord-first signing handoff");
    const requestData=structuredClone(baseline),wish=await fixturePage(browser,requestData,"tenant",{width:390,height:844});
    await wish.page.getByRole("button",{name:"Đề nghị điều chỉnh",exact:true}).click(); await wish.page.getByLabel("Nội dung đề nghị").fill("Tôi muốn giảm tiền phòng từ 2 triệu xuống 1 triệu");
    assert.equal(await wish.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).count(),0);
    await wish.page.screenshot({path:path.join(output,"tenant-request-mobile.png"),fullPage:true});
    await wish.page.getByRole("button",{name:"Gửi yêu cầu cho chủ nhà"}).click(); await wish.page.getByText("Người thuê đề nghị trao đổi",{exact:true}).waitFor();
    const requested=wish.requests.find(r => r.path.endsWith("/tenant-requests"));assert.equal(requested.body.changes,undefined);assert.equal(wish.errors.length,0);
    const responder=await fixturePage(browser,requestData,"owner"); await responder.page.getByRole("button",{name:"Chấp thuận trao đổi · Soạn phụ lục"}).click();
    await responder.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).fill("11000000"); await responder.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await responder.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();await responder.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await responder.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    assert.equal(responder.requests.find(r => r.path.endsWith("/amendments")).body.tenantRequestId,requested.body.requestId);assert.equal(responder.errors.length,0);
    console.log("PASS text-only tenant request, landlord acceptance and linked concrete proposal");
    const draftData=structuredClone(baseline),draft=await fixturePage(browser,draftData,"owner");await editRent(draft.page);
    await draft.page.getByLabel("Địa chỉ tài sản",{exact:true}).fill("Địa chỉ bản nháp nhập tay");
    await draft.page.getByRole("button",{name:"Lưu nháp",exact:true}).click();
    await draft.page.getByText("Đã lưu bản nháp riêng. Chưa gửi cho người thuê.").waitFor();assert.equal(draftData.proposals.length,0);
    await draft.page.reload();await draft.page.getByRole("button",{name:"Tiếp tục bản nháp"}).click();assert.equal(await draft.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).inputValue(),"12.000.000");
    assert.equal(await draft.page.getByLabel("Địa chỉ tài sản",{exact:true}).inputValue(),"Địa chỉ bản nháp nhập tay");
    console.log("PASS private server draft and reload/resume without proposal");
    const mobile=await fixturePage(browser,structuredClone(baseline),"owner",{width:390,height:844});await reviewRent(mobile.page);await mobile.page.screenshot({path:path.join(output,"review-mobile.png"),fullPage:true});
    assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);assert.equal(mobile.errors.length,0);
    console.log("PASS mobile inline editing and comparison without horizontal overflow");
    const calendar=await fixturePage(browser,structuredClone(baseline),"owner",{width:390,height:844});await editRent(calendar.page);
    await calendar.page.getByRole("button",{name:"Ngày dự kiến áp dụng",exact:true}).click();
    assert.equal(await calendar.page.getByRole("button",{name:"Ngày 13/11/2026",exact:true}).isDisabled(),true);
    assert.equal(await calendar.page.getByRole("button",{name:"Ngày 15/11/2026",exact:true}).isDisabled(),true);
    assert.equal(await calendar.page.getByRole("button",{name:"Ngày 14/11/2026",exact:true}).isDisabled(),false);
    await calendar.page.getByRole("button",{name:"Tháng sau",exact:true}).click();
    assert.equal(await calendar.page.getByRole("button",{name:"Ngày 13/12/2026",exact:true}).isDisabled(),true);
    await calendar.page.screenshot({path:path.join(output,"calendar-mobile.png"),fullPage:false});
    assert.equal(await calendar.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);
    await calendar.page.getByRole("button",{name:"Ngày 14/12/2026",exact:true}).click();
    await calendar.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await calendar.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();await calendar.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await calendar.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    assert.equal(calendar.requests.find(r => r.path.endsWith("/amendments")).body.effectiveOn,"2026-12-14");assert.equal(calendar.errors.length,0);
    const restrictedData=structuredClone(baseline);restrictedData.availableDates=["2026-12-14"];
    const restricted=await fixturePage(browser,restrictedData,"owner");await editRent(restricted.page);await restricted.page.getByRole("button",{name:"Ngày dự kiến áp dụng",exact:true}).click();
    assert.equal(await restricted.page.getByRole("button",{name:"Tháng trước",exact:true}).isDisabled(),true);
    assert.equal(await restricted.page.getByRole("button",{name:"Tháng sau",exact:true}).isDisabled(),true);
    assert.equal(await restricted.page.getByRole("button",{name:"Ngày 15/12/2026",exact:true}).isDisabled(),true);assert.equal(restricted.errors.length,0);
    console.log("PASS calendar permits only backend billing boundaries and prevents navigation outside eligible months");
    const moneyData=structuredClone(baseline);moneyData.currentTerms.financial.amountValue="12400000.00";
    moneyData.currentTerms.charges=[{name:"Điện",chargeType:"ELECTRICITY",billingMethod:"PER_KWH",unitAmount:"3500.00",includedInRent:false},{name:"Gửi xe máy",chargeType:"MOTORBIKE_PARKING",billingMethod:"PER_VEHICLE_MONTH",unitAmount:"0.00",includedInRent:true}];
    const monetary=await fixturePage(browser,moneyData,"owner",{width:390,height:844});await monetary.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    const rent=monetary.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}), electricity=monetary.page.getByLabel("Đơn giá Điện (đ)",{exact:true}), parking=monetary.page.getByLabel("Đơn giá Gửi xe máy (đ)",{exact:true});
    assert.equal(await rent.inputValue(),"12.400.000");assert.equal(await electricity.inputValue(),"3.500");assert.equal(await parking.inputValue(),"0");
    await rent.fill("100");assert.equal(await rent.inputValue(),"100");
    const picks=monetary.page.getByRole("group",{name:"Gợi ý số tiền Tiền thuê hàng tháng (đ)",exact:true});
    await picks.getByRole("button",{name:"1.000 đ",exact:true}).waitFor();await picks.getByRole("button",{name:"10.000 đ",exact:true}).waitFor();
    await rent.evaluate(el => el.scrollIntoView({behavior:"instant",block:"center"}));
    await monetary.page.screenshot({path:path.join(output,"money-suggestions-mobile.png"),fullPage:false});
    assert.equal(await monetary.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true);
    await picks.getByRole("button",{name:"1.000.000 đ",exact:true}).click();assert.equal(await rent.inputValue(),"1.000.000");
    await parking.fill("123456");assert.equal(await parking.inputValue(),"123.456");
    await parking.evaluate(el => el.setSelectionRange(5,5));await parking.press("9");assert.equal(await parking.inputValue(),"1.234.956");
    await parking.fill("10000");await parking.evaluate(el => el.setSelectionRange(3,3));await parking.press("Backspace");assert.equal(await parking.inputValue(),"1.000");
    await electricity.fill("4000");assert.equal(await electricity.inputValue(),"4.000");
    await monetary.page.getByLabel("Lý do và mô tả thay đổi").fill("Điều chỉnh giá và đơn giá điện theo thỏa thuận");
    await monetary.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();await monetary.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();await monetary.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await monetary.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();const moneyPayload=monetary.requests.find(r => r.path.endsWith("/amendments")).body;
    assert.equal(moneyPayload.changes.rentAmount,"1000000");assert.equal(moneyPayload.changes.charges[0].unitAmount,"4000");assert.equal(moneyPayload.changes.charges[1].unitAmount,"1000");assert.equal(monetary.errors.length,0);
    console.log("PASS formatted rent/rates, explicit amount suggestions, caret editing and integer-only payload");
    const equipment=await fixturePage(browser,structuredClone(baseline),"owner");
    await equipment.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    assert.equal(await equipment.page.locator('select').count(),1,"Only late-fee mode uses a bounded dropdown");
    await equipment.page.getByRole("button",{name:"Thêm dòng nội thất",exact:true}).click();
    await equipment.page.getByLabel("Tên tài sản 2",{exact:true}).fill("Đàn piano không có trên Listing");
    await equipment.page.getByLabel("Hiện trạng 2",{exact:true}).fill("Mới, bàn giao ngày áp dụng");
    await equipment.page.getByRole("button",{name:"Xóa dòng equipments 1",exact:true}).click();
    await equipment.page.getByRole("button",{name:"Thêm dòng tiện ích",exact:true}).click();
    await equipment.page.getByLabel("Tiện ích 1",{exact:true}).fill("Phòng đọc sách tự nhập");
    assert.equal(await equipment.page.getByLabel("Phạm vi 1",{exact:true}).count(),0);
    assert.equal(await equipment.page.getByLabel("Chi phí 1",{exact:true}).count(),0);
    assert.equal(await equipment.page.getByLabel("Điều kiện 1",{exact:true}).count(),0);
    assert.equal(await equipment.page.getByRole("radio").count(),0,"Non-financial amendments cannot apply immediately either");
    await equipment.page.getByLabel("Lý do và mô tả thay đổi").fill("Bổ sung piano và phòng đọc theo thỏa thuận riêng");
    await equipment.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await equipment.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await equipment.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await equipment.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const immediate=equipment.requests.find(r=>r.path.endsWith("/amendments"));
    assert.equal(immediate.body.effectiveOn,"2026-11-14");assert.equal(immediate.body.changes.freeForm,true);assert.equal(immediate.body.changes.applyImmediately,undefined);
    assert.equal(immediate.body.changes.equipments.length,1);
    assert.equal(immediate.body.changes.equipments[0].name,"Đàn piano không có trên Listing");
    assert.equal(immediate.body.changes.amenities[0].name,"Phòng đọc sách tự nhập");
    assert.equal("scope" in immediate.body.changes.amenities[0],false);
    assert.equal("costText" in immediate.body.changes.amenities[0],false);
    assert.equal("conditionText" in immediate.body.changes.amenities[0],false);
    assert.equal(equipment.requests.some(r=>r.path.endsWith("/options")),false);assert.equal(equipment.errors.length,0);
    console.log("PASS free table add/remove and hand-entered equipment/amenities without listing API");

    const fieldData=structuredClone(baseline);
    fieldData.currentTerms.landlord={fullName:"Chủ nhà",idNumber:"123",phone:"0901"};
    fieldData.currentTerms.lease={startDateText:"14/10/2026",endDateText:"13/01/2027",durationMonths:3};
    fieldData.currentTerms.property={maxOccupants:4,areaText:"50 m²",fullAddress:"Địa chỉ ban đầu",features:[{featureName:"Số người tối đa",featureValue:"4 người"},{featureName:"Diện tích đất",featureValue:"50 m²"}]};
    fieldData.currentTerms.charges=[{name:"Internet / WiFi",chargeType:"INTERNET",billingMethod:"PER_MONTH",unitAmount:"90000",includedInRent:false}];
    const fields=await fixturePage(browser,fieldData,"owner",{width:390,height:844});
    await fields.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    await fields.page.getByLabel("Địa chỉ tài sản",{exact:true}).fill("Địa chỉ đã đối chiếu mới");
    await fields.page.getByLabel("Số điện thoại",{exact:true}).first().fill("0901234567");
    assert.equal(await fields.page.getByLabel("Số căn / phòng",{exact:true}).inputValue(),"Toàn bộ căn");
    assert.equal(await fields.page.getByLabel("Họ và tên",{exact:true}).first().isDisabled(),false);
    await fields.page.getByLabel("Họ và tên",{exact:true}).first().fill("Tên chủ nhà trên phụ lục");
    await fields.page.getByLabel("Số CCCD / Định danh",{exact:true}).first().fill("00123456");
    await fields.page.getByLabel("Số tài khoản",{exact:true}).first().fill("0001234");
    assert.equal(await fields.page.getByLabel("Ngày kết thúc hợp đồng",{exact:true}).isDisabled(),false);
    for(const label of ["Ngày bắt đầu tính tiền thuê","Ngày kết thúc hợp đồng","Ngày bàn giao tài sản"]) assert.equal(await fields.page.getByLabel(label,{exact:true}).getAttribute("type"),"date");
    await fields.page.getByLabel("Ngày bàn giao tài sản",{exact:true}).fill("2026-10-16");
    await fields.page.getByLabel("Kỳ hạn thanh toán",{exact:true}).fill("Mỗi 3 tháng");
    await fields.page.getByLabel("Tiền đặt cọc bảo đảm (đ)",{exact:true}).fill("20000000");
    for(const label of ["Số người cư trú","Xe máy đăng ký","Ô tô đăng ký","Số người tối đa","Số xe tối đa","Số tháng thuê","Số lượng 1"])assert.equal(await fields.page.getByLabel(label,{exact:true}).getAttribute("type"),"number");
    await fields.page.getByLabel("Số người tối đa",{exact:true}).fill("6");
    assert.equal(await fields.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).inputValue(),"6");
    await fields.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).fill("5");
    assert.equal(await fields.page.getByLabel("Số người tối đa",{exact:true}).inputValue(),"5");
    assert.equal(await fields.page.getByRole("button",{name:"Thêm đặc điểm",exact:true}).count(),0);
    assert.equal(await fields.page.getByRole("button",{name:/Xóa đặc điểm/}).count(),0);
    assert.equal(await fields.page.getByLabel("Tên đặc điểm 2",{exact:true}).count(),0);
    await fields.page.getByLabel("Giá trị đặc điểm 2",{exact:true}).fill("55.5");
    await fields.page.getByLabel("Cách tính 1",{exact:true}).fill("Người / tháng");
    await fields.page.getByRole("button",{name:"Thêm dòng phí",exact:true}).click();
    await fields.page.getByLabel("Khoản phí 2",{exact:true}).fill("Phí thỏa thuận riêng");
    await fields.page.getByRole("button",{name:"Xóa dòng charges 2",exact:true}).click();
    const tops=await fields.page.locator("#amendment-charges tbody tr").first().evaluate(row=>Array.from(row.querySelectorAll("input")).slice(0,2).map(input=>input.getBoundingClientRect().top));
    assert.ok(Math.abs(tops[0]-tops[1])<=1,"Charge inputs must share the same top edge: "+tops.join(","));
    assert.equal(await fields.page.locator("select").count(),1,"Only the bounded late-fee mode uses a dropdown");
    assert.equal(await fields.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await fields.page.screenshot({path:path.join(output,"free-form-mobile.png"),fullPage:true});
    await fields.page.locator("#amendment-property").screenshot({path:path.join(output,"free-form-property.png")});
    await fields.page.locator("#amendment-charges").screenshot({path:path.join(output,"free-form-charges.png")});
    await fields.page.getByLabel("Lý do và mô tả thay đổi").fill("Hiệu chỉnh thông tin và cách tính theo thỏa thuận");
    await fields.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await fields.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await fields.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await fields.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const fieldPayload=fields.requests.find(r=>r.path.endsWith("/amendments")).body.changes;
    assert.equal(fieldPayload.fields.property.fullAddress,"Địa chỉ đã đối chiếu mới");
    assert.equal(fieldPayload.fields.landlord.phone,"0901234567");
    assert.equal(fieldPayload.featureRows.length,2);
    assert.equal(fieldPayload.featureRows.find(r=>r.featureName==="Diện tích đất").featureValue,"55.5 mét vuông");
    assert.equal(fieldPayload.fields.property.maxOccupants,"5");
    assert.equal(fieldPayload.charges[0].billingMethod,"Người / tháng");
    assert.equal(fieldPayload.fields.landlord.fullName,"Tên chủ nhà trên phụ lục");
    assert.equal(fieldPayload.fields.landlord.idNumber,"00123456");assert.equal(fieldPayload.fields.landlord.bankAccountNumber,"0001234");
    assert.equal(fieldPayload.fields.lease.handoverDateText,"16/10/2026");
    assert.equal(fieldPayload.fields.financial.paymentCycle,"Mỗi 3 tháng");assert.equal(fieldPayload.fields.financial.depositAmountValue,"20000000");
    assert.equal(fields.errors.length,0);
    console.log("PASS editable identity/bank/deposit/cycle, typed counts/dates, unit fallback, fixed feature schema and aligned prices on mobile");
    const desktopData=structuredClone(fieldData);desktopData.canPropose=true;desktopData.proposals=[];delete desktopData.blockedReason;
    const desktop=await fixturePage(browser,desktopData,"owner");
    await desktop.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    assert.equal(await desktop.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).isDisabled(),true,"Opening the editor must not produce phantom changes");
    await desktop.page.getByLabel("Số tháng thuê",{exact:true}).fill("6");
    assert.equal(await desktop.page.getByLabel("Ngày kết thúc hợp đồng",{exact:true}).inputValue(),"2027-04-13");
    await desktop.page.locator("#amendment-charges").screenshot({path:path.join(output,"free-form-charges-desktop.png")});
    console.log("PASS desktop charge layout, no phantom fallback changes and synchronized date/term inputs");

    const policyData=structuredClone(baseline);
    const policyRow=(code,label,type,value,displayValue)=>({code,label,valueType:type,value,displayValue,note:"",required:true,sortOrder:10});
    policyData.currentTerms.policies={listingPolicies:[policyRow("petPolicy","Nuôi thú cưng","PERMISSION","ALLOWED","Cho phép"),policyRow("smokingPolicy","Hút thuốc","PERMISSION","NOT_ALLOWED","Không cho phép"),policyRow("quietHoursPolicy","Giờ yên tĩnh","TEXT","Sau 23:00","Sau 23:00"),policyRow("depositRefundDays","Thời hạn hoàn cọc","INTEGER","7","7 ngày")],latePaymentFeeMode:"NONE"};
    const policy=await fixturePage(browser,policyData,"owner",{width:390,height:844});
    await policy.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    await policy.page.getByLabel("Nuôi thú cưng",{exact:true}).fill("Chỉ nuôi mèo đã đăng ký, tối đa 2 con");
    await policy.page.getByLabel("Thời hạn hoàn cọc",{exact:true}).fill("10");
    await policy.page.getByRole("button",{name:"Thêm chính sách",exact:true}).click();
    await policy.page.getByLabel("Tên chính sách 5",{exact:true}).fill("Giờ dùng sân thượng");
    await policy.page.getByLabel("Giờ dùng sân thượng",{exact:true}).fill("18:00–21:00");
    await policy.page.getByRole("button",{name:"Xóa chính sách 3",exact:true}).click();
    await policy.page.getByLabel("Điều khoản thỏa thuận khác",{exact:true}).fill("Hai bên thống nhất nội dung viết tay mới");
    assert.equal(await policy.page.locator("select").count(),1,"Listing policies remain free text; late-fee mode has three choices");
    assert.equal(await policy.page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await policy.page.getByLabel("Lý do và mô tả thay đổi").fill("Đề nghị nội quy mới đúng thỏa thuận giữa hai bên");
    await policy.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await policy.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await policy.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await policy.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const policyPayload=policy.requests.find(r=>r.path.endsWith("/amendments")).body.changes;
    assert.equal(policyPayload.policyRows[0].text,"Chỉ nuôi mèo đã đăng ký, tối đa 2 con");
    assert.equal(policyPayload.policyRows.find(r=>r.code==="depositRefundDays").text,"10");
    assert.equal(policyPayload.policyRows.some(r=>r.code==="quietHoursPolicy"),false);
    assert.equal(policyPayload.specialTerms,"Hai bên thống nhất nội dung viết tay mới");assert.equal(policy.errors.length,0);
    console.log("PASS free policy text/add/remove, numeric refund period and full special-term replacement");
    const labelData=structuredClone(baseline);
    labelData.currentTerms.property.features=[{featureName:"Tình trạng nội thất",featureValue:"FULLY_FURNISHED"},{featureName:"Loại lối đi",featureValue:"ĐƯỜNG NỘI BỘ"}];
    const labels=await fixturePage(browser,labelData,"owner");
    await labels.page.getByText("Đầy đủ nội thất",{exact:true}).waitFor();
    await labels.page.getByText("Đường nội bộ",{exact:true}).waitFor();
    assert.equal(await labels.page.getByText("FULLY_FURNISHED",{exact:true}).count(),0);
    await labels.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    assert.equal(await labels.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).inputValue(),"Đầy đủ nội thất");
    assert.equal(await labels.page.getByLabel("Giá trị đặc điểm 2",{exact:true}).inputValue(),"Đường nội bộ");
    await labels.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).fill("Nội thất theo biên bản ABC - PCCC");
    assert.equal(await labels.page.getByLabel("Giá trị đặc điểm 1",{exact:true}).inputValue(),"Nội thất theo biên bản ABC - PCCC");
    assert.equal(labelData.currentTerms.property.features[0].featureValue,"FULLY_FURNISHED");
    assert.equal(labels.errors.length,0);
    console.log("PASS translated legacy feature labels in view/edit without rewriting source codes or manual text");
    const rulesData=structuredClone(baseline);rulesData.currentTerms.policies={latePaymentFeeMode:"NONE",latePaymentFeeAmount:0,latePaymentFeeGraceDays:0,latePaymentFeeCap:0};
    rulesData.currentTerms.systemTerms="Quy trình hệ thống: sau hết 5 ngày quá hạn mở phương án; tối đa 10 ngày tính phạt.";
    const rules=await fixturePage(browser,rulesData,"owner");
    await rules.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    for(const label of ["Số ngày đến hạn thanh toán","Số ngày ân hạn","Trần phí chậm trả (đ)"])assert.equal(await rules.page.getByLabel(label,{exact:true}).count(),0);
    assert.match(await rules.page.getByLabel("Hạn thanh toán do hệ thống quản lý",{exact:true}).innerText(),/5 ngày lịch, tính cả ngày chốt kỳ/);
    assert.match(await rules.page.getByLabel("Quy tắc phạt do hệ thống quản lý",{exact:true}).innerText(),/Không áp dụng phí phạt/);
    assert.equal(await rules.page.getByLabel("Điều khoản thỏa thuận khác",{exact:true}).inputValue(),"Điều khoản gốc");
    await rules.page.getByLabel("Điều khoản quy trình hệ thống không chỉnh sửa",{exact:true}).waitFor();
    const feeMode=rules.page.getByRole("combobox",{name:"Cách tính phí chậm trả",exact:true});
    assert.deepEqual(await feeMode.locator("option").evaluateAll(options=>options.map(o=>({value:o.value,text:o.textContent}))),[
      {value:"NONE",text:"Không phạt"},{value:"FIXED_ONCE",text:"Một lần"},{value:"FIXED_PER_DAY",text:"Mỗi ngày"}]);
    await feeMode.selectOption("FIXED_PER_DAY");
    await rules.page.getByLabel("Mức phí chậm trả (đ)",{exact:true}).fill("100000");
    assert.match(await rules.page.getByLabel("Quy tắc phạt do hệ thống quản lý",{exact:true}).innerText(),/100.000 đ\/ngày × 10 ngày = 1.000.000 đ/);
    await feeMode.selectOption("FIXED_ONCE");
    assert.match(await rules.page.getByLabel("Quy tắc phạt do hệ thống quản lý",{exact:true}).innerText(),/100.000 đ/);
    await feeMode.selectOption("NONE");
    assert.equal(await rules.page.getByLabel("Mức phí chậm trả (đ)",{exact:true}).isDisabled(),true);
    assert.equal(await rules.page.getByLabel("Mức phí chậm trả (đ)",{exact:true}).inputValue(),"0");
    await feeMode.selectOption("FIXED_PER_DAY");
    await rules.page.getByLabel("Mức phí chậm trả (đ)",{exact:true}).fill("100000");
    await rules.page.locator("#amendment-rules").screenshot({path:path.join(output,"system-billing-rules.png")});
    await rules.page.getByLabel("Lý do và mô tả thay đổi").fill("Hai bên thống nhất mức phí phạt theo quy trình hệ thống");
    await rules.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();await rules.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await rules.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();await rules.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const ruleFields=rules.requests.find(r=>r.path.endsWith("/amendments")).body.changes.fields;
    assert.deepEqual(ruleFields.policies,{latePaymentFeeMode:"FIXED_PER_DAY",latePaymentFeeAmount:"100000"});assert.equal(ruleFields.financial,undefined);assert.equal(rules.errors.length,0);
    console.log("PASS rate/mode-only proposal, computed ceiling and system timing as read-only labels with protected document clause");
    const dailyData=structuredClone(baseline);dailyData.currentTerms.policies={latePaymentFeeMode:"FIXED_PER_DAY",latePaymentFeeAmount:100000,latePaymentFeeGraceDays:0,latePaymentFeeCap:1000000};
    const once=await fixturePage(browser,dailyData,"owner");
    await once.page.getByRole("button",{name:"Điều chỉnh hợp đồng",exact:true}).click();
    const onceMode=once.page.getByRole("combobox",{name:"Cách tính phí chậm trả",exact:true});
    assert.equal(await onceMode.inputValue(),"FIXED_PER_DAY");
    assert.equal(await once.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).isDisabled(),true);
    await onceMode.selectOption("FIXED_ONCE");
    const onceRules=await once.page.getByLabel("Quy tắc phạt do hệ thống quản lý",{exact:true}).innerText();
    assert.match(onceRules,/Chỉ thu một lần, không nhân số ngày/);assert.match(onceRules,/100.000 đ/);assert.doesNotMatch(onceRules,/1.000.000 đ/);
    await once.page.getByLabel("Lý do và mô tả thay đổi").fill("Chuyển phạt theo ngày thành một lần, giữ nguyên mức phí");
    await once.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await once.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await once.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await once.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    assert.deepEqual(once.requests.find(r=>r.path.endsWith("/amendments")).body.changes.fields.policies,{latePaymentFeeMode:"FIXED_ONCE"});
    assert.equal(dailyData.currentTerms.policies.latePaymentFeeMode,"FIXED_PER_DAY");assert.equal(once.errors.length,0);
    console.log("PASS three-option dropdown, daily-to-once canonical payload and computed ceiling without premature application");
    const replacementData=structuredClone(baseline);replacementData.canPropose=false;replacementData.blockedReason="Đang có phụ lục chờ áp dụng";
    replacementData.proposals=[{id:"scheduled",proposerId:"owner",recipientId:"tenant",status:"SCHEDULED",canReplace:true,effectiveOn:"2026-11-14",immediateEffect:false,reason:"Giảm giá thuê theo thỏa thuận",submittedAt:"2026-10-14T03:00:00Z",signedAt:"2026-10-15T03:00:00Z",respondBy:"2026-10-16T03:00:00Z",signBy:"2026-11-13T17:00:00Z",agreementContractId:"signed-appendix",agreementStatus:"ACTIVE",changes:{freeForm:true,rentAmount:"12000000"},comparison:[{field:"rentAmount",label:"Giá thuê / tháng",before:"12400000",after:"12000000"}],evidenceIds:[]}];
    const replaceOwner=await fixturePage(browser,replacementData,"owner",{width:390,height:900});
    await replaceOwner.page.getByRole("button",{name:"Chỉnh lại phụ lục",exact:true}).click();
    assert.equal(await replaceOwner.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).inputValue(),"12.000.000");
    assert.equal(await fieldState(replaceOwner.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true})).getAttribute("data-contract-field-state"),"editable","Replacement starts from the signed scheduled terms, not today's rent");
    assert.equal(await replaceOwner.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).isDisabled(),true);
    assert.equal(await replaceOwner.page.getByRole("radio").count(),0);
    await replaceOwner.page.getByRole("button",{name:"Ngày dự kiến áp dụng",exact:true}).click();
    assert.equal(await replaceOwner.page.getByRole("button",{name:"Ngày 14/11/2026",exact:true}).isDisabled(),false);
    assert.equal(await replaceOwner.page.getByRole("button",{name:"Tháng sau",exact:true}).isDisabled(),true);
    await replaceOwner.page.getByRole("button",{name:"Đóng lịch",exact:true}).click();
    await replaceOwner.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).fill("12400000");
    assert.equal(await fieldState(replaceOwner.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true})).getAttribute("data-contract-field-state"),"changed");
    await replaceOwner.page.getByText("1 nhóm nội dung đã chỉnh",{exact:true}).waitFor();
    await replaceOwner.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    await replaceOwner.page.getByRole("checkbox",{name:/Tôi đã kiểm tra đúng/}).check();
    await replaceOwner.page.getByRole("button",{name:"Gửi đề xuất cho người thuê"}).click();
    await replaceOwner.page.getByText("Chờ người thuê duyệt nội dung",{exact:true}).waitFor();
    const replacedPayload=replaceOwner.requests.find(r=>r.path.endsWith("/amendments")).body;
    assert.equal(replacedPayload.previousProposalId,"scheduled");assert.equal(replacedPayload.effectiveOn,"2026-11-14");assert.deepEqual(replacedPayload.changes,{freeForm:true});
    assert.equal(replacementData.proposals.find(p=>p.id==="scheduled").status,"SCHEDULED");
    const replaceTenant=await fixturePage(browser,replacementData,"tenant");
    assert.equal(await replaceTenant.page.getByRole("button",{name:"Chỉnh lại phụ lục",exact:true}).count(),0);
    await replaceTenant.page.getByRole("button",{name:"Xem nội dung đề xuất →",exact:true}).first().click();
    await replaceTenant.page.getByRole("checkbox",{name:/Tôi đã đọc và đồng ý/}).check();
    await replaceTenant.page.getByRole("button",{name:"Đồng ý nội dung",exact:true}).click();
    await replaceTenant.page.getByText("Bạn đã đồng ý nội dung. Chờ chủ nhà ký trước.").waitFor();
    assert.equal(replacementData.proposals.find(p=>p.id==="scheduled").status,"SCHEDULED");assert.equal(replaceOwner.errors.length,0);assert.equal(replaceTenant.errors.length,0);
    const replacementDraftData=structuredClone(baseline);replacementDraftData.canPropose=false;replacementDraftData.proposals=[{...replacementData.proposals.find(p=>p.id==="scheduled"),canReplace:true}];
    replacementDraftData.draft={requestId:"saved-replacement",baseRevisionId:"original",previousProposalId:"scheduled",effectiveOn:"2026-11-14",reason:"Bản sửa lỗi được lưu nháp riêng",changes:{freeForm:true,rentAmount:"11500000"}};
    const resumeReplacement=await fixturePage(browser,replacementDraftData,"owner");
    await resumeReplacement.page.getByRole("button",{name:"Tiếp tục bản nháp",exact:true}).click();
    assert.equal(await resumeReplacement.page.getByLabel("Tiền thuê hàng tháng (đ)",{exact:true}).inputValue(),"11.500.000");
    assert.equal(await resumeReplacement.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).isDisabled(),false);
    await resumeReplacement.page.getByRole("button",{name:"Xem lại thay đổi",exact:true}).click();
    assert.match(await resumeReplacement.page.getByRole("dialog").innerText(),/Phụ lục đã ký trước đó/);
    assert.equal(resumeReplacement.errors.length,0);
    console.log("PASS scheduled replacement prefills signed terms, locks the effective date, permits return to base, requires fresh consent and preserves old schedule before signatures");
    }
    const historyData=structuredClone(baseline);historyData.serverNow="2026-11-14T03:00:00Z";
    const file=(id,contractId,purpose,revisionId="root-signed",documentType="PDF",status="READY")=>({id,contractId,revisionId,templateVersionId:"template",purpose,documentType,status,fileName:`HD_technical_${id}.${documentType.toLowerCase()}`,fileSize:100000,generatedAt:"2026-10-14T06:29:39.869215Z",storageObjectId:id});
    const oldFiles=[file("root-final","root","SIGNED_FINAL"),file("root-owner","root","SIGNED_LANDLORD"),file("root-preview","root","PREVIEW"),file("root-word","root","PREVIEW","old","DOCX","STALE")];
    const baseProposal={proposerId:"owner",recipientId:"tenant",immediateEffect:false,reason:"Điều chỉnh theo thỏa thuận giữa hai bên",comparison:[{field:"rentAmount",label:"Giá thuê / tháng",before:"12400000",after:"12000000"}],changes:{rentAmount:"12000000"},evidenceIds:[],respondBy:"2026-10-18T03:00:00Z",signBy:"2026-10-19T03:00:00Z"};
    historyData.proposals=[
      {...baseProposal,id:"applied",status:"APPLIED",submittedAt:"2026-10-15T03:00:00Z",decidedAt:"2026-10-16T03:00:00Z",signedAt:"2026-10-17T04:00:00Z",appliedAt:"2026-11-13T17:00:00Z",effectiveOn:"2026-11-14",agreementContractId:"appendix-1",agreementStatus:"ACTIVE"},
      {...baseProposal,id:"future",status:"SCHEDULED",submittedAt:"2026-10-18T03:00:00Z",signedAt:"2026-10-20T04:00:00Z",effectiveOn:"2026-12-14",agreementContractId:"appendix-2",agreementStatus:"ACTIVE"},
      {...baseProposal,id:"waiting",status:"APPROVED",submittedAt:"2026-11-01T03:00:00Z",effectiveOn:"2026-12-14",agreementContractId:"appendix-3",agreementStatus:"TENANT_SIGNATURE_PENDING"},
      {...baseProposal,id:"rejected",status:"REJECTED",submittedAt:"2026-10-14T03:00:00Z",decidedAt:"2026-10-14T04:00:00Z",effectiveOn:"2026-11-14",responseNote:"Không đồng ý đề xuất cũ"}];
    historyData.proposals.sort((a,b)=>Date.parse(b.submittedAt)-Date.parse(a.submittedAt)); // Match API audit chronology.
    const signature=(role,status,at)=>({id:role,contractId:"appendix-1",revisionId:"pl1-signed",signerRole:role,status,confirmedAt:at});
    historyData.currentTermsRevisionId="pl1-signed";
    historyData.historyFixture={contract:{id:"root",contractNumber:"HD-20261014-DEMO",status:"ACTIVE",currentRevisionId:"root-signed",landlordId:"owner",tenantId:"tenant",signedAt:"2026-10-14T06:29:39Z",updatedAt:"2026-10-14T06:29:39Z"},documents:oldFiles,files:{root:oldFiles,"appendix-1":[file("appendix-final","appendix-1","SIGNED_FINAL","pl1-signed")],"appendix-2":[file("future-final","appendix-2","SIGNED_FINAL","pl2-signed")],"appendix-3":[file("waiting-owner","appendix-3","SIGNED_LANDLORD","pl3-signing")]},signatures:{"appendix-1":[signature("LANDLORD","SIGNED","2026-10-17T03:00:00Z"),signature("TENANT","SIGNED","2026-10-17T04:00:00Z") ]}};
    historyData.failDocumentOnce="appendix-2";
    for(const role of ["owner","tenant"]){
      const dossier=await fixturePage(browser,structuredClone(historyData),role,{width:role==="owner"?1280:390,height:900});
      const section=dossier.page.getByRole("region",{name:"Hợp đồng và các lần điều chỉnh",exact:true});await section.waitFor();
      const original=section.getByRole("article",{name:"Hợp đồng gốc",exact:true});
      await original.getByRole("button",{name:"Xem bản đã ký",exact:true}).waitFor();
      assert.equal(await original.getByText("HD_technical_root-word.docx",{exact:true}).isVisible(),false);
      await original.getByText("Lịch sử tệp (4)",{exact:true}).click();
      await original.getByText("HD_technical_root-word.docx",{exact:true}).waitFor();
      assert.equal(await original.getByRole("button",{name:"Xem",exact:true}).count(),4);
      assert.match(await original.innerText(),/13:29/);assert.doesNotMatch(await original.innerText(),/2026-10-14T06/);
      await original.getByText("Lịch sử tệp (4)",{exact:true}).click();
      const applied=section.getByRole("article",{name:"Điều chỉnh lần 1 — Giá thuê",exact:true});
      await applied.getByRole("button",{name:"Xem bản đã ký",exact:true}).waitFor();
      await applied.getByText("Xem thay đổi (1 nội dung)",{exact:true}).click();
      assert.match(await applied.innerText(),/Trước điều chỉnh/);assert.match(await applied.innerText(),/Sau điều chỉnh/);
      await applied.getByText("Quá trình ghi nhận và ký",{exact:true}).click();
      await applied.getByText("Người thuê đã ký số",{exact:true}).waitFor();
      await applied.getByText("Hai bên thống nhất nội dung",{exact:true}).waitFor();
      await applied.getByText("Quá trình ghi nhận và ký",{exact:true}).click();
      await applied.getByText("Xem thay đổi (1 nội dung)",{exact:true}).click();
      const future=section.getByRole("article",{name:"Điều chỉnh lần 2 — Giá thuê",exact:true});
      await future.getByRole("button",{name:"Tải lại tệp phụ lục",exact:true}).click();
      await future.getByRole("button",{name:"Xem bản đã ký",exact:true}).waitFor();
      assert.match(await future.innerText(),/Đã ký đủ · Chờ áp dụng/);
      const waiting=section.getByRole("article",{name:"Đề xuất điều chỉnh — Giá thuê",exact:true});
      assert.match(await waiting.innerText(),/Chờ người thuê ký/);
      assert.equal(await waiting.getByRole("link",{name:"Mở phụ lục để xem và ký",exact:true}).getAttribute("href"),`/dashboard/${role==="owner"?"landlord":"tenant"}/contracts/appendix-3`);
      assert.equal(await section.getByText("Đã từ chối · Không áp dụng",{exact:true}).isVisible(),false);
      await section.getByText("Đề xuất không được áp dụng (1)",{exact:true}).click();await section.getByText("Đã từ chối · Không áp dụng",{exact:true}).waitFor();
      await section.getByText("Đề xuất không được áp dụng (1)",{exact:true}).click();
      assert.equal(await dossier.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await section.screenshot({path:path.join(output,`document-history-${role}.png`)});
      const before=dossier.requests.filter(r=>r.path==="/api/v1/contracts/documents/root-final").length;
      await original.getByRole("button",{name:"Xem bản đã ký",exact:true}).click();
      await dossier.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).waitFor();
      assert.equal(dossier.requests.filter(r=>r.path==="/api/v1/contracts/documents/root-final").length,before+1);
      await dossier.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).click();
      await original.getByText("Lịch sử tệp (4)",{exact:true}).click();
      const oldWord=original.getByText("HD_technical_root-word.docx",{exact:true}).locator("..").locator("..");
      const popupPromise=dossier.page.waitForEvent("popup");
      await oldWord.getByRole("button",{name:"Tải về",exact:true}).click();
      const popup=await popupPromise;await popup.waitForURL(/files\/root-word\.pdf\?fresh=1/);await popup.close();
      assert.equal(dossier.requests.filter(r=>r.path==="/api/v1/contracts/documents/root-word").length,1,"Even old Word downloads refresh their authorized URL");
      assert.equal(dossier.errors.length,0);assert.equal(dossier.requests.filter(r=>r.method!=="GET").length,0,"History reads must never mutate contract/signature state");
    }
    console.log("PASS document dossier for both parties: signed PDFs, collapsed old Word/PDF files, future/pending/rejected states, comparison/timeline, retry, fresh URLs and mobile layout");
    for(const role of ["owner","tenant"]){
      const data=structuredClone(historyData);delete data.failDocumentOnce;
      const current=await fixturePage(browser,data,role,{width:role==="owner"?1280:390,height:900});
      for(const [now,id] of [["2026-11-13T16:59:59Z","root-final"],["2026-11-13T17:00:00Z","appendix-final"],["2026-12-13T17:00:00Z","future-final"]]){
        data.serverNow=now;data.historyFixture.effectiveFileId=id;
        data.currentTermsRevisionId=Object.values(data.historyFixture.files).flat().find(d=>d.id===id).revisionId;
        const pdfResponse=current.page.waitForResponse(response=>new URL(response.url()).pathname===`/files/${id}.pdf`);
        await current.page.getByRole("button",{name:"Xem hợp đồng đang áp dụng",exact:true}).click();
        await pdfResponse;
        // The existing viewer truncates its filename to zero width on narrow screens;
        // verify both the document metadata and actual requested PDF, not text visibility.
        const filename=current.page.getByRole("heading",{name:`HD_technical_${id}.pdf`,exact:true});
        await filename.waitFor({state:"attached"});assert.equal(await filename.getAttribute("title"),`HD_technical_${id}.pdf`);
        await current.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).click();
      }
      const popupPromise=current.page.waitForEvent("popup");
      await current.page.getByRole("button",{name:"Tải PDF đang áp dụng",exact:true}).click();
      const popup=await popupPromise;await popup.waitForURL(/files\/future-final\.pdf\?fresh=1/);await popup.close();
      data.historyFixture.effectiveFileId="missing";
      data.currentTermsRevisionId="missing-effective";
      await current.page.getByRole("button",{name:"Xem hợp đồng đang áp dụng",exact:true}).click();
      await current.page.getByText(/hệ thống không mở thay bằng bản cũ/).waitFor();
      assert.equal(await current.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).count(),0);
      assert.equal(current.requests.filter(r=>r.path==="/api/v1/contracts/root").length,5);
      assert.equal(current.requests.filter(r=>r.path.endsWith("/effective-document")).length,0,"Works even when Core has no new effective-document endpoint");
      assert.equal(current.requests.filter(r=>r.path==="/api/v1/contracts/documents/root-final").length,1,"Original is only opened before PL1 takes effect, never as a fallback");
      assert.equal(current.requests.filter(r=>r.method!=="GET").length,0);assert.deepEqual(current.errors,[]);
      assert.equal(await current.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await current.page.screenshot({path:path.join(output,`effective-document-${role}.png`)});await current.page.close();
    }
    console.log("PASS effective header PDF for both parties on desktop/mobile: original then effective appendices on the same page, fresh downloads, no unsigned/old fallback and no writes");
    for(const role of ["owner","tenant"]){
      const data=structuredClone(historyData);delete data.failDocumentOnce;data.serverNow="2026-11-15T03:00:00Z";
      data.proposals.find(p=>p.id==="applied").effectiveOn="2026-11-15";data.proposals.find(p=>p.id==="future").effectiveOn="2026-12-15";
      data.historyFixture.rootContract=data.historyFixture.contract;
      data.historyFixture.contract={...data.historyFixture.contract,id:"appendix-2",parentContractId:"root",agreementKind:"AMENDMENT",currentRevisionId:"pl2-signed",contractNumber:"HD-PL2"};
      data.historyFixture.documents=data.historyFixture.files["appendix-2"];
      const child=await fixturePage(browser,data,role,{width:role==="owner"?1280:390,height:900});
      await child.page.getByRole("button",{name:"Xem hợp đồng đang áp dụng",exact:true}).click();
      await child.page.getByRole("heading",{name:"HD_technical_appendix-final.pdf",exact:true}).waitFor({state:"attached"});
      await child.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).click();
      await child.page.getByRole("button",{name:"Xem riêng phụ lục này",exact:true}).click();
      await child.page.getByRole("heading",{name:"HD_technical_future-final.pdf",exact:true}).waitFor({state:"attached"});
      await child.page.getByRole("button",{name:"Đóng (Esc)",exact:true}).click();
      assert.equal(child.requests.filter(r=>r.path.endsWith("/effective-document")).length,0);assert.deepEqual(child.errors,[]);
      assert.equal(await child.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await child.page.close();
    }
    console.log("PASS signed PL2 dossier on 15 November opens current PL1 for either party; explicit own-appendix action still opens future PL2");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
