/**
 * Main Application Logic & URL Hash State Manager
 */

window.app = {
    members: [],
    activeMemberIndex: 0,
    venues: [],
    selectedSlot: null,
    lockedPlan: null,

    async init() {
        console.log("[App] Initializing Hangout Planner...");

        // Nạp cơ sở dữ liệu địa điểm venues.json
        await this.loadVenues();

        // Nạp Pyodide WASM Engine
        if (window.PyodideBridge) {
            window.PyodideBridge.init();
        }

        // Kiểm tra URL State Hash nếu có link được chia sẻ
        const loadedFromHash = this.loadFromUrlHash();

        if (!loadedFromHash || this.members.length === 0) {
            // Thêm dữ liệu mẫu 4 người mặc định nếu chưa có
            this.loadSampleData();
        }

        this.updateUI();
    },

    async loadVenues() {
        try {
            const resp = await fetch('data/venues.json');
            if (resp.ok) {
                this.venues = await resp.json();
                console.log(`[App] Loaded ${this.venues.length} venues from database.`);
            } else {
                console.warn("[App] Could not fetch venues.json directly, fallback data active.");
                this.venues = this.getFallbackVenues();
            }
        } catch (e) {
            console.warn("[App] Error loading venues.json, using fallback:", e);
            this.venues = this.getFallbackVenues();
        }
    },

    getFallbackVenues() {
        return [
            {
                id: "v1",
                name: "The Coffee House - Nguyễn Trãi",
                category: "cafe",
                time_tags: ["morning", "afternoon"],
                price_range: "$$",
                capacity: 30,
                address: "141 Nguyễn Trãi, Quận 1, TP.HCM",
                tags: ["cà phê", "yên tĩnh", "làm việc"],
                rating: 4.6,
                image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&auto=format&fit=crop"
            },
            {
                id: "v2",
                name: "Quán Bụi - Vietnamese Bistro",
                category: "restaurant",
                time_tags: ["noon", "evening"],
                price_range: "$$$",
                capacity: 50,
                address: "19 Ngô Văn Năm, Quận 1, TP.HCM",
                tags: ["ăn trưa", "ăn tối", "món việt"],
                rating: 4.8,
                image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop"
            },
            {
                id: "v3",
                name: "Boardgame Station Hub",
                category: "entertainment",
                time_tags: ["afternoon", "evening"],
                price_range: "$$",
                capacity: 25,
                address: "30 Trần Cao Vân, Quận 3, TP.HCM",
                tags: ["boardgame", "vui chơi", "giải trí"],
                rating: 4.7,
                image_url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500&auto=format&fit=crop"
            }
        ];
    },

    loadSampleData() {
        const createEmpty = () => Array(7).fill(0).map(() => Array(6).fill(0));
        
        const m1 = createEmpty(); m1[0][0]=1; m1[0][1]=1; m1[5][3]=1; m1[5][4]=1; m1[6][3]=1;
        const m2 = createEmpty(); m2[0][0]=1; m2[0][1]=1; m2[5][3]=1; m2[5][4]=1; m2[6][4]=1;
        const m3 = createEmpty(); m3[0][0]=1; m3[0][1]=0; m3[5][3]=1; m3[5][4]=1; m3[6][3]=1;
        const m4 = createEmpty(); m4[0][0]=1; m4[0][1]=1; m4[5][3]=1; m4[5][4]=0; m4[6][3]=1;

        this.members = [
            { id: "m1", name: "Trưởng Nhóm Híu", matrix: m1 },
            { id: "m2", name: "Minh Anh", matrix: m2 },
            { id: "m3", name: "Đức Tuấn", matrix: m3 },
            { id: "m4", name: "Thu Trang", matrix: m4 }
        ];
        this.activeMemberIndex = 0;
        this.updateUI();
    },

    addMember() {
        const input = document.getElementById("input-member-name");
        const name = input.value.trim();
        if (!name) return;

        const newMember = {
            id: "m_" + Date.now(),
            name: name,
            matrix: Array(7).fill(0).map(() => Array(6).fill(0))
        };

        this.members.push(newMember);
        this.activeMemberIndex = this.members.length - 1;
        input.value = "";
        this.updateUI();
    },

    removeMember(index) {
        this.members.splice(index, 1);
        if (this.activeMemberIndex >= this.members.length) {
            this.activeMemberIndex = Math.max(0, this.members.length - 1);
        }
        this.updateUI();
    },

    selectMember(index) {
        this.activeMemberIndex = index;
        this.updateUI();
    },

    toggleSlot(dayIdx, slotIdx) {
        if (this.members.length === 0) return;
        const currentVal = this.members[this.activeMemberIndex].matrix[dayIdx][slotIdx];
        this.members[this.activeMemberIndex].matrix[dayIdx][slotIdx] = currentVal === 1 ? 0 : 1;
        this.updateUI();
    },

    analyzeSchedule() {
        // Ưu tiên dùng Python Pyodide Engine nếu khả dụng
        if (window.PyodideBridge && window.PyodideBridge.isReady) {
            const pyResult = window.PyodideBridge.analyzeSchedule(this.members);
            if (pyResult) return pyResult;
        }

        // Fallback JS Engine
        const n = this.members.length;
        const agg = Array(7).fill(0).map(() => Array(6).fill(0));
        this.members.forEach(m => {
            for (let d = 0; d < 7; d++) {
                for (let s = 0; s < 6; s++) {
                    agg[d][s] += m.matrix[d][s];
                }
            }
        });

        const ranked = [];
        const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
        const SLOTS = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00"];
        const TAGS = ["morning", "morning", "noon", "afternoon", "afternoon", "evening"];

        for (let d = 0; d < 7; d++) {
            for (let s = 0; s < 6; s++) {
                const count = agg[d][s];
                const status = count === n ? "optimal" : (count >= Math.max(1, Math.floor(n * 0.8)) ? "sub_optimal" : "conflict");
                const avail = this.members.filter(m => m.matrix[d][s] === 1).map(m => m.name);
                const absent = this.members.filter(m => m.matrix[d][s] === 0).map(m => m.name);

                ranked.push({
                    day_index: d,
                    slot_index: s,
                    day_name: DAYS[d],
                    slot_label: SLOTS[s],
                    slot_tag: TAGS[s],
                    available_count: count,
                    total_members: n,
                    score: count * 10,
                    status: status,
                    available_members: avail,
                    absent_members: absent
                });
            }
        }

        ranked.sort((a, b) => b.score - a.score);
        return {
            aggregate_matrix: agg,
            ranked_slots: ranked,
            optimal_slots: ranked.filter(r => r.status === "optimal"),
            sub_optimal_slots: ranked.filter(r => r.status === "sub_optimal"),
            conflict_slots: ranked.filter(r => r.status === "conflict"),
            summary: {
                total_members: n,
                optimal_count: ranked.filter(r => r.status === "optimal").length,
                sub_optimal_count: ranked.filter(r => r.status === "sub_optimal").length
            }
        };
    },

    updateUI() {
        // Update stats
        document.getElementById("stat-members-count").innerText = this.members.length;
        document.getElementById("member-badge").innerText = this.members.length;

        // Render member list
        const memberContainer = document.getElementById("member-list-container");
        if (memberContainer) {
            memberContainer.innerHTML = this.members.map((m, idx) => `
                <div onclick="window.app.selectMember(${idx})" 
                     class="p-2.5 rounded-lg border cursor-pointer flex justify-between items-center ${idx === this.activeMemberIndex ? 'bg-indigo-50 border-indigo-500 font-bold text-indigo-900' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}">
                    <span class="truncate"><i class="fa-solid fa-user-circle mr-2 text-indigo-500"></i>${m.name}</span>
                    <button onclick="event.stopPropagation(); window.app.removeMember(${idx})" class="text-rose-500 hover:text-rose-700 px-1.5 py-0.5 text-xs rounded">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `).join("");
        }

        // Render input grid
        if (this.members.length > 0) {
            const activeM = this.members[this.activeMemberIndex];
            document.getElementById("current-editing-title").innerHTML = `
                Khai Báo Lịch: <span class="text-indigo-600 font-bold">${activeM.name}</span>
            `;
            window.MatrixUI.renderInputGrid("input-grid-container", activeM.matrix);
        }

        // Run Analysis
        const analysis = this.analyzeSchedule();
        document.getElementById("stat-optimal-slots").innerText = analysis.summary.optimal_count;

        // Render Heatmap
        window.MatrixUI.renderHeatmap("heatmap-container", analysis.aggregate_matrix, this.members.length);

        // Render Top Recommended Slots
        this.renderTopSlotsList(analysis);

        // Auto update URL hash
        this.saveToUrlHash();
    },

    renderTopSlotsList(analysis) {
        const container = document.getElementById("top-slots-container");
        if (!container) return;

        const topSlots = analysis.ranked_slots.slice(0, 5);
        if (topSlots.length === 0 || this.members.length === 0) {
            container.innerHTML = `<p class="text-sm text-slate-400">Chưa có dữ liệu xếp hạng.</p>`;
            return;
        }

        container.innerHTML = topSlots.map((slot, idx) => `
            <div class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">#${idx + 1}</span>
                    <div>
                        <h4 class="font-bold text-slate-900 text-sm">${slot.day_name} | ${slot.slot_label}</h4>
                        <p class="text-xs text-slate-500">
                            Có <strong class="text-emerald-600">${slot.available_count}/${slot.total_members}</strong> rảnh
                            ${slot.absent_members.length > 0 ? `(Vắng: ${slot.absent_members.join(", ")})` : '(Đầy đủ)'}
                        </p>
                    </div>
                </div>
                <button onclick="window.app.selectSlotForRecommendation(${slot.day_index}, ${slot.slot_index})" 
                        class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition">
                    <i class="fa-solid fa-map-pin"></i> Chọn & Tìm Địa Điểm
                </button>
            </div>
        `).join("");
    },

    selectSlotForRecommendation(dayIdx, slotIdx) {
        const analysis = this.analyzeSchedule();
        const slot = analysis.ranked_slots.find(s => s.day_index === dayIdx && s.slot_index === slotIdx);
        if (!slot) return;

        this.selectedSlot = slot;
        this.switchTab('tab-venues');

        document.getElementById("selected-slot-banner").innerHTML = `
            <div class="p-4 bg-indigo-900 text-white rounded-xl flex justify-between items-center shadow">
                <div>
                    <span class="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Khung Giờ Đã Chốt</span>
                    <h3 class="text-lg font-bold">${slot.day_name} | ${slot.slot_label}</h3>
                    <p class="text-xs text-indigo-200">${slot.available_count}/${slot.total_members} người tham gia: ${slot.available_members.join(", ")}</p>
                </div>
                <span class="px-3 py-1 bg-emerald-500 text-white font-bold text-xs rounded-full">Tag: ${slot.slot_tag.toUpperCase()}</span>
            </div>
        `;

        this.renderVenueRecommendations(slot.slot_tag);
    },

    renderVenueRecommendations(slotTag) {
        const container = document.getElementById("venue-list-container");
        if (!container) return;

        // Filter venues matching slot tag
        const filtered = this.venues.filter(v => v.time_tags.includes(slotTag) || v.time_tags.includes("all"));

        if (filtered.length === 0) {
            container.innerHTML = `<p class="text-slate-500 py-6 text-center">Chưa tìm thấy địa điểm phù hợp cho khung giờ này.</p>`;
            return;
        }

        container.innerHTML = filtered.map(v => `
            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row hover:shadow-md transition">
                <img src="${v.image_url}" alt="${v.name}" class="w-full md:w-48 h-40 object-cover">
                <div class="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                        <div class="flex justify-between items-start">
                            <h3 class="font-bold text-slate-900 text-base">${v.name}</h3>
                            <span class="text-amber-500 font-bold text-xs"><i class="fa-solid fa-star mr-1"></i>${v.rating}</span>
                        </div>
                        <p class="text-xs text-slate-500"><i class="fa-solid fa-location-dot mr-1 text-rose-500"></i>${v.address}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${v.tags.map(t => `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px]">${t}</span>`).join("")}
                        </div>
                    </div>
                    <div class="flex justify-between items-center border-t pt-2 mt-2">
                        <span class="text-xs font-semibold text-indigo-600">${v.price_range} • Sức chứa ${v.capacity} người</span>
                        <button onclick="window.app.lockFinalPlan('${v.id}')" 
                                class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition">
                            <i class="fa-solid fa-check-double mr-1"></i>Chốt Địa Điểm Này
                        </button>
                    </div>
                </div>
            </div>
        `).join("");
    },

    lockFinalPlan(venueId) {
        const venue = this.venues.find(v => v.id === venueId);
        if (!venue || !this.selectedSlot) return;

        this.lockedPlan = {
            slot: this.selectedSlot,
            venue: venue,
            createdAt: new Date().toLocaleDateString("vi-VN")
        };

        this.switchTab('tab-summary');
        this.renderSummaryPage();
    },

    renderSummaryPage() {
        const container = document.getElementById("summary-content-container");
        if (!container || !this.lockedPlan) return;

        const { slot, venue } = this.lockedPlan;

        container.innerHTML = `
            <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-6 max-w-2xl mx-auto">
                <div class="text-center space-y-2">
                    <span class="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        <i class="fa-solid fa-circle-check mr-1"></i> Kế Hoạch Đã Hoàn Tất
                    </span>
                    <h2 class="text-2xl font-bold text-slate-900">Đi Chơi Cùng Nhóm!</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                        <h4 class="text-xs text-slate-400 uppercase font-bold">Thời Gian</h4>
                        <p class="font-bold text-indigo-900 text-base">${slot.day_name}</p>
                        <p class="text-sm text-slate-700 font-semibold">${slot.slot_label}</p>
                    </div>
                    <div>
                        <h4 class="text-xs text-slate-400 uppercase font-bold">Địa Điểm</h4>
                        <p class="font-bold text-indigo-900 text-base">${venue.name}</p>
                        <p class="text-xs text-slate-600">${venue.address}</p>
                    </div>
                </div>

                <div>
                    <h4 class="text-xs text-slate-400 uppercase font-bold mb-2">Thành Viên Tham Gia (${slot.available_count}/${slot.total_members})</h4>
                    <div class="flex flex-wrap gap-2">
                        ${slot.available_members.map(m => `<span class="bg-emerald-100 text-emerald-800 font-semibold px-3 py-1 rounded-full text-xs"><i class="fa-solid fa-user-check mr-1"></i>${m}</span>`).join("")}
                    </div>
                </div>

                <div class="pt-4 border-t flex justify-between items-center">
                    <button onclick="window.print()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        <i class="fa-solid fa-print mr-1"></i> In / Tải PDF
                    </button>
                    <button onclick="window.app.copyShareLink()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        <i class="fa-solid fa-share-nodes mr-1"></i> Sao Chép Link Kế Hoạch
                    </button>
                </div>
            </div>
        `;
    },

    saveToUrlHash() {
        try {
            const state = { members: this.members };
            const jsonStr = JSON.stringify(state);
            const b64 = btoa(encodeURIComponent(jsonStr));
            window.location.hash = `group=${b64}`;
        } catch (e) {
            console.error("[App] Failed encoding state to URL hash", e);
        }
    },

    loadFromUrlHash() {
        try {
            const hash = window.location.hash;
            if (hash.startsWith("#group=")) {
                const b64 = hash.replace("#group=", "");
                const jsonStr = decodeURIComponent(atob(b64));
                const state = JSON.parse(jsonStr);
                if (state && Array.isArray(state.members)) {
                    this.members = state.members;
                    console.log(`[App] Loaded ${this.members.length} members from shared URL Hash.`);
                    return true;
                }
            }
        } catch (e) {
            console.error("[App] Failed decoding state from URL hash", e);
        }
        return false;
    },

    copyShareLink() {
        this.saveToUrlHash();
        navigator.clipboard.writeText(window.location.href);
        alert("Đã sao chép link cuộc hẹn! Hãy gửi link này cho các thành viên trong nhóm để xem ma trận lịch.");
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.replace('block', 'hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-indigo-600', 'text-indigo-600');
            btn.classList.add('border-transparent', 'text-slate-500');
        });

        const activeContent = document.getElementById(tabId);
        const activeBtn = document.getElementById('btn-' + tabId);

        if (activeContent) activeContent.classList.replace('hidden', 'block');
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-slate-500');
            activeBtn.classList.add('border-indigo-600', 'text-indigo-600');
        }
    }
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    window.app.init();
});
