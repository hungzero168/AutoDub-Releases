// Supabase Config (Public credentials from client config)
const SUPABASE_URL = "https://bkychcqqzheiowoxfqqs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreWNoY3FxemhlaW93b3hmcXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTY3MTIsImV4cCI6MjA5NzM5MjcxMn0.v6a-9cKXkkEZmVY38YA3xHjiQF_vEPXi8URwHe3AuGM";

// State
let serviceRoleKey = localStorage.getItem("supabase_service_role_key") || "";
let activeTab = "licenses-tab";
let allLicenses = [];

// DOM Elements
const loginContainer = document.getElementById("login-container");
const dashboardContainer = document.getElementById("dashboard-container");
const inputServiceKey = document.getElementById("supabase-service-key");
const btnLogin = document.getElementById("btn-login");
const loginError = document.getElementById("login-error");
const btnLogout = document.getElementById("btn-logout");
const tabTitle = document.getElementById("tab-title");

// Toast Notification helper
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");
    toastMessage.textContent = message;
    
    if (type === "error") {
        toast.style.borderLeftColor = "var(--danger)";
        toast.querySelector("i").style.color = "var(--danger)";
        toast.querySelector("i").className = "fa-solid fa-circle-xmark";
    } else {
        toast.style.borderLeftColor = "var(--success)";
        toast.querySelector("i").style.color = "var(--success)";
        toast.querySelector("i").className = "fa-solid fa-circle-check";
    }
    
    toast.style.display = "flex";
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// REST headers generator
function getHeaders(useServiceKey = true) {
    const key = useServiceKey ? serviceRoleKey : SUPABASE_ANON_KEY;
    return {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
}

// Authentication
function checkAuth() {
    if (serviceRoleKey) {
        loginContainer.style.display = "none";
        dashboardContainer.style.display = "grid";
        loadDashboardData();
    } else {
        loginContainer.style.display = "block";
        dashboardContainer.style.display = "none";
    }
}

btnLogin.addEventListener("click", async () => {
    const key = inputServiceKey.value.trim();
    if (!key) {
        loginError.textContent = "Vui lòng nhập Service Role Key!";
        loginError.style.display = "block";
        return;
    }
    
    // Validate by querying licenses with the key
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...';
    loginError.style.display = "none";
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses?limit=1`, {
            headers: {
                "apikey": key,
                "Authorization": `Bearer ${key}`
            }
        });
        
        if (res.ok) {
            serviceRoleKey = key;
            localStorage.setItem("supabase_service_role_key", key);
            checkAuth();
            showToast("Đăng nhập quyền quản trị thành công!");
        } else {
            loginError.textContent = "Khóa quản trị (Service Role Key) không hợp lệ hoặc bị từ chối!";
            loginError.style.display = "block";
        }
    } catch (e) {
        loginError.textContent = `Lỗi kết nối máy chủ: ${e.message}`;
        loginError.style.display = "block";
    } finally {
        btnLogin.disabled = false;
        btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập';
    }
});

btnLogout.addEventListener("click", () => {
    serviceRoleKey = "";
    localStorage.removeItem("supabase_service_role_key");
    inputServiceKey.value = "";
    checkAuth();
    showToast("Đã đăng xuất tài khoản quản trị.");
});

// Tab Switching
document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        document.querySelectorAll(".menu-item").forEach(mi => mi.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
        
        item.classList.add("active");
        const tabId = item.getAttribute("data-tab");
        document.getElementById(tabId).classList.add("active");
        
        activeTab = tabId;
        localStorage.setItem("activeAdminTab", tabId);
        if (tabId === "licenses-tab") {
            tabTitle.textContent = "Quản lý License Keys";
        } else if (tabId === "announcement-tab") {
            tabTitle.textContent = "Quản lý Thông báo";
        } else if (tabId === "analytics-tab") {
            tabTitle.textContent = "Thống kê & Logs";
            loadLogs();
        } else if (tabId === "monitor-tab") {
            tabTitle.textContent = "Giám sát Realtime";
            loadMonitor();
        } else if (tabId === "config-tab") {
            tabTitle.textContent = "Cấu hình CMD & Hệ thống";
        }
    });
});

// Phục hồi tab đã mở trước đó
document.addEventListener("DOMContentLoaded", () => {
    const savedTab = localStorage.getItem("activeAdminTab");
    if (savedTab) {
        const tabEl = document.querySelector(`.menu-item[data-tab="${savedTab}"]`);
        if (tabEl) {
            tabEl.click();
        }
    }
});

// Load Dashboard Data
function loadDashboardData() {
    loadLicenses();
    loadAnnouncement();
    loadGlobalConfig();
    loadLogs();
}

// --- LICENSES TAB LOGIC ---
async function loadLicenses() {
    const listBody = document.getElementById("licenses-list");
    listBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách key...</td></tr>';
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses?select=*`, {
            headers: getHeaders()
        });
        
        if (res.ok) {
            allLicenses = await res.json();
            renderLicenses(allLicenses);
        } else {
            showToast("Không thể tải danh sách key bản quyền!", "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

function renderLicenses(licenses) {
    const listBody = document.getElementById("licenses-list");
    listBody.innerHTML = "";
    
    // Đếm active users (có last_used_at trong 24h qua)
    let activeUsersToday = 0;
    const now = new Date();

    if (licenses.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Không tìm thấy key bản quyền nào.</td></tr>';
        document.getElementById("stat-active-users").textContent = "0";
        return;
    }
    
    licenses.forEach(lic => {
        if (lic.last_used_at) {
            const lastUsed = new Date(lic.last_used_at);
            const diffHours = (now - lastUsed) / (1000 * 60 * 60);
            if (diffHours <= 24) {
                activeUsersToday++;
            }
        }
        
        const tr = document.createElement("tr");
        
        let expires = "";
        if (lic.expires_at) {
            expires = new Date(lic.expires_at).toLocaleDateString("vi-VN", {
                year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
            });
        } else {
            const duration = lic.duration_days ?? 30;
            if (duration === -1) {
                expires = '<span style="color: var(--text-muted)">Vĩnh viễn (Chưa kích hoạt)</span>';
            } else {
                expires = `<span style="color: var(--text-muted)">${duration} ngày (Chưa kích hoạt)</span>`;
            }
        }
        
        const statusClass = lic.status === "active" ? "status-active" : "status-blocked";
        const statusText = lic.status === "active" ? "Kích hoạt" : "Đã khóa";
        
        tr.innerHTML = `
            <td><strong>${lic.license_key}</strong></td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="hwid-text">${lic.machine_id || '<i style="color: var(--text-muted)">Chưa liên kết máy</i>'}</td>
            <td>${expires}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm" onclick="resetHWID('${lic.license_key}')" title="Mở khóa để kích hoạt máy khác">
                        <i class="fa-solid fa-arrows-rotate"></i> Reset HWID
                    </button>
                    ${lic.status === 'active' 
                        ? `<button class="btn btn-danger btn-sm" onclick="toggleStatus('${lic.license_key}', 'blocked')" title="Khóa Key này"><i class="fa-solid fa-lock"></i> Khóa</button>` 
                        : `<button class="btn btn-primary btn-sm" style="padding: 10px 14px" onclick="toggleStatus('${lic.license_key}', 'active')" title="Mở Khóa Key"><i class="fa-solid fa-lock-open"></i> Mở</button>`
                    }
                    <button class="btn btn-danger btn-sm" onclick="deleteLicense('${lic.license_key}')" style="background-color: transparent; border: 1px solid var(--danger); color: var(--danger);" title="Xóa vĩnh viễn Key"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });
    
    document.getElementById("stat-active-users").textContent = activeUsersToday.toString();
}

// Search filter
document.getElementById("license-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
        renderLicenses(allLicenses);
        return;
    }
    
    const filtered = allLicenses.filter(lic => 
        lic.license_key.toLowerCase().includes(q) || 
        (lic.machine_id && lic.machine_id.toLowerCase().includes(q))
    );
    renderLicenses(filtered);
});

// Modal Logic
const modal = document.getElementById("license-modal");
const btnOpenCreate = document.getElementById("btn-open-create-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCancelModal = document.getElementById("btn-cancel-modal");
const btnGenerateKey = document.getElementById("btn-generate-key");
const inputModalKey = document.getElementById("modal-license-key");
const selectModalDays = document.getElementById("modal-license-days");
const selectModalStatus = document.getElementById("modal-license-status");
const btnSaveLicense = document.getElementById("btn-create-key");

btnOpenCreate.addEventListener("click", () => {
    inputModalKey.value = "";
    selectModalDays.value = "30";
    selectModalStatus.value = "active";
    modal.style.display = "flex";
});

const hideModal = () => { modal.style.display = "none"; };
btnCloseModal.addEventListener("click", hideModal);
btnCancelModal.addEventListener("click", hideModal);

btnGenerateKey.addEventListener("click", () => {
    // Generate a clean 16-character license key (e.g. AD-XXXX-XXXX-XXXX)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let p1 = "", p2 = "", p3 = "";
    for(let i=0; i<4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for(let i=0; i<4; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    for(let i=0; i<4; i++) p3 += chars.charAt(Math.floor(Math.random() * chars.length));
    inputModalKey.value = `AD-${p1}-${p2}-${p3}`;
});

btnSaveLicense.addEventListener("click", async () => {
    let key = inputModalKey.value.trim();
    if (!key) {
        // Auto-generate if left blank
        btnGenerateKey.click();
        key = inputModalKey.value;
    }
    
    const days = parseInt(selectModalDays.value);
    const status = selectModalStatus.value;
    
    btnSaveLicense.disabled = true;
    btnSaveLicense.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                license_key: key,
                machine_id: "", // Fix null constraint error
                expires_at: null, // Chưa kích hoạt
                duration_days: days, // Lưu thời hạn sử dụng
                status: status
            })
        });
        
        if (res.ok) {
            showToast("Tạo Key bản quyền thành công!");
            hideModal();
            loadLicenses();
        } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.message || "Không thể tạo key!"}`, "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    } finally {
        btnSaveLicense.disabled = false;
        btnSaveLicense.innerHTML = 'Lưu lại';
    }
});

// Reset HWID
window.resetHWID = async function(key) {
    if (!confirm(`Bạn có chắc chắn muốn xóa liên kết thiết bị (Reset HWID) cho Key: ${key}?\nHành động này cho phép kích hoạt key trên máy khác.`)) {
        return;
    }
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${key}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({
                machine_id: ""
            })
        });
        
        if (res.ok) {
            showToast("Đã Reset HWID thành công!");
            loadLicenses();
        } else {
            let errorMsg = "Không thể reset HWID!";
            try {
                const err = await res.json();
                errorMsg = `Không thể reset: ${err.message || JSON.stringify(err)}`;
            } catch(e) {}
            showToast(errorMsg, "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

// Toggle Status (Block / Active)
window.toggleStatus = async function(key, newStatus) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${key}`, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify({
                status: newStatus
            })
        });
        
        if (res.ok) {
            showToast(newStatus === 'active' ? "Đã mở khóa Key thành công!" : "Đã khóa Key thành công!");
            loadLicenses();
        } else {
            let errorMsg = "Không thể cập nhật trạng thái key!";
            try {
                const err = await res.json();
                errorMsg = `Lỗi: ${err.message || JSON.stringify(err)}`;
            } catch(e) {}
            showToast(errorMsg, "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

// Delete License Key
window.deleteLicense = async function(key) {
    if (!confirm(`CẢNH BÁO: Bạn có thực sự muốn xóa vĩnh viễn Key: ${key}?\nHành động này không thể hoàn tác.`)) {
        return;
    }
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${key}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        
        if (res.ok) {
            showToast("Đã xóa Key bản quyền vĩnh viễn!");
            loadLicenses();
        } else {
            showToast("Không thể xóa Key bản quyền!", "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

let allAnnouncements = [];

const inputAnnTitle = document.getElementById("announcement-title");
const inputAnnContent = document.getElementById("announcement-content");
const checkAnnActive = document.getElementById("announcement-active");
const checkAnnAlwaysShow = document.getElementById("announcement-always-show");
const inputAnnId = document.getElementById("modal-ann-id");
const btnSaveAnn = document.getElementById("btn-save-announcement");
const btnInsertLink = document.getElementById("btn-insert-link");
const annModal = document.getElementById("announcement-modal");
const btnOpenCreateAnnModal = document.getElementById("btn-open-create-ann-modal");
const btnCloseAnnModal = document.getElementById("btn-close-ann-modal");
const btnCancelAnnModal = document.getElementById("btn-cancel-ann-modal");

// Modal open/close logic for Announcements
function openAnnModal(ann = null) {
    if (ann) {
        document.getElementById("modal-ann-title").textContent = "Sửa Thông báo";
        inputAnnId.value = ann.id;
        inputAnnTitle.value = ann.title || "";
        inputAnnContent.value = ann.content || "";
        checkAnnActive.checked = ann.is_active || false;
        if (checkAnnAlwaysShow) checkAnnAlwaysShow.checked = ann.always_show || false;
    } else {
        document.getElementById("modal-ann-title").textContent = "Tạo Thông báo Mới";
        inputAnnId.value = "";
        inputAnnTitle.value = "";
        inputAnnContent.value = "";
        checkAnnActive.checked = true;
        if (checkAnnAlwaysShow) checkAnnAlwaysShow.checked = false;
    }
    annModal.style.display = "flex";
}

function closeAnnModal() {
    annModal.style.display = "none";
}

if (btnOpenCreateAnnModal) btnOpenCreateAnnModal.addEventListener("click", () => openAnnModal(null));
if (btnCloseAnnModal) btnCloseAnnModal.addEventListener("click", closeAnnModal);
if (btnCancelAnnModal) btnCancelAnnModal.addEventListener("click", closeAnnModal);

if (btnInsertLink) {
    btnInsertLink.addEventListener("click", () => {
        const start = inputAnnContent.selectionStart;
        const end = inputAnnContent.selectionEnd;
        const text = inputAnnContent.value;
        const selectedText = text.substring(start, end) || "Chữ hiển thị";
        
        const url = prompt("Nhập đường dẫn (URL):", "https://");
        if (url) {
            const linkText = `[${selectedText}](${url})`;
            inputAnnContent.value = text.substring(0, start) + linkText + text.substring(end);
            inputAnnContent.focus();
            inputAnnContent.selectionStart = start + linkText.length;
            inputAnnContent.selectionEnd = start + linkText.length;
        }
    });
}

async function loadAnnouncement() {
    const listBody = document.getElementById("announcements-list");
    if (!listBody) return;
    listBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải thông báo...</td></tr>';
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=eq.announcement&select=value`, {
            headers: getHeaders()
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                const parsedData = JSON.parse(data[0].value);
                if (Array.isArray(parsedData)) {
                    allAnnouncements = parsedData;
                } else if (parsedData && parsedData.title !== undefined) {
                    // Legacy object format -> array
                    parsedData.id = "ann_" + Date.now();
                    allAnnouncements = [parsedData];
                } else {
                    allAnnouncements = [];
                }
            } else {
                allAnnouncements = [];
            }
            renderAnnouncements(allAnnouncements);
        } else {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Lỗi tải thông báo.</td></tr>';
        }
    } catch (e) {
        console.error("Lỗi tải thông báo:", e);
        listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Lỗi tải thông báo.</td></tr>';
    }
}

function renderAnnouncements(annList) {
    const listBody = document.getElementById("announcements-list");
    if (!listBody) return;
    listBody.innerHTML = "";
    
    if (!annList || annList.length === 0) {
        listBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Không có thông báo nào.</td></tr>';
        return;
    }
    
    annList.forEach((ann, index) => {
        const tr = document.createElement("tr");
        
        const statusClass = ann.is_active ? "status-active" : "status-blocked";
        const statusText = ann.is_active ? "Đang hiện" : "Đã ẩn";
        
        const alwaysShowText = ann.always_show ? '<span style="color:var(--primary)">Có</span>' : '<span style="color:var(--text-muted)">Không</span>';
        
        tr.innerHTML = `
            <td><strong>${ann.title || '(Không tiêu đề)'}</strong></td>
            <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${ann.content.replace(/"/g, '&quot;')}">${ann.content}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${alwaysShowText}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-secondary btn-sm" onclick='moveAnnouncement(${index}, -1)' title="Đẩy lên" ${index === 0 ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fa-solid fa-arrow-up"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick='moveAnnouncement(${index}, 1)' title="Đẩy xuống" ${index === annList.length - 1 ? 'disabled style="opacity: 0.5;"' : ''}>
                        <i class="fa-solid fa-arrow-down"></i>
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick='editAnnouncement("${ann.id}")' title="Sửa thông báo">
                        <i class="fa-solid fa-pen"></i> Sửa
                    </button>
                    <button class="btn btn-danger btn-sm" onclick='deleteAnnouncement("${ann.id}")' style="background-color: transparent; border: 1px solid var(--danger); color: var(--danger);" title="Xóa thông báo">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

window.moveAnnouncement = async function(index, direction) {
    if (index + direction < 0 || index + direction >= allAnnouncements.length) return;
    
    // Swap
    const temp = allAnnouncements[index];
    allAnnouncements[index] = allAnnouncements[index + direction];
    allAnnouncements[index + direction] = temp;
    
    // Disable buttons temporarily to prevent double click while saving
    renderAnnouncements(allAnnouncements); 
    await saveAnnouncementsToDB();
}

window.editAnnouncement = function(id) {
    const ann = allAnnouncements.find(a => a.id === id);
    if (ann) openAnnModal(ann);
}

window.deleteAnnouncement = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa thông báo này?")) return;
    
    allAnnouncements = allAnnouncements.filter(a => a.id !== id);
    await saveAnnouncementsToDB();
}

btnSaveAnn.addEventListener("click", async () => {
    const title = inputAnnTitle.value.trim();
    const content = inputAnnContent.value.trim();
    const is_active = checkAnnActive.checked;
    const always_show = checkAnnAlwaysShow ? checkAnnAlwaysShow.checked : false;
    let id = inputAnnId.value;
    
    if (!content && !title) {
        showToast("Vui lòng nhập nội dung thông báo!", "error");
        return;
    }
    
    btnSaveAnn.disabled = true;
    btnSaveAnn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    
    if (id) {
        const ann = allAnnouncements.find(a => a.id === id);
        if (ann) {
            ann.title = title;
            ann.content = content;
            ann.is_active = is_active;
            ann.always_show = always_show;
        }
    } else {
        id = "ann_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        allAnnouncements.unshift({
            id: id,
            title: title,
            content: content,
            is_active: is_active,
            always_show: always_show
        });
    }
    
    await saveAnnouncementsToDB();
    
    closeAnnModal();
    btnSaveAnn.disabled = false;
    btnSaveAnn.innerHTML = 'Lưu Thông báo';
});

async function saveAnnouncementsToDB() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
            method: "POST",
            headers: {
                ...getHeaders(),
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
                key: "announcement",
                value: JSON.stringify(allAnnouncements),
                description: "Danh sách thông báo hiển thị trên giao diện app"
            })
        });
        
        if (res.ok) {
            showToast("Đã cập nhật danh sách thông báo!");
            renderAnnouncements(allAnnouncements);
        } else {
            showToast("Lỗi: Không thể lưu thông báo!", "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    }
}

// --- GLOBAL CONFIG TAB LOGIC (CMD TOGGLE & SYSTEM) ---
const checkShowConsole = document.getElementById("config-show-console");
const checkMaintenance = document.getElementById("config-maintenance");
const checkDevtool = document.getElementById("config-devtool");
const txtRequirements = document.getElementById("config-requirements");
const btnSaveConfig = document.getElementById("btn-save-config");

const inputToastMsg = document.getElementById("config-toast-msg");
const btnSendToast = document.getElementById("btn-send-toast");

async function loadGlobalConfig() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?key=in.(show_console,maintenance_mode,enable_devtool,requirements_update)&select=key,value`, {
            headers: getHeaders()
        });
        
        if (res.ok) {
            const data = await res.json();
            data.forEach(item => {
                if (item.key === "show_console") {
                    checkShowConsole.checked = item.value === "true";
                } else if (item.key === "maintenance_mode") {
                    checkMaintenance.checked = item.value === "true";
                } else if (item.key === "enable_devtool") {
                    if (checkDevtool) checkDevtool.checked = item.value === "true";
                } else if (item.key === "requirements_update") {
                    txtRequirements.value = item.value;
                }
            });
        }
    } catch (e) {
        console.error("Lỗi tải cấu hình hệ thống:", e);
    }
}

btnSaveConfig.addEventListener("click", async () => {
    const showConsoleVal = checkShowConsole.checked ? "true" : "false";
    const maintenanceVal = checkMaintenance.checked ? "true" : "false";
    const devtoolVal = (checkDevtool && checkDevtool.checked) ? "true" : "false";
    const requirementsVal = txtRequirements.value;
    
    btnSaveConfig.disabled = true;
    btnSaveConfig.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    
    try {
        // Upsert setting show_console
        await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
            method: "POST",
            headers: {
                ...getHeaders(),
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
                key: "show_console",
                value: showConsoleVal,
                description: "Cấu hình ẩn/hiện console CMD cho client"
            })
        });
        
        // Upsert setting maintenance_mode
        const res2 = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
            method: "POST",
            headers: {
                ...getHeaders(),
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
                key: "maintenance_mode",
                value: maintenanceVal,
                description: "Chế độ bảo trì hệ thống"
            })
        });
        
        // Upsert setting enable_devtool
        await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
            method: "POST",
            headers: {
                ...getHeaders(),
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
                key: "enable_devtool",
                value: devtoolVal,
                description: "Cấu hình bật/tắt F12 Devtool cho client"
            })
        });
        
        // Upsert setting requirements_update
        await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
            method: "POST",
            headers: {
                ...getHeaders(),
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify({
                key: "requirements_update",
                value: requirementsVal,
                description: "Danh sách thư viện pip cần tự động cập nhật"
            })
        });
        
        if (res2.ok) {
            showToast("Lưu cấu hình hệ thống thành công!", "success");
        } else {
            showToast("Lỗi: Không thể lưu cấu hình!", "error");
        }
    } catch (e) {
        showToast(`Lỗi: ${e.message}`, "error");
    } finally {
        btnSaveConfig.disabled = false;
        btnSaveConfig.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu cấu hình hệ thống';
    }
});

if (btnSendToast) {
    btnSendToast.addEventListener("click", async () => {
        const msg = inputToastMsg.value.trim();
        if (!msg) {
            showToast("Vui lòng nhập nội dung thông báo đẩy!", "error");
            return;
        }
        
        btnSendToast.disabled = true;
        btnSendToast.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
            const toastData = JSON.stringify({
                message: msg,
                timestamp: new Date().getTime() // Thêm ID thời gian để client biết là thông báo mới
            });
            
            const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?on_conflict=key`, {
                method: "POST",
                headers: {
                    ...getHeaders(),
                    "Prefer": "resolution=merge-duplicates"
                },
                body: JSON.stringify({
                    key: "toast_notification",
                    value: toastData,
                    description: "Thông báo đẩy nhỏ góc màn hình"
                })
            });
            
            if (res.ok) {
                showToast("Đã gửi thông báo đẩy thành công!");
                inputToastMsg.value = "";
            } else {
                showToast("Không thể gửi thông báo đẩy!", "error");
            }
        } catch (e) {
            showToast(`Lỗi: ${e.message}`, "error");
        } finally {
            btnSendToast.disabled = false;
            btnSendToast.innerHTML = 'Phát đi';
        }
    });
}

// --- LOGS LOGIC ---
let allLogs = [];
let filteredLogs = [];
let currentLogPage = 1;
const logsPerPage = 20;

async function loadLogs() {
    const listBody = document.getElementById("crash-logs-list");
    const countEl = document.getElementById("stat-crash-count");
    if (!listBody) return;
    
    listBody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải logs...</td></tr>';
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/crash_logs?select=*&order=created_at.desc&limit=1000`, {
            headers: getHeaders()
        });
        
        if (res.ok) {
            allLogs = await res.json();
            filteredLogs = [...allLogs];
            
            if (countEl) {
                countEl.textContent = allLogs.length > 999 ? "999+" : allLogs.length.toString();
            }
            
            currentLogPage = 1;
            renderLogs();
        } else {
            listBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger);">Lỗi tải dữ liệu. Bạn đã tạo bảng crash_logs chưa?</td></tr>';
        }
    } catch (e) {
        console.error("Load logs error:", e);
        listBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--danger);">Lỗi hệ thống: ${e.message}</td></tr>`;
    }
}

const btnPrev = document.getElementById("btn-log-prev");
    if (btnPrev) {
        btnPrev.addEventListener("click", () => {
            if (currentLogPage > 1) {
                currentLogPage--;
                renderLogs();
            }
        });
    }

    const btnNext = document.getElementById("btn-log-next");
    if (btnNext) {
        btnNext.addEventListener("click", () => {
            const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
            if (currentLogPage < totalPages) {
                currentLogPage++;
                renderLogs();
            }
        });
    }

    const btnDeleteLogs = document.getElementById("btn-delete-logs");
    if (btnDeleteLogs) {
        btnDeleteLogs.addEventListener("click", async () => {
            if (!confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ crash logs không? Hành động này không thể hoàn tác!")) return;
            
            btnDeleteLogs.disabled = true;
            btnDeleteLogs.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xóa...';
            
            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/crash_logs?id=gt.0`, {
                    method: "DELETE",
                    headers: getHeaders()
                });
                
                if (res.ok) {
                    showToast("Đã xóa toàn bộ logs thành công!");
                    loadLogs();
                } else {
                    showToast("Không thể xóa logs!", "error");
                }
            } catch (e) {
                showToast(`Lỗi: ${e.message}`, "error");
            } finally {
                btnDeleteLogs.disabled = false;
                btnDeleteLogs.innerHTML = '<i class="fa-solid fa-trash"></i> Xóa tất cả log';
            }
        });
    }

function renderLogs() {
        const listBody = document.getElementById("crash-logs-list");
        if (!listBody) return;

        listBody.innerHTML = "";

        if (filteredLogs.length === 0) {
            listBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Không có lỗi nào được ghi nhận hoặc không tìm thấy log phù hợp.</td></tr>';
            updateLogPagination();
            return;
        }

        const startIndex = (currentLogPage - 1) * logsPerPage;
        const endIndex = Math.min(startIndex + logsPerPage, filteredLogs.length);
        const pageLogs = filteredLogs.slice(startIndex, endIndex);

        pageLogs.forEach(log => {
            const tr = document.createElement("tr");
            const timeStr = new Date(log.created_at).toLocaleString("vi-VN");
            
            tr.innerHTML = `
                <td style="font-size: 12px; color: #888;">${timeStr}</td>
                <td><strong>${log.hwid || 'N/A'}</strong></td>
                <td style="color: var(--danger); font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all;">${log.error_message || ''}</td>
            `;
            listBody.appendChild(tr);
        });

        updateLogPagination();
    }

    function updateLogPagination() {
        const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
        const btnPrev = document.getElementById("btn-log-prev");
        const btnNext = document.getElementById("btn-log-next");
        const pageInfo = document.getElementById("log-page-info");

        if (btnPrev) btnPrev.disabled = currentLogPage <= 1;
        if (btnNext) btnNext.disabled = currentLogPage >= totalPages;
        if (pageInfo) pageInfo.textContent = `Trang ${currentLogPage} / ${totalPages}`;
    }

    document.addEventListener("DOMContentLoaded", () => {
        const searchInput = document.getElementById("log-search");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const q = e.target.value.toLowerCase().trim();
                if (!q) {
                    filteredLogs = [...allLogs];
                } else {
                    filteredLogs = allLogs.filter(log => 
                        (log.hwid && log.hwid.toLowerCase().includes(q)) || 
                        (log.error_message && log.error_message.toLowerCase().includes(q))
                    );
                }
                currentLogPage = 1;
                renderLogs();
            });
        }

        const btnPrev = document.getElementById("btn-log-prev");
        if (btnPrev) {
            btnPrev.addEventListener("click", () => {
                if (currentLogPage > 1) {
                    currentLogPage--;
                    renderLogs();
                }
            });
        }

        const btnNext = document.getElementById("btn-log-next");
        if (btnNext) {
            btnNext.addEventListener("click", () => {
                const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
                if (currentLogPage < totalPages) {
                    currentLogPage++;
                    renderLogs();
                }
            });
        }

        const btnDeleteLogs = document.getElementById("btn-delete-logs");
        if (btnDeleteLogs) {
            btnDeleteLogs.addEventListener("click", async () => {
                if (!confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ crash logs không? Hành động này không thể hoàn tác!")) return;
                
                btnDeleteLogs.disabled = true;
                btnDeleteLogs.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xóa...';
                
                try {
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/crash_logs?id=gt.0`, {
                        method: "DELETE",
                        headers: getHeaders()
                    });
                    
                    if (res.ok) {
                        if(typeof showToast !== "undefined") showToast("Đã xóa toàn bộ logs thành công!");
                        loadLogs();
                    } else {
                        if(typeof showToast !== "undefined") showToast("Không thể xóa logs!", "error");
                    }
                } catch (e) {
                    if(typeof showToast !== "undefined") showToast(`Lỗi: ${e.message}`, "error");
                } finally {
                    btnDeleteLogs.disabled = false;
                    btnDeleteLogs.innerHTML = '<i class="fa-solid fa-trash"></i> Xóa tất cả log';
                }
            });
        }
    });

// --- MONITOR LOGIC ---
async function loadMonitor() {
    const listBody = document.getElementById("monitor-list");
    if (!listBody) return;
    
    listBody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu realtime...</td></tr>';
    
    try {
        // Lấy toàn bộ danh sách máy
        const twoMinsAgoDate = new Date(Date.now() - 120000);
        const activeRes = await fetch(`${SUPABASE_URL}/rest/v1/active_sessions?order=last_ping.desc`, {
            headers: getHeaders()
        });
        
        // Lấy danh sách key để đối chiếu
        const keysRes = await fetch(`${SUPABASE_URL}/rest/v1/licenses?select=license_key`, {
            headers: getHeaders()
        });
        
        // Lấy danh sách HWID đã bị block
        const blockedRes = await fetch(`${SUPABASE_URL}/rest/v1/blocked_hwids?select=hwid`, {
            headers: getHeaders()
        });
        
        if (activeRes.ok && keysRes.ok && blockedRes.ok) {
            const sessions = await activeRes.json();
            const keysData = await keysRes.json();
            const blockedData = await blockedRes.json();
            const validKeys = new Set(keysData.map(k => k.license_key));
            const blockedHwids = new Set(blockedData.map(b => b.hwid));
            
            // Cập nhật số lượng active users trên tab Analytics luôn (chỉ đếm máy thực sự online)
            let onlineCount = 0;
            sessions.forEach(s => {
                if (new Date(s.last_ping) >= twoMinsAgoDate) onlineCount++;
            });
            const countEl = document.getElementById("stat-active-users");
            if (countEl) countEl.textContent = onlineCount.toString();
            
            listBody.innerHTML = "";
            
            if (sessions.length === 0) {
                listBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Hiện không có máy nào từng kết nối.</td></tr>';
                return;
            }
            
            sessions.forEach(session => {
                const tr = document.createElement("tr");
                const pingDate = new Date(session.last_ping);
                const timeStr = pingDate.toLocaleTimeString("vi-VN") + " " + pingDate.toLocaleDateString("vi-VN");
                
                const isOnline = pingDate >= twoMinsAgoDate;
                const statusBadge = isOnline 
                    ? `<span class="badge" style="background: #10b981; color: white;">Online</span>`
                    : `<span class="badge" style="background: #6b7280; color: white;">Offline</span>`;
                
                const isKeyValid = validKeys.has(session.license_key);
                // Nếu không có key hoặc key sai -> Khả năng bị bypass cục bộ
                const rowStyle = !isKeyValid ? 'background-color: rgba(239, 68, 68, 0.1);' : '';
                const keyHtml = !isKeyValid 
                    ? `<span style="color: #ef4444; font-weight: bold;">${session.license_key || 'KHÔNG CÓ'} <i class="fa-solid fa-triangle-exclamation"></i></span>` 
                    : `<span style="color: #10b981;">${session.license_key}</span>`;
                
                tr.style = rowStyle;
                const isBlocked = blockedHwids.has(session.hwid);
                const actionBtn = isBlocked
                    ? `<button class="btn btn-warning btn-sm" onclick="unblockApp('${session.hwid}')" title="Bỏ chặn máy này">
                           <i class="fa-solid fa-unlock"></i> BỎ CHẶN
                       </button>`
                    : `<button class="btn btn-danger btn-sm" onclick="killApp('${session.hwid}')" title="Chặn và đóng app trên máy này">
                           <i class="fa-solid fa-skull"></i> KILL
                       </button>`;
                
                tr.innerHTML = `
                    <td>${statusBadge}</td>
                    <td><strong>${session.hwid}</strong></td>
                    <td>${keyHtml}</td>
                    <td>${session.ip_address || 'N/A'}<br><small style="color:#888;">${session.app_version || ''}</small></td>
                    <td style="font-size: 12px; color: #888;">${timeStr}</td>
                    <td>${actionBtn}</td>
                `;
                listBody.appendChild(tr);
            });
        } else {
            let activeErr = "Unknown API Error";
            try { activeErr = await activeRes.text(); } catch(e) {}
            listBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Lỗi API: ${activeErr}</td></tr>`;
        }
    } catch (e) {
        listBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger);">Lỗi kết nối: ${e.message}</td></tr>`;
    }
}

async function killApp(hwid) {
    if (!confirm(`Bạn có chắc chắn muốn KILL và BLOCK thiết bị HWID: ${hwid} không?\nApp của họ sẽ bị tắt ngay lập tức và không thể mở lại.`)) {
        return;
    }
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_hwids`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                hwid: hwid,
                reason: "Bị chặn thủ công từ Admin Dashboard"
            })
        });
        
        if (res.ok) {
            showToast("Đã đưa HWID vào sổ đen. App sẽ tự đóng trong vài giây!", "success");
            loadMonitor();
        } else {
            const err = await res.json();
            showToast(`Lỗi: ${err.message}`, "error");
        }
    } catch (e) {
        showToast(`Lỗi kết nối: ${e.message}`, "error");
    }
}

const btnRefreshMonitor = document.getElementById("btn-refresh-monitor");
if (btnRefreshMonitor) {
    btnRefreshMonitor.addEventListener("click", loadMonitor);
}

// Initialize on page load
checkAuth();

async function unblockApp(hwid) {
    if (!confirm(`Bạn có chắc chắn muốn BỎ CHẶN thiết bị HWID: ${hwid} không?\nHọ sẽ có thể tiếp tục sử dụng app nếu có key hợp lệ.`)) {
        return;
    }
    
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/blocked_hwids?hwid=eq.${hwid}`, {
            method: "DELETE",
            headers: getHeaders()
        });
        
        if (res.ok) {
            showToast("Đã bỏ chặn máy tính thành công!", "success");
            loadMonitor(); // Reload list
        } else {
            const err = await res.text();
            showToast(`Lỗi: ${err}`, "danger");
        }
    } catch (e) {
        showToast("Lỗi kết nối", "danger");
    }
}
