import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { inputClass, selectClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import type {
  MonthlyExpensesData,
  PropertyCategoryKey,
  CustomMonthlyFee,
  FormErrors,
} from "../types";

interface MonthlyExpensesSectionProps {
  category: PropertyCategoryKey;
  data: MonthlyExpensesData;
  errors?: FormErrors;
  onChange: (updates: Partial<MonthlyExpensesData>) => void;
}

export default function MonthlyExpensesSection({
  category,
  data,
  onChange,
}: MonthlyExpensesSectionProps) {
  const isOffice = category === "office";
  const showManagementFee =
    category === "apartment" || category === "office" || category === "commercial";

  function handleAddCustomFee() {
    const newFee: CustomMonthlyFee = {
      id: `fee-${Date.now()}`,
      name: "",
      amount: "",
      unit: "tháng",
    };
    onChange({ customFees: [...data.customFees, newFee] });
  }

  function handleUpdateCustomFee(
    id: string,
    field: keyof CustomMonthlyFee,
    value: string | number
  ) {
    const updated = data.customFees.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ customFees: updated });
  }

  function handleRemoveCustomFee(id: string) {
    onChange({
      customFees: data.customFees.filter((item) => item.id !== id),
    });
  }

  return (
    <FormSectionWrapper
      id="section-monthly-expenses"
      stepNumber={4}
      title="Chi phí hàng tháng"
      description="Minh bạch chi phí điện, nước và các dịch vụ đi kèm giúp người thuê dễ dàng tính toán"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Tiền điện */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Tiền điện
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.electricityType}
              onChange={(e) =>
                onChange({
                  electricityType: e.target
                    .value as MonthlyExpensesData["electricityType"],
                })
              }
              className={selectClass}
            >
              <option value="KWH">Tính theo số công tơ (kWh)</option>
              <option value="STATE_PRICE">Theo giá nhà nước / Hóa đơn EVN</option>
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
              <option value="NEGOTIATE">Thỏa thuận riêng</option>
            </select>

            {data.electricityType === "KWH" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={data.electricityPrice ?? ""}
                  onChange={(e) => onChange({ electricityPrice: e.target.value })}
                  placeholder="Ví dụ: 3500"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/kWh
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.electricityType === "STATE_PRICE" && "Tính theo bậc thang EVN"}
                {data.electricityType === "INCLUDED" && "Miễn phí tiền điện"}
                {data.electricityType === "NEGOTIATE" && "Hai bên tự thỏa thuận"}
              </div>
            )}
          </div>
        </div>

        {/* Tiền nước */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Tiền nước sinh hoạt
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.waterType}
              onChange={(e) =>
                onChange({
                  waterType: e.target.value as MonthlyExpensesData["waterType"],
                })
              }
              className={selectClass}
            >
              <option value="M3">Tính theo m³ (Khối nước)</option>
              <option value="PER_PERSON">Tính theo người / tháng</option>
              <option value="FLAT_ROOM">Khoán theo phòng / tháng</option>
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
            </select>

            {data.waterType !== "INCLUDED" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={data.waterPrice ?? ""}
                  onChange={(e) => onChange({ waterPrice: e.target.value })}
                  placeholder={
                    data.waterType === "M3"
                      ? "Ví dụ: 25000"
                      : data.waterType === "PER_PERSON"
                      ? "Ví dụ: 100000"
                      : "Ví dụ: 150000"
                  }
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  {data.waterType === "M3"
                    ? "đ/m³"
                    : data.waterType === "PER_PERSON"
                    ? "đ/người/tháng"
                    : "đ/phòng/tháng"}
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                Miễn phí tiền nước
              </div>
            )}
          </div>
        </div>

        {/* Phí quản lý (Chỉ hiển thị khi phù hợp: Căn hộ, Văn phòng, Mặt bằng) */}
        {showManagementFee && (
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            <label className="block text-xs font-bold text-foreground">
              Phí quản lý tòa nhà / chung cư
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <select
                value={data.managementFeeType}
                onChange={(e) =>
                  onChange({
                    managementFeeType: e.target
                      .value as MonthlyExpensesData["managementFeeType"],
                  })
                }
                className={selectClass}
              >
                <option value="MONTHLY">Thu theo tháng (Cố định)</option>
                <option value="PER_M2">Thu theo m² / tháng</option>
                <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
                <option value="NONE">Không có phí quản lý</option>
              </select>

              {data.managementFeeType === "MONTHLY" ||
              data.managementFeeType === "PER_M2" ? (
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={data.managementFee ?? ""}
                    onChange={(e) => onChange({ managementFee: e.target.value })}
                    placeholder={
                      data.managementFeeType === "MONTHLY"
                        ? "Ví dụ: 500000"
                        : "Ví dụ: 15000"
                    }
                    className={inputClass}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {data.managementFeeType === "MONTHLY" ? "đ/tháng" : "đ/m²/tháng"}
                  </span>
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                  {data.managementFeeType === "INCLUDED"
                    ? "Chủ nhà chịu phí quản lý"
                    : "Không thu"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Internet / WiFi */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Internet / WiFi
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.internetType}
              onChange={(e) =>
                onChange({
                  internetType: e.target
                    .value as MonthlyExpensesData["internetType"],
                })
              }
              className={selectClass}
            >
              <option value="INCLUDED">Đã bao gồm (Miễn phí WiFi)</option>
              <option value="MONTHLY">Thu theo phòng / tháng</option>
              <option value="SELF_PAY">Người thuê tự đăng ký gói cước</option>
            </select>

            {data.internetType === "MONTHLY" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={data.internetFee ?? ""}
                  onChange={(e) => onChange({ internetFee: e.target.value })}
                  placeholder="Ví dụ: 100000"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.internetType === "INCLUDED" ? "Miễn phí" : "Tự lắp đặt"}
              </div>
            )}
          </div>
        </div>

        {/* Phí rác / Vệ sinh */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Phí rác &amp; Vệ sinh khu vực chung
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.garbageFeeType}
              onChange={(e) =>
                onChange({
                  garbageFeeType: e.target
                    .value as MonthlyExpensesData["garbageFeeType"],
                })
              }
              className={selectClass}
            >
              <option value="MONTHLY">Thu định kỳ theo tháng</option>
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
            </select>

            {data.garbageFeeType === "MONTHLY" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={data.garbageFee ?? ""}
                  onChange={(e) => onChange({ garbageFee: e.target.value })}
                  placeholder="Ví dụ: 50000"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                Đã bao gồm
              </div>
            )}
          </div>
        </div>

        {/* Phí gửi xe máy */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Phí gửi xe máy
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.motorbikeParkingType}
              onChange={(e) =>
                onChange({
                  motorbikeParkingType: e.target
                    .value as MonthlyExpensesData["motorbikeParkingType"],
                })
              }
              className={selectClass}
            >
              <option value="INCLUDED">Miễn phí / Đã bao gồm</option>
              <option value="PER_VEHICLE">Thu phí theo xe / tháng</option>
              <option value="NONE">Không có chỗ gửi xe máy</option>
            </select>

            {data.motorbikeParkingType === "PER_VEHICLE" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={data.motorbikeParkingFee ?? ""}
                  onChange={(e) =>
                    onChange({ motorbikeParkingFee: e.target.value })
                  }
                  placeholder="Ví dụ: 120000"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/xe/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.motorbikeParkingType === "INCLUDED"
                  ? "Miễn phí xe máy"
                  : "Không giữ xe"}
              </div>
            )}
          </div>
        </div>

        {/* Phí gửi ô tô */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground">
            Phí gửi ô tô
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.carParkingType}
              onChange={(e) =>
                onChange({
                  carParkingType: e.target
                    .value as MonthlyExpensesData["carParkingType"],
                })
              }
              className={selectClass}
            >
              <option value="NONE">Không có chỗ đỗ ô tô</option>
              <option value="PER_VEHICLE">Thu phí theo xe / tháng</option>
              <option value="INCLUDED">Đã bao gồm chỗ đỗ ô tô</option>
            </select>

            {data.carParkingType === "PER_VEHICLE" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={data.carParkingFee ?? ""}
                  onChange={(e) => onChange({ carParkingFee: e.target.value })}
                  placeholder="Ví dụ: 1500000"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/xe/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.carParkingType === "INCLUDED"
                  ? "Miễn phí đỗ ô tô"
                  : "Không có chỗ đỗ ô tô"}
              </div>
            )}
          </div>
        </div>

        {/* Điều hòa ngoài giờ (Chỉ hiển thị cho Văn phòng) */}
        {isOffice && (
          <div className="sm:col-span-2 space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            <label className="block text-xs font-bold text-foreground">
              Phí điều hòa ngoài giờ (Văn phòng)
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={data.overtimeAcFee ?? ""}
                  onChange={(e) => onChange({ overtimeAcFee: e.target.value })}
                  placeholder="Ví dụ: 150000 hoặc để trống nếu tính theo thỏa thuận"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/giờ
                </span>
              </div>
              <p className="flex items-center text-xs text-muted-foreground">
                Phí vận hành hệ thống điều hòa khi làm việc ngoài giờ quy định của tòa nhà
              </p>
            </div>
          </div>
        )}

        {/* Danh sách khoản phí tùy chỉnh khác */}
        <div className="sm:col-span-2 space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">
              Các khoản chi phí khác (tùy chọn)
            </h3>
            <button
              type="button"
              onClick={handleAddCustomFee}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm khoản phí
            </button>
          </div>

          {data.customFees.map((fee) => (
            <div
              key={fee.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={fee.name}
                onChange={(e) =>
                  handleUpdateCustomFee(fee.id, "name", e.target.value)
                }
                placeholder="Tên khoản phí (VD: Giặt ủi, Hồ bơi...)"
                className={`${inputClass} sm:w-1/3`}
              />
              <div className="relative sm:w-1/3">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={fee.amount}
                  onChange={(e) =>
                    handleUpdateCustomFee(fee.id, "amount", e.target.value)
                  }
                  placeholder="Số tiền"
                  className={inputClass}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  VNĐ
                </span>
              </div>
              <input
                type="text"
                value={fee.unit}
                onChange={(e) =>
                  handleUpdateCustomFee(fee.id, "unit", e.target.value)
                }
                placeholder="Đơn vị tính (VD: tháng, lần...)"
                className={`${inputClass} sm:w-1/4`}
              />
              <button
                type="button"
                onClick={() => handleRemoveCustomFee(fee.id)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </FormSectionWrapper>
  );
}
