Hệ thống logic cho ứng dụng lên lịch và đề xuất địa điểm đi chơi nhóm được cấu trúc thành 4 mô-đun chính: **Cấu trúc Dữ liệu**, **Thuật toán Khớp lịch (Matching Algorithm)**, **Logic Gợi ý Địa điểm (Recommendation Engine)**, và **Quy trình Xử lý (Workflow)**.

## **1\. Mô hình Cấu trúc Dữ liệu (Data Model)**

### **1.1. Khung thời gian (Time Slots)**

* **Khung giờ cố định:** 8:00 – 20:00 (12 tiếng/ngày), chia làm 6 slot 2 tiếng:  
  * $S\_1$: 08:00 – 10:00  
  * $S\_2$: 10:00 – 12:00  
  * $S\_3$: 12:00 – 14:00  
  * $S\_4$: 14:00 – 16:00  
  * $S\_5$: 16:00 – 18:00  
  * $S\_6$: 18:00 – 20:00  
* **Ma trận khả dụng (Availability Matrix):** Mỗi ngày trong tuần (T2–CN, $D=7$) có 6 slot ($S=6$). Tổng cộng 42 slot/tuần.  
* **Biểu diễn dữ liệu cá nhân:** Ma trận nhị phân $A\_u$ kích thước $7 \\times 6$, trong đó $A\_u(d, s) \\in \\{0, 1\\}$ (0: Bận, 1: Rảnh).

### **1.2. Đơn vị Nhóm (Group Entity)**

* Danh sách thành viên: $U \= \\{u\_1, u\_2, ..., u\_n\\}$.  
* N ngưỡng tham gia tối thiểu (Threshold): $k \\le n$ (ví dụ: tối thiểu 80% thành viên rảnh).

## **2\. Thuật toán Khớp lịch (Time Matching Logic)**

### **2.1. Ma trận Tổng hợp (Group Aggregate Matrix)**

Tính tổng số người rảnh tại từng slot $S(d, s)$:

$$M(d, s) \= \\sum\_{i=1}^{n} A\_{u\_i}(d, s)$$

### **2.2. Xếp hạng khung giờ (Ranking Logic)**

Mỗi slot $(d, s)$ được đánh giá dựa trên:

> 1. **Số lượng khả dụng:** $M(d, s)$ (Ưu tiên $M(d, s) \= n$, sau đó giảm dần xuống $k$).  
> 2. **Độ liền mạch (Continuous Slot Score):** Nếu nhóm cần họp/đi chơi nhiều hơn 2 tiếng, ưu tiên các slot $S(d, s)$ và $S(d, s+1)$ đều có điểm $M$ cao.

### **2.3. Phân loại kết quả (Matching Output)**

* **Optimal (Tối ưu):** 100% thành viên rảnh ($M \= n$).  
* **Sub-optimal (Chấp nhận được):** $\\ge k$ thành viên rảnh (kèm danh sách ai vắng mặt).  
* **Conflict (Xung đột):** Không có slot nào đạt ngưỡng $k$. Hệ thống gợi ý slot có điểm $M$ cao nhất kèm tính năng "Vote đổi lịch".

## **3\. Logic Gợi ý Địa điểm (Recommendation Engine)**

Gợi ý địa điểm phụ thuộc trực tiếp vào **Khung giờ đã chốt** và **Sở thích nhóm**.

### **3.1. Phân loại địa điểm theo Khung giờ (Time-based Tagging)**

Mỗi địa điểm $V$ được gắn nhãn khung giờ phù hợp:

* **08:00 – 12:00 (Sáng):** Quán cà phê điểm điểm ăn sáng, công viên, khu dã ngoại, triển lãm.  
* **12:00 – 14:00 (Trưa):** Nhà hàng ăn trưa, quán ăn nhóm, cà phê nghỉ trưa.  
* **14:00 – 18:00 (Chiều):** Quán cà phê, boardgame café, khu vui chơi giải trí (Bowling, Ice Skating, workshop).  
* **18:00 – 20:00 (Tối):** Quán ăn tối, Pub/Acoustic café, khu phố đi bộ, rạp chiếu phim.

### **3.2. Thuật toán Lọc & Gợi ý (Filtering & Scoring Logic)**

> 1. **Lọc cứng (Hard Filter):**  
   * Địa điểm mở cửa trong slot $(d, s)$ được chọn.  
   * Bán kính khoảng cách $R$ tối ưu từ tọa độ trung bình (Centroid) của các thành viên (nếu có thu thập vị trí).  
> 2. **Lọc mềm & Phân điểm (Soft Filter & Scoring):**  
   * **Preference Matching:** Khớp tag sở thích của nhóm (ví dụ: Cà phê, Ăn uống, Vui chơi vận động).  
   * **Capacity Match:** Quy mô chứa vừa nhóm $n$ người.  
   * **Budget Range:** Mức chi phí trung bình phù hợp.

## **4\. Quy trình Trải nghiệm & Trạng thái Hệ thống (Workflow)**

\[Khởi tạo Nhóm\] ──\> \[Thành viên Điền Lịch\] ──\> \[Hệ thống Tổng hợp Ma trận\]  
                                                           │  
\[Chốt Địa điểm\] \<── \[Đề xuất Địa điểm\] \<── \[Chốt Khung giờ Optimal/Sub-optimal\]

> 1. **Bước 1: Tạo phòng & Nhập liệu**  
   * Trưởng nhóm tạo link poll đi chơi.  
   * Các thành viên truy cập, nhập tên và tích chọn các slot 2h khả dụng từ T2–CN.  
> 2. **Bước 2: Xử lý & Hiển thị Heatmap**  
   * Hệ thống hiển thị biểu đồ nhiệt (Heatmap) thể hiện mức độ rảnh của nhóm theo thời gian thực.  
> 3. **Bước 3: Chốt Thời gian**  
   * Trưởng nhóm hoặc Hệ thống (Tự động) chốt khung giờ có điểm $M(d, s)$ cao nhất.  
> 4. **Bước 4: Đề xuất & Vote Địa điểm**  
   * Dựa trên slot đã chốt, hệ thống trả về Danh sách Top 3–5 Địa điểm phù hợp nhất.  
   * Nhóm tiến hành bình chọn (Vote) địa điểm cuối cùng.

## **5\. Các Mở rộng Logic Cần Cân nhắc (Edge Cases)**

* **Thiếu dữ liệu khai báo:** Đặt thời hạn (Deadline) cho việc điền lịch. Sau deadline, hệ thống tự động tính toán dựa trên số người đã điền.  
* **Ghép slot liên tiếp:** Khi người dùng chọn 2 slot liền nhau (ví dụ 14h–16h và 16h–18h), hệ thống ghi nhận thành một khoảng thời gian liền mạch 4 tiếng để ưu tiên đề xuất các hoạt động kéo dài (xem phim, đi dã ngoại).