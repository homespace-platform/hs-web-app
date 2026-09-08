"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Copy, Check, Code2, Table as TableIcon, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type { TemplateFieldDefinition } from "@/types/contract.type";
import { CATEGORY_NAMES, CATEGORY_OPTIONS } from "@/types/contract.type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isRequiredForAllCategories(field: TemplateFieldDefinition): boolean {
  return field.requiredForCategories?.length === CATEGORY_OPTIONS.length;
}

export default function ContractFieldsPage() {
  const [fields, setFields] = useState<TemplateFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setFields(await contractService.getCatalogFields());
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Không thể tải từ điển mã trường");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groups = useMemo(() => {
    const set = new Set<string>();
    fields.forEach((f) => set.add(f.group));
    return Array.from(set);
  }, [fields]);

  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchGroup = selectedGroup === "ALL" || f.group === selectedGroup;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        f.key.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [fields, search, selectedGroup]);

  const copyToClipboard = async (key: string) => {
    await navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    toast.success(`Đã sao chép {{${key}}}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-primary" />
          Từ điển mã trường hợp đồng
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Các mã placeholder được hệ thống hỗ trợ khi soạn file Word (.docx) cho mẫu hợp đồng của bạn.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Quy tắc soạn file mẫu Word</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Dùng thẻ{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted border font-mono text-primary">
                  {"{{landlord.fullName}}"}
                </code>{" "}
                đúng chính tả theo bảng dưới.
              </li>
              <li>
                Bảng động:{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted border font-mono text-primary">
                  {"{{#chargesTable}}"}
                </code>
                ,{" "}
                <code className="px-1.5 py-0.5 rounded bg-muted border font-mono text-primary">
                  {"{{#equipmentTable}}"}
                </code>
              </li>
              <li>Mã không có trong từ điển sẽ bị báo lỗi khi tải file lên.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo mã trường, tên nhãn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Button
            variant={selectedGroup === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedGroup("ALL")}
            className="text-xs shrink-0"
          >
            Tất cả ({fields.length})
          </Button>
          {groups.map((grp) => {
            const count = fields.filter((f) => f.group === grp).length;
            return (
              <Button
                key={grp}
                variant={selectedGroup === grp ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedGroup(grp)}
                className="text-xs shrink-0"
              >
                {grp} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã chèn trong Word</th>
                <th className="py-3 px-4">Tên trường</th>
                <th className="py-3 px-4">Nhóm</th>
                <th className="py-3 px-4">Kiểu</th>
                <th className="py-3 px-4">Ví dụ</th>
                <th className="py-3 px-4">Bắt buộc</th>
                <th className="py-3 px-4 text-right">Sao chép</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Đang tải danh mục mã trường...
                  </td>
                </tr>
              ) : filteredFields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    Không tìm thấy mã trường nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredFields.map((field) => {
                  const isCopied = copiedKey === field.key;
                  const isDynamicTable = field.dataType === "DYNAMIC_TABLE";
                  return (
                    <tr key={field.key} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          {isDynamicTable ? (
                            <TableIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Code2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                          <span className={isDynamicTable ? "text-indigo-600" : "text-primary"}>
                            {"{{"}
                            {field.key}
                            {"}}"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium">{field.label}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-1">
                          {field.description}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {field.group}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className="text-[10px]">
                          {field.dataType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {field.example}
                      </td>
                      <td className="py-3 px-4">
                        {!field.required ? (
                          <span className="text-muted-foreground">Tùy chọn</span>
                        ) : isRequiredForAllCategories(field) ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Bắt buộc
                          </Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-500/40"
                            >
                              Theo loại hình
                            </Badge>
                            <div className="text-[10px] text-muted-foreground">
                              {(field.requiredForCategories || [])
                                .map((c) => CATEGORY_NAMES[c])
                                .join(", ")}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(field.key)}
                          className="h-7 px-2 text-xs"
                        >
                          {isCopied ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-bold">
                              <Check className="w-3 h-3" /> Đã chép
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Copy className="w-3 h-3" /> Sao chép
                            </span>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
