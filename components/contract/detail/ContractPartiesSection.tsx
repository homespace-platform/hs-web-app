"use client";

import React from "react";
import { User, Users, ShieldCheck, Lock } from "lucide-react";
import { FieldRow } from "./utils";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import InlineAmendmentFields, { ContractTermFields } from "./InlineAmendmentFields";

interface ContractPartiesSectionProps {
  landlord: Record<string, unknown>;
  tenant: Record<string, unknown>;
}

export default function ContractPartiesSection({
  landlord: originalLandlord,
  tenant: originalTenant,
}: ContractPartiesSectionProps) {
  const w = useAmendmentWorkspace();
  const landlord = w?.data?.currentTerms.landlord ?? originalLandlord;
  const tenant = w?.data?.currentTerms.tenant ?? originalTenant;
  const occupantCount = tenant.occupantCount;
  const motorbikeCount = tenant.motorbikeCount;
  const carCount = tenant.carCount;

  if (w?.editing) return <div id="amendment-residents" className="scroll-mt-24 space-y-3">
    <h3 className="text-sm font-bold">Chủ thể giao kết hợp đồng</h3>
    <div className="grid gap-4 md:grid-cols-2">{(["landlord","tenant"] as const).map(group=><section key={group} className="min-w-0 rounded-2xl border bg-card p-4.5 space-y-3">
      <h4 className="text-xs font-bold">{group==="landlord"?"Bên A — Bên cho thuê":"Bên B — Bên thuê"}</h4>
      <ContractTermFields group={group} fields={[["fullName","Họ và tên"],["idNumber","Số CCCD / Định danh"],["permanentAddress","Nơi thường trú"],["phone","Số điện thoại"],["email","Email liên hệ"],["bankName","Ngân hàng"],["bankAccountNumber","Số tài khoản"],["bankAccountHolder","Chủ tài khoản"]]}/>
      <p className="text-xs text-muted-foreground">Sửa thông tin trên văn bản phụ lục, không thay tài khoản đăng nhập hoặc hồ sơ định danh. QR thanh toán dùng tài khoản ngân hàng đã đăng ký trong hồ sơ thanh toán.</p>
      {group==="tenant"&&<InlineAmendmentFields group="residents"/>}
    </section>)}</div>
  </div>;

  return (
    <div id="amendment-residents" className="scroll-mt-24 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Chủ thể giao kết hợp đồng
        </h3>
        <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Thông tin trong điều khoản đang áp dụng
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BÊN CHO THUÊ (BÊN A) */}
        <section className="rounded-2xl border border-border bg-card p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <User className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bên A — Bên cho thuê
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">
              Chủ nhà
            </span>
          </div>

          <div className="space-y-0.5">
            <FieldRow editable label="Họ và tên" value={landlord.fullName} highlight />
            <FieldRow editable label="Số CCCD / Định danh" value={landlord.idNumber} />
            <FieldRow editable label="Nơi thường trú" value={landlord.permanentAddress} />
            <FieldRow editable label="Số điện thoại" value={landlord.phone} />
            <FieldRow editable label="Email liên hệ" value={landlord.email} />
            <div className="pt-2"><p className="mb-1 text-xs font-semibold">Tài khoản nhận thanh toán</p>
              <FieldRow editable label="Ngân hàng" value={landlord.bankName} />
              <FieldRow editable label="Số tài khoản" value={landlord.bankAccountNumber} />
              <FieldRow editable label="Chủ tài khoản" value={landlord.bankAccountHolder} />
            </div>
          </div>
        </section>

        {/* BÊN THUÊ (BÊN B) */}
        <section className="rounded-2xl border border-border bg-card p-4.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Bên B — Bên thuê
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Người thuê
            </span>
          </div>

          <div className="space-y-0.5">
            <FieldRow editable label="Họ và tên" value={tenant.fullName} highlight />
            <FieldRow editable label="Số CCCD / Định danh" value={tenant.idNumber} />
            <FieldRow editable label="Nơi thường trú" value={tenant.permanentAddress} />
            <FieldRow editable label="Số điện thoại" value={tenant.phone} />
            <FieldRow editable label="Email liên hệ" value={tenant.email} />
            <div className="pt-2"><p className="mb-1 text-xs font-semibold">Tài khoản nhận hoàn trả / hoàn cọc</p>
              <FieldRow editable label="Ngân hàng" value={tenant.bankName} />
              <FieldRow editable label="Số tài khoản" value={tenant.bankAccountNumber} />
              <FieldRow editable label="Chủ tài khoản" value={tenant.bankAccountHolder} />
            </div>
            {w?.editing ? <InlineAmendmentFields group="residents" /> : <>
            <FieldRow editable
              label="Số người ở chính thức"
              value={occupantCount ? `${occupantCount} người` : undefined}
            />
            <FieldRow editable
              label="Xe máy đăng ký"
              value={
                motorbikeCount != null && Number(motorbikeCount) > 0
                  ? `${motorbikeCount} xe`
                  : "Không đăng ký xe máy"
              }
            />
            <FieldRow editable
              label="Ô tô đăng ký"
              value={
                carCount != null && Number(carCount) > 0
                  ? `${carCount} xe`
                  : "Không đăng ký ô tô"
              }
            />
            </>}
          </div>
        </section>
      </div>
    </div>
  );
}
