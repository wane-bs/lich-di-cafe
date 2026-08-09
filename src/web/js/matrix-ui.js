/**
 * MatrixUI: Render Ma Trận Lịch Cá Nhân và Biểu Đồ Nhiệt Heatmap
 */

window.MatrixUI = {
    DAYS: ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"],
    SLOTS: [
        "08:00 - 10:00 (S1)",
        "10:00 - 12:00 (S2)",
        "12:00 - 14:00 (S3)",
        "14:00 - 16:00 (S4)",
        "16:00 - 18:00 (S5)",
        "18:00 - 20:00 (S6)"
    ],

    renderInputGrid(containerId, currentMatrix, onSlotToggle) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-xs text-center border-collapse">
                <thead>
                    <tr class="bg-slate-100 border-b border-slate-200">
                        <th class="p-2 border-r text-slate-600 font-bold w-28">Khung Giờ</th>
        `;

        this.DAYS.forEach(day => {
            html += `<th class="p-2 border-r font-bold text-slate-700">${day}</th>`;
        });
        html += `</tr></thead><tbody>`;

        this.SLOTS.forEach((slotLabel, sIdx) => {
            html += `<tr class="border-b border-slate-100 hover:bg-slate-50/50">`;
            html += `<td class="p-2 border-r font-semibold text-slate-600 bg-slate-50">${slotLabel}</td>`;

            for (let dIdx = 0; dIdx < 7; dIdx++) {
                const isSelected = currentMatrix[dIdx] && currentMatrix[dIdx][sIdx] === 1;
                const btnClass = isSelected ? 'slot-selected' : 'bg-slate-100 hover:bg-emerald-100 text-slate-600 border-slate-200';
                
                html += `
                <td class="p-1 border-r">
                    <button type="button" 
                        onclick="window.app.toggleSlot(${dIdx}, ${sIdx})"
                        class="slot-btn w-full py-2.5 rounded-lg border font-medium flex items-center justify-center gap-1 ${btnClass}">
                        <i class="fa-solid ${isSelected ? 'fa-check text-white' : 'fa-plus text-slate-400'}"></i>
                        <span>${isSelected ? 'Rảnh' : 'Bận'}</span>
                    </button>
                </td>`;
            }
            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    },

    renderHeatmap(containerId, aggregateMatrix, totalMembers, onSelectSlot) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (totalMembers === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-400">
                    <i class="fa-solid fa-users-slash text-4xl mb-3"></i>
                    <p>Chưa có dữ liệu thành viên. Vui lòng quay lại Bước 1 để thêm người dùng.</p>
                </div>
            `;
            return;
        }

        let html = `
        <div class="overflow-x-auto">
            <table class="w-full text-xs text-center border-collapse">
                <thead>
                    <tr class="bg-slate-800 text-white">
                        <th class="p-2 border-r border-slate-700 font-bold w-28">Khung Giờ</th>
        `;

        this.DAYS.forEach(day => {
            html += `<th class="p-2 border-r border-slate-700 font-bold">${day}</th>`;
        });
        html += `</tr></thead><tbody>`;

        this.SLOTS.forEach((slotLabel, sIdx) => {
            html += `<tr class="border-b border-slate-200">`;
            html += `<td class="p-2 border-r font-semibold text-slate-700 bg-slate-100">${slotLabel}</td>`;

            for (let dIdx = 0; dIdx < 7; dIdx++) {
                const count = aggregateMatrix[dIdx][sIdx];
                const ratio = totalMembers > 0 ? count / totalMembers : 0;
                
                // Color intensity logic
                let bgColor = "bg-slate-50 text-slate-400";
                let badgeClass = "bg-slate-200 text-slate-600";

                if (count > 0) {
                    if (ratio === 1) {
                        bgColor = "bg-emerald-500 text-white font-bold"; // 100% Optimal
                        badgeClass = "bg-emerald-700 text-white";
                    } else if (ratio >= 0.75) {
                        bgColor = "bg-emerald-400 text-white font-semibold";
                        badgeClass = "bg-emerald-600 text-white";
                    } else if (ratio >= 0.5) {
                        bgColor = "bg-amber-300 text-slate-900 font-medium";
                        badgeClass = "bg-amber-500 text-white";
                    } else {
                        bgColor = "bg-rose-100 text-rose-800";
                        badgeClass = "bg-rose-200 text-rose-800";
                    }
                }

                html += `
                <td class="p-1 border-r">
                    <div onclick="window.app.selectSlotForRecommendation(${dIdx}, ${sIdx})"
                         class="heatmap-cell p-2.5 rounded-lg border border-slate-200/50 cursor-pointer flex flex-col items-center justify-center gap-1 ${bgColor}">
                        <span class="text-sm font-bold">${count}/${totalMembers}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${badgeClass}">
                            ${ratio === 1 ? 'Optimal' : Math.round(ratio*100) + '%'}
                        </span>
                    </div>
                </td>`;
            }
            html += `</tr>`;
        });

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }
};
