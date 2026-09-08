"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileCode2,
  Plus,
  Search,
  BookOpen,
  Eye,
  Layers,
  Upload,
  ExternalLink,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import storageService from "@/services/storage.service";
import type { ContractTemplateResponse } from "@/types/contract.type";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_NAMES,
  CATEGORY_OPTIONS,
} from "@/types/contract.type";
import type { ListingCategory } from "@/types/listing.type";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TabKey = "system" | "mine";

export default function ContractTemplatesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("system");
  const [systemTemplates, setSystemTemplates] = useState<ContractTemplateResponse[]>([]);
  const [myTemplates, setMyTemplates] = useState<ContractTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createCategory, setCreateCategory] = useState<ListingCategory | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [system, mine] = await Promise.all([
        contractService.listSystemTemplates(),
        contractService.listMyTemplates(),
      ]);
      setSystemTemplates(system);
      setMyTemplates(mine);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể tải danh sách mẫu hợp đồng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sourceList = tab === "system" ? systemTemplates : myTemplates;

  const filtered = useMemo(() => {
    return sourceList.filter((t) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));
      const matchCategory = categoryFilter === "ALL" || t.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [sourceList, search, categoryFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error("Vui lòng nhập tên mẫu hợp đồng");
      return;
    }
    if (!createCategory) {
      toast.error("Vui lòng chọn loại hình bất động sản");
      return;
    }
    if (!selectedFile?.name.endsWith(".docx")) {
      toast.error("Vui lòng chọn file Word (.docx)");
      return;
    }

    setIsSubmitting(true);
    try {
      toast.info("Đang tải file mẫu Word lên hệ thống...");
      const storageId = await storageService.uploadContractDocx(selectedFile);
      toast.info("Đang phân tích các mã trường trong file Word...");
      const created = await contractService.createMyTemplate({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        category: createCategory,
        storageObjectId: storageId,
        originalFileName: selectedFile.name,
      });
      toast.success("Tạo mẫu hợp đồng thành công!");
      setIsCreateModalOpen(false);
      setCreateName("");
      setCreateDesc("");
      setCreateCategory("");
      setSelectedFile(null);
      setTab("mine");
      await loadData();
      router.push(`/dashboard/contracts/templates/${created.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lỗi khi tạo mẫu hợp đồng");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FileCode2 className="w-6 h-6 text-primary" />
            Mẫu hợp đồng
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Xem mẫu hệ thống đã xuất bản hoặc tự tải lên mẫu Word của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/contracts/fields">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <BookOpen className="w-4 h-4 text-primary" />
              Từ điển mã trường
            </Button>
          </Link>
          <Button
            onClick={() => {
              setTab("mine");
              setIsCreateModalOpen(true);
            }}
            size="sm"
            className="gap-1.5 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Tạo mẫu của tôi
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/60 border border-border w-fit">
        <button
          type="button"
          onClick={() => setTab("system")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            tab === "system"
              ? "bg-card text-primary shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Mẫu hệ thống ({systemTemplates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            tab === "mine"
              ? "bg-card text-primary shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Mẫu của tôi ({myTemplates.length})
        </button>
      </div>

      {tab === "system" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-muted-foreground">
          Mẫu do HomeSpace xuất bản — chỉ xem và xem thử, không thể chỉnh sửa hay tải phiên bản mới.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên mẫu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs sm:text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs py-1.5 px-3 rounded-xl border border-input bg-background font-medium"
        >
          <option value="ALL">Tất cả loại BĐS</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_NAMES[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Tên mẫu</th>
                <th className="py-3 px-4">Loại BĐS</th>
                <th className="py-3 px-4 text-center">Phiên bản</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Đang tải...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {tab === "mine"
                      ? "Bạn chưa có mẫu hợp đồng nào. Hãy tạo mẫu mới."
                      : "Chưa có mẫu hệ thống nào được xuất bản."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const hasPublished = Boolean(item.latestPublishedVersionId);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/dashboard/contracts/templates/${item.id}`}
                          className="font-bold text-sm hover:text-primary hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description || "Không có mô tả"}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.category ? (
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORY_NAMES[item.category]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          {item.versionsCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.status === "ARCHIVED" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Đã lưu trữ
                          </Badge>
                        ) : hasPublished ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                            Đã xuất bản
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-amber-600 border-amber-500/40 text-[10px]"
                          >
                            Bản nháp
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/dashboard/contracts/templates/${item.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {tab === "system" ? "Xem" : "Chi tiết"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Tạo mẫu hợp đồng của tôi
              </h3>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">
                  Tên mẫu <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="Ví dụ: Hợp đồng thuê căn hộ của tôi 2026"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Mô tả</label>
                <textarea
                  rows={2}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-input bg-background text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="Mô tả mục đích sử dụng mẫu này..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">
                  Loại BĐS áp dụng <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as ListingCategory | "")}
                  className="w-full p-2 rounded-xl border border-input bg-background text-xs"
                >
                  <option value="" disabled>
                    -- Chọn loại hình --
                  </option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_NAMES[c]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {createCategory
                    ? CATEGORY_DESCRIPTIONS[createCategory]
                    : "Mỗi mẫu gắn đúng một loại hình. Hình thức thuê điền qua {{lease.rentalMode}}."}
                </p>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-semibold flex items-center justify-between">
                  <span>
                    File Word (.docx) <span className="text-rose-500">*</span>
                  </span>
                  <Link
                    href="/dashboard/contracts/fields"
                    className="text-primary hover:underline flex items-center gap-1 font-normal text-[11px]"
                  >
                    Tra cứu mã trường <ExternalLink className="w-3 h-3" />
                  </Link>
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 bg-muted/20">
                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                    className="hidden"
                    id="landlord-docx-upload"
                  />
                  <label
                    htmlFor="landlord-docx-upload"
                    className="cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    {selectedFile ? (
                      <span className="text-xs font-bold text-primary truncate max-w-xs">
                        {selectedFile.name}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-medium">Nhấn để chọn file Word</span>
                        <span className="text-[11px] text-muted-foreground">
                          Chứa thẻ placeholder dạng {"{{field}}"}
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting} className="font-semibold">
                  {isSubmitting ? "Đang xử lý..." : "Tạo mẫu & Phân tích"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
