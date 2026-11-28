(() => {
  const token = window.location.hash.slice(1);
  const status = document.getElementById("session-status");
  const retry = document.getElementById("retry");
  const form = document.getElementById("proof-form");
  const library = document.getElementById("library");
  const camera = document.getElementById("camera");
  const selection = document.getElementById("selection");
  const preview = document.getElementById("preview");
  const filename = document.getElementById("filename");
  const remove = document.getElementById("remove");
  const submit = document.getElementById("submit");
  const error = document.getElementById("upload-error");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const maxBytes = 15 * 1024 * 1024;
  let file;
  let previewUrl;

  function showStatus(message, tone = "") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showError(message) {
    error.hidden = !message;
    error.textContent = message;
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    preview.removeAttribute("src");
    preview.hidden = true;
    selection.hidden = true;
    file = undefined;
    submit.disabled = true;
  }

  function chooseFile(event) {
    const chosen = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!chosen) return;
    clearSelection();
    if (!allowed.has(chosen.type)) {
      showError("Chọn ảnh JPG, PNG, WebP hoặc tệp PDF.");
      return;
    }
    if (!chosen.size || chosen.size > maxBytes) {
      showError("Tệp phải có dữ liệu và không vượt quá 15 MB.");
      return;
    }
    showError("");
    file = chosen;
    filename.textContent = file.name;
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      preview.hidden = false;
    }
    selection.hidden = false;
    submit.disabled = false;
  }

  async function request(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), body ? 75000 : 12000);
    try {
      const response = await fetch("/api/payment-proof", {
        method: body ? "POST" : "GET", body, credentials: "omit", redirect: "error",
        cache: "no-store", referrerPolicy: "no-referrer", signal: controller.signal,
        headers: { Accept: "application/json", "X-Proof-Upload-Token": token },
      });
      const data = await response.json().catch(() => null);
      return { response, data };
    } finally {
      clearTimeout(timeout);
    }
  }

  function finish(message, tone) {
    clearSelection();
    form.hidden = true;
    retry.hidden = true;
    showStatus(message, tone);
  }

  function showUploaded() {
    finish("Đã gửi chứng từ thành công. Bạn có thể quay lại máy tính để theo dõi yêu cầu.", "success");
  }

  function showExpired() {
    finish("Mã QR đã hết hạn hoặc không còn hợp lệ. Vui lòng tạo mã mới trên máy tính.", "error");
  }

  async function checkSession() {
    retry.hidden = true;
    showStatus("Đang kiểm tra phiên tải…");
    try {
      const { response, data } = await request();
      if (data?.code === 7018) {
        showExpired();
      } else if (response.ok && data?.state === "UPLOADED") {
        showUploaded();
      } else if (response.ok && data?.state === "READY") {
        showStatus("Chọn tệp hoặc chụp ảnh chứng từ để gửi đi kiểm tra.");
        form.hidden = false;
      } else {
        throw new Error("Unexpected session response");
      }
    } catch {
      showStatus("Chưa kiểm tra được phiên tải. Vui lòng thử lại.", "error");
      retry.hidden = false;
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file || submit.disabled) return;
    const body = new FormData();
    body.append("file", file);
    submit.disabled = library.disabled = camera.disabled = remove.disabled = true;
    submit.textContent = "Đang gửi chứng từ…";
    showError("");
    try {
      const { response, data } = await request(body);
      if (response.ok && data?.state === "UPLOADED") {
        showUploaded();
      } else if ([7018, 7019, 7020].includes(data?.code)) {
        showExpired();
      } else if ([7004, 7006, 7007, 7010, 7013, 7023].includes(data?.code)) {
        finish("Yêu cầu thanh toán đã thay đổi. Quay lại máy tính để kiểm tra trạng thái.", "error");
      } else if (response.status === 413 || data?.code === 3004) {
        showError("Tệp vượt giới hạn tải lên. Vui lòng chọn tệp nhỏ hơn.");
      } else if (data?.code === 7017) {
        showError("Tệp chứng từ không hợp lệ. Vui lòng chọn ảnh JPG, PNG, WebP hoặc PDF.");
      } else {
        throw new Error("Unexpected upload response");
      }
    } catch {
      showError("Chưa xác nhận được kết quả. Kiểm tra mạng rồi bấm gửi lại.");
    } finally {
      submit.textContent = "Gửi chứng từ";
      submit.disabled = !file;
      library.disabled = camera.disabled = remove.disabled = false;
    }
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    showExpired();
    return;
  }
  retry.addEventListener("click", checkSession);
  library.addEventListener("change", chooseFile);
  camera.addEventListener("change", chooseFile);
  remove.addEventListener("click", () => { clearSelection(); showError(""); });
  form.addEventListener("submit", upload);
  void checkSession();
})();
