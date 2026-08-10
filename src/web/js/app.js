/**
 * Main Application Logic for Hangout Planner (Cloudflare Pages REST API + D1 Edge Database)
 */

window.app = {
    currentRoom: null, // { id, group_name, threshold_pct }
    members: [],
    activeMemberIndex: 0,
    venues: [],
    selectedSlot: null,
    lockedPlan: null,
    leafletMap: null,
    markersLayer: null,
    currentVenueView: 'list',
    analysisResult: null,

    async init() {
        console.log("[App] Initializing Hangout Planner with Cloudflare REST API...");

        // Load Venues
        await this.loadVenues();

        // Check if room param exists in URL (?room=xxx or hash #room=xxx)
        const urlParams = new URLSearchParams(window.location.search);
        let roomId = urlParams.get("room");
        if (!roomId && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
            roomId = hashParams.get("room");
        }

        if (roomId) {
            await this.loadRoom(roomId);
        } else {
            // Auto create a sample default session room if none provided
            await this.createDefaultSampleRoom();
        }

        this.updateUI();
    },

    async createDefaultSampleRoom() {
        try {
            const resp = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    group_name: "Hội Cà Phê Mẫu",
                    threshold_pct: 0.8
                })
            });
            if (resp.ok) {
                const data = await resp.json();
                this.currentRoom = data.room;
                // Add sample members to D1
                await this.loadSampleDataForRoom(data.room.id);
            }
        } catch (e) {
            console.warn("[App] Could not create default room via API, running offline fallback:", e);
            this.currentRoom = { id: "offline_sample", group_name: "Hội Cà Phê Mẫu (Offline)", threshold_pct: 0.8 };
            this.loadSampleDataOffline();
        }
    },

    async loadSampleDataForRoom(roomId) {
        const createEmpty = () => Array(7).fill(0).map(() => Array(6).fill(0));
        
        const m1 = createEmpty(); m1[0][0]=1; m1[0][1]=1; m1[5][3]=1; m1[5][4]=1; m1[6][3]=1;
        const m2 = createEmpty(); m2[0][0]=1; m2[0][1]=1; m2[5][3]=1; m2[5][4]=1; m2[6][4]=1;
        const m3 = createEmpty(); m3[0][0]=1; m3[0][1]=0; m3[5][3]=1; m3[5][4]=1; m3[6][3]=1;

        const sampleMembers = [
            { name: "Trưởng Nhóm Híu", matrix: m1 },
            { name: "Minh Anh", matrix: m2 },
            { name: "Đức Tuấn", matrix: m3 }
        ];

        for (const m of sampleMembers) {
            await fetch(`/api/rooms/${roomId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(m)
            });
        }

        await this.loadRoom(roomId);
    },

    loadSampleDataOffline() {
        const createEmpty = () => Array(7).fill(0).map(() => Array(6).fill(0));
        const m1 = createEmpty(); m1[0][0]=1; m1[0][1]=1; m1[5][3]=1; m1[5][4]=1; m1[6][3]=1;
        const m2 = createEmpty(); m2[0][0]=1; m2[0][1]=1; m2[5][3]=1; m2[5][4]=1; m2[6][4]=1;
        
        this.members = [
            { id: "m1", name: "Trưởng Nhóm Híu", matrix: m1 },
            { id: "m2", name: "Minh Anh", matrix: m2 }
        ];
        this.activeMemberIndex = 0;
    },

    async loadRoom(roomId) {
        try {
            const resp = await fetch(`/api/rooms/${roomId}`);
            if (resp.ok) {
                const data = await resp.json();
                this.currentRoom = data.room;
                this.members = data.members || [];
                this.analysisResult = data.analysis;
                
                // Update URL query string without reloading page
                const newUrl = `${window.location.pathname}?room=${roomId}`;
                window.history.replaceState({ path: newUrl }, '', newUrl);

                if (this.activeMemberIndex >= this.members.length) {
                    this.activeMemberIndex = Math.max(0, this.members.length - 1);
                }
                this.updateUI();
                console.log(`[App] Successfully loaded room ${roomId}: ${this.currentRoom.group_name}`);
            } else {
                alert("Không tìm thấy thông tin phòng! Đang khởi tạo phòng mới...");
                await this.createDefaultSampleRoom();
            }
        } catch (e) {
            console.error("[App] Failed to load room:", e);
        }
    },

    openCreateRoomModal() {
        document.getElementById("create-room-modal").classList.remove("hidden");
    },

    closeCreateRoomModal() {
        document.getElementById("create-room-modal").classList.add("hidden");
    },

    async createNewRoom(event) {
        event.preventDefault();
        const groupNameInput = document.getElementById("new-room-group-name");
        const thresholdSelect = document.getElementById("new-room-threshold");
        const groupName = groupNameInput.value.trim();
        const thresholdPct = parseFloat(thresholdSelect.value) || 0.8;

        if (!groupName) return;

        try {
            const resp = await fetch("/api/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    group_name: groupName,
                    threshold_pct: thresholdPct
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                this.closeCreateRoomModal();
                groupNameInput.value = "";
                await this.loadRoom(data.room.id);
                this.copyShareLink();
            } else {
                alert("Lỗi tạo phòng mới. Vui lòng thử lại!");
            }
        } catch (e) {
            console.error("[App] Failed creating new room:", e);
            alert("Lỗi kết nối Server API.");
        }
    },

    async loadVenues() {
        try {
            const resp = await fetch('/api/venues');
            if (resp.ok) {
                const data = await resp.json();
                if (data.venues && data.venues.length > 0) {
                    this.venues = data.venues;
                } else {
                    this.venues = this.getFallbackVenues();
                }
            } else {
                this.venues = this.getFallbackVenues();
            }
        } catch (e) {
            console.warn("[App] Could not fetch venues from API, using fallback:", e);
            this.venues = this.getFallbackVenues();
        }
        this.populateCityFilter();
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
                address: "141 Nguyễn Trãi, Phường Phạm Ngũ Lão, TP. Hồ Chí Minh",
                city: "TP. Hồ Chí Minh",
                ward: "Phường Phạm Ngũ Lão",
                lat: 10.7686,
                lng: 106.6918,
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
                address: "19 Ngô Văn Năm, Phường Bến Nghé, TP. Hồ Chí Minh",
                city: "TP. Hồ Chí Minh",
                ward: "Phường Bến Nghé",
                lat: 10.7812,
                lng: 106.7056,
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
                address: "30 Trần Cao Vân, Phường Võ Thị Sáu, TP. Hồ Chí Minh",
                city: "TP. Hồ Chí Minh",
                ward: "Phường Võ Thị Sáu",
                lat: 10.7834,
                lng: 106.6961,
                tags: ["boardgame", "vui chơi", "giải trí"],
                rating: 4.7,
                image_url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500&auto=format&fit=crop"
            }
        ];
    },

    async addMember() {
        const input = document.getElementById("input-member-name");
        const name = input.value.trim();
        if (!name) return;

        const newMatrix = Array(7).fill(0).map(() => Array(6).fill(0));

        if (this.currentRoom && this.currentRoom.id) {
            try {
                const resp = await fetch(`/api/rooms/${this.currentRoom.id}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, matrix: newMatrix })
                });

                if (resp.ok) {
                    input.value = "";
                    await this.loadRoom(this.currentRoom.id);
                    this.activeMemberIndex = this.members.length - 1;
                }
            } catch (e) {
                console.error("[App] Failed adding member via API:", e);
            }
        } else {
            this.members.push({ id: "m_" + Date.now(), name, matrix: newMatrix });
            this.activeMemberIndex = this.members.length - 1;
            input.value = "";
            this.updateUI();
        }
    },

    async removeMember(index) {
        const member = this.members[index];
        if (!member) return;

        if (this.currentRoom && this.currentRoom.id && member.id) {
            try {
                await fetch(`/api/rooms/${this.currentRoom.id}/members/${member.id}`, {
                    method: "DELETE"
                });
                await this.loadRoom(this.currentRoom.id);
            } catch (e) {
                console.error("[App] Failed deleting member via API:", e);
            }
        } else {
            this.members.splice(index, 1);
            if (this.activeMemberIndex >= this.members.length) {
                this.activeMemberIndex = Math.max(0, this.members.length - 1);
            }
            this.updateUI();
        }
    },

    selectMember(index) {
        this.activeMemberIndex = index;
        this.updateUI();
    },

    async toggleSlot(dayIdx, slotIdx) {
        if (this.members.length === 0) return;
        const currentMember = this.members[this.activeMemberIndex];
        const currentVal = currentMember.matrix[dayIdx][slotIdx];
        currentMember.matrix[dayIdx][slotIdx] = currentVal === 1 ? 0 : 1;

        // Auto save to API
        if (this.currentRoom && this.currentRoom.id) {
            try {
                await fetch(`/api/rooms/${this.currentRoom.id}/members`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        member_id: currentMember.id,
                        name: currentMember.name,
                        matrix: currentMember.matrix
                    })
                });
                await this.loadRoom(this.currentRoom.id);
            } catch (e) {
                console.error("[App] Error saving slot update:", e);
                this.updateUI();
            }
        } else {
            this.updateUI();
        }
    },

    copyShareLink() {
        let shareUrl = window.location.href;
        if (this.currentRoom && this.currentRoom.id) {
            shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom.id}`;
        }
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`Đã sao chép Link phiên nhóm:\n${shareUrl}`);
        }).catch(err => {
            console.error("Could not copy text: ", err);
        });
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('border-indigo-600', 'text-indigo-600');
            el.classList.add('border-transparent', 'text-slate-500');
        });

        const activeContent = document.getElementById(tabId);
        const activeBtn = document.getElementById(`btn-${tabId}`);
        if (activeContent) activeContent.classList.remove('hidden');
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-slate-500');
            activeBtn.classList.add('border-indigo-600', 'text-indigo-600');
        }
    },

    updateUI() {
        // Update Room Badge Header
        const roomBadge = document.getElementById("current-group-badge");
        if (roomBadge && this.currentRoom) {
            roomBadge.textContent = this.currentRoom.group_name;
            roomBadge.classList.remove("hidden");
        }

        // Render Members List
        this.renderMemberList();

        // Render Matrix Input Grid
        if (window.MatrixUI) {
            const activeMember = this.members[this.activeMemberIndex];
            const currentMatrix = (activeMember && activeMember.matrix)
                ? activeMember.matrix
                : Array(7).fill(0).map(() => Array(6).fill(0));

            window.MatrixUI.renderInputGrid(
                "input-grid-container",
                currentMatrix,
                (d, s) => this.toggleSlot(d, s)
            );
        }

        // Run analysis
        const analysis = this.analyzeScheduleLocal();
        
        // Stats
        document.getElementById("stat-members-count").textContent = this.members.length;
        document.getElementById("stat-optimal-slots").textContent = analysis.optimal_slots ? analysis.optimal_slots.length : 0;
        document.getElementById("member-badge").textContent = this.members.length;

        // Render Heatmap
        if (window.MatrixUI) {
            window.MatrixUI.renderHeatmap(
                "heatmap-container",
                analysis.aggregate_matrix || Array(7).fill(0).map(() => Array(6).fill(0)),
                this.members.length,
                (slot) => this.selectSlotForVenues(slot)
            );
        }

        this.renderTopSlots(analysis);
        this.applyVenueFilters();
    },

    async loadSampleData() {
        if (this.currentRoom && this.currentRoom.id && this.currentRoom.id !== "offline_sample") {
            await this.loadSampleDataForRoom(this.currentRoom.id);
        } else {
            this.loadSampleDataOffline();
            this.updateUI();
        }
    },

    selectSlotForRecommendation(dayIdx, slotIdx) {
        this.selectSlotForVenues({ day_index: dayIdx, slot_index: slotIdx });
    },

    openAddVenueModal() {
        const modal = document.getElementById("add-venue-modal");
        if (modal) modal.classList.remove("hidden");
    },

    closeAddVenueModal() {
        const modal = document.getElementById("add-venue-modal");
        if (modal) modal.classList.add("hidden");
    },

    parseGoogleMapsLink() {
        const input = document.getElementById("new-venue-gmap-link");
        const statusEl = document.getElementById("gmap-parse-status");
        if (!input) return;
        const url = input.value.trim();
        if (!url) return;

        // Regex extract @lat,lng from Google Maps link
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            const latInput = document.getElementById("new-venue-lat");
            const lngInput = document.getElementById("new-venue-lng");
            if (latInput) latInput.value = lat;
            if (lngInput) lngInput.value = lng;

            if (statusEl) {
                statusEl.textContent = `✓ Trích xuất tọa độ thành công: Lat ${lat}, Lng ${lng}`;
                statusEl.className = "text-[11px] text-emerald-600 font-bold mt-1";
            }
        } else {
            if (statusEl) {
                statusEl.textContent = "Không tìm thấy tọa độ GPS trong link. Vui lòng điền thủ công.";
                statusEl.className = "text-[11px] text-amber-600 font-semibold mt-1";
            }
        }
    },

    saveNewVenue(event) {
        if (event) event.preventDefault();
        const name = document.getElementById("new-venue-name")?.value.trim();
        const category = document.getElementById("new-venue-category")?.value || "cafe";
        const price_range = document.getElementById("new-venue-price")?.value || "$$";
        const capacity = parseInt(document.getElementById("new-venue-capacity")?.value || "30");
        const rating = parseFloat(document.getElementById("new-venue-rating")?.value || "4.5");
        const city = document.getElementById("new-venue-city")?.value.trim() || "TP. Hồ Chí Minh";
        const ward = document.getElementById("new-venue-ward")?.value.trim() || "Phường Bến Nghé";
        const address = document.getElementById("new-venue-address")?.value.trim() || "";
        const lat = parseFloat(document.getElementById("new-venue-lat")?.value || "0") || null;
        const lng = parseFloat(document.getElementById("new-venue-lng")?.value || "0") || null;
        const tagsStr = document.getElementById("new-venue-tags")?.value || "";
        const image_url = document.getElementById("new-venue-image")?.value.trim() || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500";

        const timeCheckboxes = document.querySelectorAll('input[name="time_tags"]:checked');
        const time_tags = Array.from(timeCheckboxes).map(cb => cb.value);

        if (!name || !address) {
            alert("Vui lòng điền đầy đủ Tên và Địa chỉ!");
            return;
        }

        const newVenue = {
            id: "v_" + Date.now(),
            name,
            category,
            time_tags: time_tags.length > 0 ? time_tags : ["morning", "afternoon"],
            price_range,
            capacity,
            address,
            city,
            ward,
            lat,
            lng,
            rating,
            tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
            image_url
        };

        this.venues.unshift(newVenue);
        this.closeAddVenueModal();
        this.populateCityFilter();
        alert(`Đã thêm địa điểm "${name}" thành công!`);
    },

    switchVenueView(mode) {
        this.currentVenueView = mode;
        const listBtn = document.getElementById("btn-view-list");
        const mapBtn = document.getElementById("btn-view-map");
        const listContainer = document.getElementById("venue-list-container");
        const mapContainer = document.getElementById("venue-map-container");

        if (mode === "map") {
            if (listBtn) listBtn.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-indigo-600";
            if (mapBtn) mapBtn.className = "px-3 py-1.5 rounded-md bg-white text-indigo-600 shadow-sm font-bold";
            if (listContainer) listContainer.classList.add("hidden");
            if (mapContainer) mapContainer.classList.remove("hidden");
            this.initLeafletMap();
        } else {
            if (listBtn) listBtn.className = "px-3 py-1.5 rounded-md bg-white text-indigo-600 shadow-sm font-bold";
            if (mapBtn) mapBtn.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-indigo-600";
            if (listContainer) listContainer.classList.remove("hidden");
            if (mapContainer) mapContainer.classList.add("hidden");
        }
    },

    initLeafletMap() {
        if (!window.L) return;
        const container = document.getElementById("venue-map-container");
        if (!container) return;

        if (!this.leafletMap) {
            this.leafletMap = window.L.map("venue-map-container").setView([10.7769, 106.7009], 13);
            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors"
            }).addTo(this.leafletMap);
        }

        if (this.markersLayer) {
            this.markersLayer.clearLayers();
        } else {
            this.markersLayer = window.L.layerGroup().addTo(this.leafletMap);
        }

        this.venues.forEach(v => {
            if (v.lat && v.lng) {
                const marker = window.L.marker([v.lat, v.lng]);
                marker.bindPopup(`
                    <div class="text-xs space-y-1">
                        <strong class="text-sm font-bold text-slate-900">${v.name}</strong>
                        <p class="text-slate-500">${v.address}</p>
                        <span class="text-indigo-600 font-bold">⭐ ${v.rating} • ${v.price_range}</span>
                    </div>
                `);
                this.markersLayer.addLayer(marker);
            }
        });

        setTimeout(() => {
            if (this.leafletMap) this.leafletMap.invalidateSize();
        }, 200);
    },

    analyzeScheduleLocal() {
        if (this.analysisResult) return this.analysisResult;
        
        const n = this.members.length;
        if (n === 0) return { aggregate_matrix: [], ranked_slots: [], optimal_slots: [] };

        const agg = Array(7).fill(0).map(() => Array(6).fill(0));
        this.members.forEach(m => {
            for (let d = 0; d < 7; d++) {
                for (let s = 0; s < 6; s++) {
                    if (m.matrix && m.matrix[d]) {
                        agg[d][s] += m.matrix[d][s];
                    }
                }
            }
        });

        const k = Math.max(1, Math.floor(n * (this.currentRoom?.threshold_pct || 0.8)));
        const optimal = [];
        const subOptimal = [];

        for (let d = 0; d < 7; d++) {
            for (let s = 0; s < 6; s++) {
                const count = agg[d][s];
                const slotObj = {
                    day_index: d,
                    slot_index: s,
                    available_count: count,
                    total_members: n,
                    status: count === n ? "optimal" : count >= k ? "sub_optimal" : "conflict"
                };
                if (count === n) optimal.push(slotObj);
                else if (count >= k) subOptimal.push(slotObj);
            }
        }

        return { aggregate_matrix: agg, optimal_slots: optimal, sub_optimal_slots: subOptimal };
    },

    renderMemberList() {
        const container = document.getElementById("member-list-container");
        if (!container) return;
        container.innerHTML = "";

        this.members.forEach((m, idx) => {
            const isActive = idx === this.activeMemberIndex;
            const div = document.createElement("div");
            div.className = `flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                isActive ? "bg-indigo-50 border-indigo-300 font-bold text-indigo-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`;
            div.onclick = () => this.selectMember(idx);

            div.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <i class="fa-solid fa-user-circle text-sm ${isActive ? "text-indigo-600" : "text-slate-400"}"></i>
                    <span class="truncate">${m.name}</span>
                </div>
                <button onclick="event.stopPropagation(); window.app.removeMember(${idx})" class="text-slate-400 hover:text-rose-600 p-1">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            container.appendChild(div);
        });
    },

    renderTopSlots(analysis) {
        const container = document.getElementById("top-slots-container");
        if (!container) return;
        container.innerHTML = "";

        const slots = [...(analysis.optimal_slots || []), ...(analysis.sub_optimal_slots || [])].slice(0, 5);

        if (slots.length === 0) {
            container.innerHTML = `<p class="text-xs text-slate-500 italic text-center py-4">Chưa có khung giờ rảnh khớp nhau giữa các thành viên.</p>`;
            return;
        }

        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
        const timeLabels = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00"];

        slots.forEach(slot => {
            const isOpt = slot.status === "optimal";
            const div = document.createElement("div");
            div.className = `p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs ${
                isOpt ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900"
            }`;

            div.innerHTML = `
                <div>
                    <span class="font-bold text-sm">${days[slot.day_index]} • ${timeLabels[slot.slot_index]}</span>
                    <span class="ml-2 font-semibold">(${slot.available_count}/${slot.total_members} người rảnh)</span>
                </div>
                <button onclick="window.app.selectSlotForVenues({day_index:${slot.day_index}, slot_index:${slot.slot_index}})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs">
                    Gợi Ý Địa Điểm <i class="fa-solid fa-arrow-right ml-1"></i>
                </button>
            `;
            container.appendChild(div);
        });
    },

    selectSlotForVenues(slot) {
        this.selectedSlot = slot;
        const timeTags = ["morning", "morning", "noon", "afternoon", "afternoon", "evening"];
        const slotTag = timeTags[slot.slot_index] || "morning";

        const banner = document.getElementById("selected-slot-banner");
        if (banner) {
            const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
            const timeLabels = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00"];
            banner.innerHTML = `
                <div class="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-sm font-semibold flex justify-between items-center">
                    <span><i class="fa-solid fa-clock text-indigo-600 mr-2"></i>Đang xem địa điểm cho: <strong>${days[slot.day_index]} (${timeLabels[slot.slot_index]})</strong></span>
                    <span class="text-xs bg-indigo-200 text-indigo-800 px-2.5 py-1 rounded-full uppercase font-bold">${slotTag}</span>
                </div>
            `;
        }

        this.switchTab("tab-venues");
        this.applyVenueFilters();
    },

    populateCityFilter() {
        const citySelect = document.getElementById("filter-city");
        if (!citySelect) return;
        const cities = Array.from(new Set(this.venues.map(v => v.city))).filter(Boolean);
        citySelect.innerHTML = `<option value="all">Tất cả Tỉnh / Thành phố (${cities.length})</option>`;
        cities.forEach(c => {
            citySelect.innerHTML += `<option value="${c}">${c}</option>`;
        });
        this.onCityFilterChange();
    },

    onCityFilterChange() {
        const cityVal = document.getElementById("filter-city")?.value || "all";
        const wardSelect = document.getElementById("filter-ward");
        if (!wardSelect) return;

        let filteredVenues = this.venues;
        if (cityVal !== "all") {
            filteredVenues = this.venues.filter(v => v.city.toLowerCase() === cityVal.toLowerCase());
        }

        const wards = Array.from(new Set(filteredVenues.map(v => v.ward))).filter(Boolean);
        wardSelect.innerHTML = `<option value="all">Tất cả Xã / Phường (${wards.length})</option>`;
        wards.forEach(w => {
            wardSelect.innerHTML += `<option value="${w}">${w}</option>`;
        });

        this.applyVenueFilters();
    },

    applyVenueFilters() {
        const container = document.getElementById("venue-list-container");
        if (!container) return;

        const cityVal = document.getElementById("filter-city")?.value || "all";
        const wardVal = document.getElementById("filter-ward")?.value || "all";
        const catVal = document.getElementById("filter-category")?.value || "all";

        let filtered = this.venues;
        if (cityVal !== "all") filtered = filtered.filter(v => v.city.toLowerCase() === cityVal.toLowerCase());
        if (wardVal !== "all") filtered = filtered.filter(v => v.ward.toLowerCase() === wardVal.toLowerCase());
        if (catVal !== "all") filtered = filtered.filter(v => v.category === catVal);

        container.innerHTML = "";
        if (filtered.length === 0) {
            container.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-xl border">Không có địa điểm nào phù hợp với bộ lọc.</div>`;
            return;
        }

        filtered.forEach(v => {
            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center";
            card.innerHTML = `
                <img src="${v.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500'}" class="w-full sm:w-32 h-24 object-cover rounded-lg">
                <div class="flex-1 space-y-1 text-xs">
                    <h4 class="font-bold text-slate-900 text-sm">${v.name}</h4>
                    <p class="text-slate-500"><i class="fa-solid fa-location-dot text-rose-500 mr-1"></i>${v.address}</p>
                    <div class="flex gap-2 text-indigo-600 font-semibold">
                        <span>⭐ ${v.rating}</span> • <span>Sức chứa: ${v.capacity} người</span> • <span>${v.price_range}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    window.app.init();
});
