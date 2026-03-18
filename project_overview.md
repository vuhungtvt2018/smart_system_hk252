RetainAI – Customer Churn Prediction & Retention Intelligence System

# Ý nghĩa
AI system giúp doanh nghiệp phát hiện khách hàng sắp rời bỏ để thực hiện chiến lược giữ chân (retention)

# Link git:
https://github.com/andrewcole33/telco_churn_analysis

# Link data:
https://www.kaggle.com/datasets/blastchar/telco-customer-churn

# Tài liệu phân tích yêu cầu
## Phạm vi
- Hệ thống RetainAI được thiết kế để phục vụ các doanh nghiệp viễn thông với nhu cầu:
  - Dự đoán khả năng rời bỏ (churn) của khách hàng dựa trên dữ liệu hành vi và thông tin tài khoản.
  - Phân loại khách hàng theo mức độ rủi ro (HIGH / MEDIUM / LOW) để ưu tiên chiến lược giữ chân.
  - Theo dõi và phát hiện data drift, tự động kích hoạt quy trình retrain khi cần.
  - Cung cấp API on-demand và batch inference phục vụ các hệ thống nghiệp vụ downstream.

- Hệ thống sẽ bao gồm các thành phần:
  - Giao diện dành cho Quản trị viên (Admin):
    - Quản lý tài khoản người dùng, phân quyền truy cập hệ thống.
    - Cấu hình ngưỡng evaluation gate, risk tier và lịch chạy pipeline.
    - Xem audit log, theo dõi lịch sử deploy model và trạng thái hệ thống.
    - Quản lý model registry: promote, rollback, archive các phiên bản model.
  - Giao diện dành cho Người dùng nghiệp vụ (Business User):
    - Xem danh sách khách hàng có nguy cơ churn cao kèm chỉ số rủi ro.
    - Tra cứu dự đoán churn theo từng khách hàng cụ thể (on-demand).
    - Xem báo cáo tổng hợp: churn rate theo thời gian, phân phối risk tier, hiệu quả retention.
    - Nhận cảnh báo (alert) khi có nhóm khách hàng đột ngột tăng risk tier.
  - Giao diện dành cho Data Analyst / ML Engineer:
    - Streamlit Dashboard theo dõi PSI, model performance, data drift.
    - MLflow UI quản lý thí nghiệm, so sánh metrics giữa các model.
    - Airflow DAG quản lý batch pipeline và lịch retrain.
  - Backend & Infrastructure:
    - FastAPI endpoint phục vụ on-demand prediction và batch inference.
    - PostgreSQL lưu trữ lịch sử dự đoán và metadata.
    - Docker Compose đảm bảo môi trường reproducible.

## Phân quyền người dùng
### 👤 Admin (Quản trị viên hệ thống)

| Chức năng | Quyền |
|---|---|
| Quản lý tài khoản người dùng | ✅ Tạo / Sửa / Xóa |
| Phân quyền vai trò | ✅ Toàn quyền |
| Cấu hình evaluation gate & risk tier | ✅ Toàn quyền |
| Quản lý model registry (promote, rollback) | ✅ Toàn quyền |
| Xem audit log & lịch sử deploy | ✅ Toàn quyền |
| Cấu hình Airflow DAG & lịch retrain | ✅ Toàn quyền |
| Xem dashboard & báo cáo | ✅ Toàn quyền |
| Gọi API predict | ✅ Toàn quyền |

---

### 👤 Business User (Người dùng nghiệp vụ)

| Chức năng | Quyền |
|---|---|
| Xem danh sách khách hàng nguy cơ cao | ✅ Chỉ xem |
| Tra cứu dự đoán churn theo khách hàng | ✅ Chỉ xem |
| Xem báo cáo churn rate & risk tier | ✅ Chỉ xem |
| Nhận alert khi risk tier thay đổi | ✅ Chỉ xem |
| Gọi API predict (on-demand) | ❌ Không có |
| Cấu hình hệ thống | ❌ Không có |
| Quản lý model | ❌ Không có |
| Quản lý tài khoản | ❌ Không có |

---

### 👤 Data Analyst / ML Engineer

| Chức năng | Quyền |
|---|---|
| Xem & tương tác Streamlit Dashboard | ✅ Toàn quyền |
| Xem MLflow UI, so sánh experiments | ✅ Toàn quyền |
| Submit training job thủ công | ✅ Toàn quyền |
| Gọi API predict (on-demand & batch) | ✅ Toàn quyền |
| Xem logs drift detection & PSI | ✅ Toàn quyền |
| Promote / rollback model | ⚠️ Đề xuất, Admin duyệt |
| Quản lý tài khoản người dùng | ❌ Không có |
| Cấu hình Airflow DAG | ⚠️ Đọc, không sửa |

---

### Tóm tắt ma trận phân quyền

```
                        Admin    Business User    DA/ML Engineer
─────────────────────────────────────────────────────────────────
Quản lý User              ✅           ❌               ❌
Cấu hình hệ thống         ✅           ❌               ⚠️
Model Registry            ✅           ❌               ⚠️
Dashboard & Báo cáo       ✅           ✅               ✅
API Predict               ✅           ❌               ✅
MLflow / Airflow          ✅           ❌               ✅
Alert & Monitoring        ✅           ✅               ✅
Audit Log                 ✅           ❌               ❌
```

> **Ghi chú:** ⚠️ = Quyền hạn chế, cần phê duyệt từ Admin trước khi thực hiện.
## Lược đồ use-case
- Các actor: Admin, Business User, Data Analyst
- Các use case bao gồm kịch bản chính, thay thế và ngoại lệ
- Format: ID, Kịch bản, Mô tả, Actors, Tiền điều kiện, Hậu điều kiện, Luồng chính, Luồng thay thế, Luồng ngoại lệ
- Nhóm chính:
  - Quản lý người dùng và phân quyền (Admin)
  - Quản lý model (Admin, ML Engineer)
  - Dự đoán và báo cáo (Business User, ML Engineer)
  - Cấu hình hệ thống (Admin)
  - Giám sát và cảnh báo (Business User, ML Engineer)

## 📌 Tổng hợp danh sách Use Case

| Mã số | Tên use case | Actor chính |
|---|---|---|
| UC-ADMIN-MANAGE-USERS | Quản lý tài khoản người dùng | Admin |
| UC-ADMIN-CONFIGURE-THRESHOLDS | Cấu hình ngưỡng risk tier & evaluation gate | Admin |
| UC-ADMIN-CONFIGURE-SCHEDULE | Cấu hình lịch chạy pipeline | Admin |
| UC-MODEL-TRAINING | Huấn luyện mô hình | ML Engineer / Airflow |
| UC-MODEL-PROMOTION | Đề xuất và phê duyệt mô hình | ML Engineer, Admin |
| UC-PREDICT-ON-DEMAND | Dự đoán churn theo yêu cầu | ML Engineer, Admin |
| UC-BATCH-PREDICT | Dự đoán hàng loạt | ML Engineer, Admin |
| UC-VIEW-CHURN-LIST | Xem danh sách khách hàng nguy cơ cao | Business User, Admin, ML Engineer |
| UC-VIEW-REPORTS | Xem báo cáo tổng hợp | Business User, Admin, ML Engineer |
| UC-VIEW-DRIFT-DASHBOARD | Xem dashboard drift và performance | ML Engineer, Admin |
| UC-RECEIVE-ALERT | Nhận cảnh báo khi risk tier thay đổi | Business User, Admin, ML Engineer |
| UC-VIEW-AUDIT-LOG | Xem nhật ký hoạt động | Admin |

---

### Nhóm 1: Quản lý người dùng và phân quyền (Admin)
#### UC-ADMIN-MANAGE-USERS – Quản lý tài khoản người dùng
| ID | UC-ADMIN-MANAGE-USERS |
|---|---|
| **Kịch bản** | Quản lý tài khoản người dùng |
| Mô tả | Admin có thể tạo, sửa, xóa tài khoản người dùng và phân quyền vai trò (Admin / Business User / ML Engineer). |
| Actors | Admin |
| Tiền điều kiện | Admin đã đăng nhập thành công với quyền quản trị. |
| Hậu điều kiện | - Tài khoản người dùng được tạo/cập nhật/xóa trong hệ thống.<br>- Phân quyền được áp dụng ngay lập tức. |
| Luồng chính | 1. Admin truy cập vào trang quản lý người dùng.<br>2. Hệ thống hiển thị danh sách người dùng hiện có (tên, email, vai trò, trạng thái).<br>3. Admin chọn một trong các thao tác: **Thêm mới**, **Chỉnh sửa**, **Xóa**.<br>   - **Thêm mới:** Nhập email, họ tên, chọn vai trò.<br>   - **Chỉnh sửa:** Thay đổi thông tin hoặc vai trò, lưu lại.<br>   - **Xóa:** Xác nhận xóa tài khoản (chuyển trạng thái inactive hoặc xóa vĩnh viễn tùy cấu hình).<br>4. Hệ thống kiểm tra tính hợp lệ và thông báo thành công. |
| Luồng thay thế | 3a. Admin muốn **khóa/mở khóa** tài khoản: chọn nút khóa, cập nhật trạng thái.<br>3b. Admin **đặt lại mật khẩu**|
| Luồng ngoại lệ | 4a. Email đã tồn tại: hệ thống báo lỗi "Email đã được sử dụng".<br>|
---

### Nhóm 2: QUẢN LÝ MODEL (ADMIN & ML ENGINEER)
#### UC-MODEL-TRAINING – Huấn luyện mô hình

| ID | UC-MODEL-TRAINING |
|---|---|
| **Kịch bản** | Huấn luyện mô hình |
| Mô tả | ML Engineer chủ động kích hoạt quá trình huấn luyện mô hình mới với dữ liệu hiện tại, hoặc pipeline tự động chạy theo lịch. |
| Actors | ML Engineer (thủ công), Airflow (tự động) |
| Tiền điều kiện | Dữ liệu huấn luyện đã được chuẩn bị (từ data warehouse). |
| Hậu điều kiện | - Mô hình mới được huấn luyện và log vào MLflow.<br>- Các metrics (AUC, F1, precision, recall) được ghi lại.<br>- (Nếu tự động) Kiểm tra drift trước khi chạy. |
| Luồng chính | 1. ML Engineer truy cập giao diện "Training" (hoặc Airflow trigger DAG).<br>2. Hệ thống kiểm tra dữ liệu mới nhất và hiển thị thông tin: số lượng mẫu, ngày cũ nhất, các feature hiện có.<br>3. ML Engineer chọn cấu hình huấn luyện (loại model, hyperparameter, v.v.) hoặc dùng mặc định.<br>4. Nhấn **"Bắt đầu huấn luyện"**.<br>5. Hệ thống thực hiện huấn luyện, log kết quả lên MLflow.<br>6. Sau khi hoàn tất, hệ thống hiển thị thông báo và các metrics so sánh với model hiện tại. |
| Luồng thay thế | 2a. Nếu có phát hiện data drift vượt ngưỡng, hệ thống tự động kích hoạt huấn luyện và gửi thông báo cho ML Engineer. |
| Luồng ngoại lệ | 5a. Quá trình huấn luyện lỗi (dữ liệu không hợp lệ, thiếu bộ nhớ): hệ thống ghi log lỗi và thông báo cho ML Engineer. |

---

#### UC-MODEL-PROMOTION – Đề xuất và phê duyệt mô hình lên production

| ID | UC-MODEL-PROMOTION |
|---|---|
| **Kịch bản** | Đề xuất / phê duyệt mô hình |
| Mô tả | ML Engineer đề xuất một phiên bản mô hình từ MLflow để đưa lên production; Admin xem xét và phê duyệt (hoặc từ chối). |
| Actors | ML Engineer (đề xuất), Admin (phê duyệt) |
| Tiền điều kiện | Có ít nhất một mô hình đã huấn luyện và log trong MLflow. |
| Hậu điều kiện | - Model được chọn trở thành model chính thức phục vụ dự đoán.<br>- Ghi nhận audit log về hành động promote. |
| Luồng chính | 1. ML Engineer truy cập MLflow UI hoặc giao diện tích hợp, chọn một phiên bản model.<br>2. Nhấn nút **"Đề xuất lên production"** và nhập lý do / ghi chú.<br>3. Hệ thống gửi thông báo cho Admin (email, in-app).<br>4. Admin vào mục **Model Registry**, xem danh sách đề xuất, so sánh metrics với model hiện tại.<br>5. Admin chọn **"Phê duyệt"** hoặc **"Từ chối"**, kèm lý do nếu cần.<br>6. Nếu phê duyệt, hệ thống cập nhật model endpoint, chuyển model cũ thành archived, gửi thông báo cho ML Engineer. |
| Luồng thay thế | 4a. Admin có thể trực tiếp promote model mà không cần đề xuất (quyền đặc biệt). |
| Luồng ngoại lệ | 5a. Model mới không pass evaluation gate (nếu có): Admin không thể phê duyệt. |

---

### NHÓM 3: DỰ ĐOÁN VÀ BÁO CÁO (BUSINESS USER, ML ENGINEER, ADMIN)

#### UC-PREDICT-ON-DEMAND – Dự đoán churn theo yêu cầu

| ID | UC-PREDICT-ON-DEMAND |
|---|---|
| **Kịch bản** | Dự đoán churn tức thời |
| Mô tả | Người dùng (ML Engineer, Admin) gửi thông tin một khách hàng qua API hoặc giao diện để nhận kết quả dự đoán khả năng rời bỏ và mức độ rủi ro. |
| Actors | ML Engineer, Admin (Business User không có quyền) |
| Tiền điều kiện | Model production đã sẵn sàng. |
| Hậu điều kiện | - Kết quả dự đoán được trả về.<br>- Lịch sử dự đoán được lưu vào PostgreSQL. |
| Luồng chính | 1. Người dùng nhập ID khách hàng hoặc điền đầy đủ các thông tin (hành vi, tài khoản) vào form.<br>2. Hệ thống gọi model production, tính toán xác suất churn.<br>3. Dựa vào ngưỡng risk tier, hệ thống gán nhãn (HIGH / MEDIUM / LOW).<br>4. Hiển thị kết quả kèm các yếu tố ảnh hưởng chính (feature importance). |
| Luồng thay thế | 1a. Gọi API trực tiếp với JSON. |
| Luồng ngoại lệ | 2a. Model không khả dụng: trả về lỗi và thông báo cho người dùng. |

---

#### UC-BATCH-PREDICT – Dự đoán hàng loạt

| ID | UC-BATCH-PREDICT |
|---|---|
| **Kịch bản** | Dự đoán hàng loạt |
| Mô tả | Người dùng (ML Engineer, Admin) tải lên file CSV chứa danh sách khách hàng, hệ thống xử lý và trả về file kết quả. |
| Actors | ML Engineer, Admin |
| Tiền điều kiện | Model production sẵn sàng, file dữ liệu đúng định dạng. |
| Hậu điều kiện | File kết quả được tạo và lưu trữ, người dùng tải về. |
| Luồng chính | 1. Người dùng chọn file CSV (theo template) và nhấn "Tải lên".<br>2. Hệ thống kiểm tra cấu trúc file, xác thực dữ liệu.<br>3. Hệ thống thực hiện dự đoán cho từng dòng, ghi kết quả (probability, risk tier) vào file mới.<br>4. Sau khi hoàn tất, hiển thị đường dẫn tải file. |
| Luồng thay thế | 2a. File có lỗi định dạng: thông báo chi tiết và yêu cầu sửa lại. |
| Luồng ngoại lệ | 3a. Quá trình xử lý lâu: hệ thống gửi email thông báo khi hoàn thành và lưu kết quả trong lịch sử. |

---

#### UC-VIEW-CHURN-LIST – Xem danh sách khách hàng nguy cơ cao

| ID | UC-VIEW-CHURN-LIST |
|---|---|
| **Kịch bản** | Xem danh sách churn |
| Mô tả | Business User (hoặc các role khác) xem danh sách khách hàng có nguy cơ rời bỏ cao, kèm chỉ số rủi ro và các thông tin cơ bản. |
| Actors | Business User, Admin, ML Engineer |
| Tiền điều kiện | Người dùng đã đăng nhập, có quyền xem. |
| Hậu điều kiện | Danh sách được hiển thị, có thể lọc theo risk tier, ngày. |
| Luồng chính | 1. Người dùng vào mục "Khách hàng nguy cơ".<br>2. Hệ thống hiển thị bảng danh sách (tên, ID, risk tier, probability, ngày dự đoán gần nhất).<br>3. Người dùng có thể lọc theo risk tier (HIGH/MEDIUM/LOW), tìm kiếm theo tên/ID.<br>4. Nhấn vào một khách hàng để xem chi tiết (lịch sử dự đoán, thông tin cá nhân). |
| Luồng thay thế | Không |
| Luồng ngoại lệ | 2a. Không có dữ liệu: hiển thị thông báo. |

---

#### UC-VIEW-REPORTS – Xem báo cáo tổng hợp

| ID | UC-VIEW-REPORTS |
|---|---|
| **Kịch bản** | Xem báo cáo |
| Mô tả | Người dùng xem các báo cáo thống kê về tỷ lệ churn, phân phối risk tier, hiệu quả retention (nếu có). |
| Actors | Business User, Admin, ML Engineer |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Biểu đồ và số liệu được hiển thị. |
| Luồng chính | 1. Người dùng chọn mục "Báo cáo".<br>2. Hệ thống hiển thị các chỉ số tổng quan: churn rate tháng, số lượng khách hàng theo risk tier, xu hướng theo thời gian.<br>3. Người dùng có thể chọn khoảng thời gian tùy chỉnh. |
| Luồng thay thế | 3a. Xuất báo cáo (PDF/Excel). |
| Luồng ngoại lệ | 2a. Lỗi truy vấn dữ liệu: hiển thị thông báo. |

---

### NHÓM 4: CẤU HÌNH HỆ THỐNG (ADMIN)

#### UC-ADMIN-CONFIGURE-THRESHOLDS – Cấu hình ngưỡng risk tier và evaluation gate

| ID | UC-ADMIN-CONFIGURE-THRESHOLDS |
|---|---|
| **Kịch bản** | Cấu hình ngưỡng |
| Mô tả | Admin thiết lập các ngưỡng để phân loại risk tier (HIGH, MEDIUM, LOW) và các ngưỡng kiểm tra chất lượng mô hình (evaluation gate) như PSI, AUC tối thiểu. |
| Actors | Admin |
| Tiền điều kiện | Đã đăng nhập với quyền Admin. |
| Hậu điều kiện | Các ngưỡng mới được áp dụng cho các dự đoán và kiểm tra tiếp theo. |
| Luồng chính | 1. Admin vào mục "Cấu hình hệ thống" > "Ngưỡng rủi ro".<br>2. Nhập giá trị cho từng mức: HIGH (≥ x%), MEDIUM (x% - y%), LOW (< y%).<br>3. Nhập ngưỡng PSI cho phép trước khi retrain, ngưỡng AUC tối thiểu khi phê duyệt model.<br>4. Nhấn "Lưu". |
| Luồng thay thế | Không |
| Luồng ngoại lệ | 4a. Giá trị không hợp lệ (âm, không phải số): báo lỗi và yêu cầu nhập lại. |

---

#### UC-ADMIN-CONFIGURE-SCHEDULE – Cấu hình lịch chạy pipeline

| ID | UC-ADMIN-CONFIGURE-SCHEDULE |
|---|---|
| **Kịch bản** | Cấu hình lịch retrain |
| Mô tả | Admin cài đặt lịch trình tự động cho pipeline (training, drift detection, batch inference) trên Airflow. |
| Actors | Admin |
| Tiền điều kiện | Đã đăng nhập, Airflow đang hoạt động. |
| Hậu điều kiện | Lịch mới được cập nhật trong Airflow DAG. |
| Luồng chính | 1. Admin vào mục "Cấu hình pipeline".<br>2. Chọn tần suất (hàng ngày, tuần, tháng) và giờ chạy.<br>3. Chọn các bước: drift detection, training, batch prediction.<br>4. Lưu cấu hình. |
| Luồng thay thế | Không |
| Luồng ngoại lệ | 3a. Xung đột lịch: thông báo và yêu cầu chọn lại. |

---

### NHÓM 5: GIÁM SÁT VÀ CẢNH BÁO (BUSINESS USER, ML ENGINEER, ADMIN)

#### UC-VIEW-DRIFT-DASHBOARD – Xem dashboard drift và performance

| ID | UC-VIEW-DRIFT-DASHBOARD |
|---|---|
| **Kịch bản** | Giám sát drift |
| Mô tả | ML Engineer (và Admin) theo dõi các chỉ số về data drift (PSI), concept drift, hiệu suất mô hình theo thời gian qua Streamlit dashboard. |
| Actors | ML Engineer, Admin |
| Tiền điều kiện | Đã đăng nhập, có dữ liệu drift được tính toán. |
| Hậu điều kiện | Các biểu đồ được hiển thị. |
| Luồng chính | 1. Người dùng truy cập vào link Streamlit dashboard.<br>2. Hệ thống hiển thị các biểu đồ: PSI theo feature, accuracy theo thời gian, số lượng dự đoán.<br>3. Người dùng có thể chọn khoảng thời gian, feature để xem chi tiết. |
| Luồng thay thế | 3a. Nếu phát hiện drift vượt ngưỡng, dashboard hiển thị cảnh báo đỏ. |
| Luồng ngoại lệ | 2a. Không có dữ liệu: hiển thị thông báo. |

---

#### UC-RECEIVE-ALERT – Nhận cảnh báo khi risk tier thay đổi

| ID | UC-RECEIVE-ALERT |
|---|---|
| **Kịch bản** | Nhận cảnh báo |
| Mô tả | Khi hệ thống phát hiện một nhóm khách hàng đột ngột tăng risk tier hoặc có dấu hiệu bất thường, nó gửi thông báo (email, in-app) đến Business User và các role liên quan. |
| Actors | Business User, Admin, ML Engineer (nhận), Hệ thống (gửi) |
| Tiền điều kiện | Có sự thay đổi đáng kể trong phân phối risk tier so với kỳ trước (theo ngưỡng cấu hình). |
| Hậu điều kiện | Người dùng nhận được thông báo. |
| Luồng chính | 1. Hệ thống chạy job kiểm tra hàng ngày, phát hiện số lượng khách hàng HIGH risk tăng 20% so với hôm qua.<br>2. Hệ thống tạo cảnh báo và gửi email đến danh sách người dùng có quyền nhận.<br>3. Trong ứng dụng, hiển thị icon thông báo kèm nội dung. |
| Luồng thay thế | 1a. Cảnh báo về drift model (PSI > ngưỡng) gửi đến ML Engineer. |
| Luồng ngoại lệ | 2a. Lỗi gửi email: ghi log và thử lại sau. |

---

#### UC-VIEW-AUDIT-LOG – Xem nhật ký hoạt động (Admin)

| ID | UC-VIEW-AUDIT-LOG |
|---|---|
| **Kịch bản** | Xem audit log |
| Mô tả | Admin xem lịch sử thao tác của người dùng và các thay đổi hệ thống (cấu hình, promote model, v.v.). |
| Actors | Admin |
| Tiền điều kiện | Đã đăng nhập. |
| Hậu điều kiện | Danh sách log được hiển thị. |
| Luồng chính | 1. Admin vào mục "Audit Log".<br>2. Hệ thống hiển thị bảng log với các cột: thời gian, người dùng, hành động, chi tiết, IP.<br>3. Admin có thể lọc theo người dùng, hành động, khoảng thời gian. |
| Luồng thay thế | Không |
| Luồng ngoại lệ | Không |

---
## Yêu cầu chức năng của hệ thống
## Yêu cầu phi chức năng của hệ thống
## Kịch bản use case
## Lược đồ trạng thái của hệ thống



# Tổng quan data
- 7043 khách hàng, 21 cột: 19 features và 1 output(Churn)
- 4 nhóm:
    - Demographic: gender, seniorCitizen, partner, dependents
    - Services: PhoneService, MultipleLines, InternetService, OnlineSecurity, OnlineBackup, DeviceProtection, TechSupport, StreamingTV, StreamingMovies
    - Account: tenure, Contract, PaperlessBilling, PaymentMethod, MonthlyCharges, TotalCharges
    - Target: Churn (Yes / No)

# Các bước làm
## Bước 0 - Định nghĩa vấn đề
- Bài toán: Binary classification
- KPI kỹ thuật:
    - Recall > 0.8
    - F1 > 0.75
    - Latency < 200ms
- KPI Business:
    - giảm churn rate, tăng retention
- Deploy target: FastAPO -> docker
- Inference mode: batch (daily) + on-demand API

## Bước 1 - Xây dựng kiến trúc dự án
```
churn-prediction/
│
|── .venv/
|
├── data/
│   ├── raw/                    # WA_Fn-UseC_-Telco-Customer-Churn.csv
│   ├── processed/              # cleaned, feature-engineered
│   └── .dvc/                   # data versioning
│
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_feature_engineering.ipynb
│   └── 03_modeling.ipynb
│
|── constants/
│   ├── __init__.py             # Khai báo các hằng số chuỗi toàn cục. Hoạt động như trình khởi tạo gói; cung cấp các hằng số thông qua lệnh
│   └── enum.py                 # Định nghĩa một tập hợp các lớp Enum (lớp con của str để thân thiện với JSON) đại diện cho các tập giá trị cố định được sử dụng trong toàn bộ logic trong source
|
|── config/
|   ├── model_config.yaml       # config của model, feature selection, training
|   ├── pipeline.yaml           # config pipeline hệ thống
|
├── src_ml/
│   ├── data/
│   │   ├── ingest.py           # load raw data
│   │   ├── validate.py         # schema + quality check
│   │   ├── preprocess.py       # cleaning pipeline
|   |   └── utils.py
│   │
│   ├── features/
│   │   └── build_features.py   # feature engineering
│   │   └── feature_store.py
|   |   └── utils.py
│   │
│   ├── <AI services>/            # Các services AI
│   │   ├── __init__.py
│   │   ├── <AI service 1>/
|   │   │   ├── __init__.py         # class model
|   │   │   ├── train.py            # training + MLflow logging
|   │   │   ├── evaluate.py         # evaluation gate
|   │   │   ├── predict.py          # inference logic
|   |   |   └── utils.py
|   │   │    
│   │   └── <AI service 2>/
|   │   │   ├── __init__.py         # class model
|   │   │   ├── train.py            # training + MLflow logging
|   │   │   ├── evaluate.py         # evaluation gate
|   │   │   ├── predict.py          # inference logic
|   |   |   └── utils.py
│   │
│   ├── monitoring/
│   |   ├── drift_detector.py   # data drift detection
|   |   └── utils.py
|   |
|   └── ai_pipeline
|       ├── logger/
|       |  └── logger_factory.py
|       ├── utils.py
|       └── main.py
│
│── models/                     # Lưu model
|   ├── churn_model.*
│   └── metadata.json
|
├── api/
│   ├── main.py                 # FastAPI app
│   │
│   ├── controller/
│   │   ├── __init__.py
│   |   └── <các controller API>.py
│   │
│   ├── schemas/                # Pydantic request/response
│   │   └── __init__.py
│   │
│   ├── services/               # service API
│   │   ├── __init__.py
│   |   └── <các services API>.py
│   │
│   └── database/               
│       ├── __init__.py
│       ├── crud.py
│       ├── model.py            # model API
│       ├── session.py
│       ├── utils.py
│
├── airflow/
│   └── dags/
│       ├── retrain_pipeline.py
│       └── monitoring_dag.py
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.mlflow
│   └── docker-compose.yml
│
├── dashboard/
│   └── app.py                  # Streamlit simulation dashboard
│
├── tests/
│   ├── test_data.py            # data validation tests
│   ├── test_model.py           # model unit tests
│   └── test_api.py             # API integration tests
│
├── mlruns/                     # MLflow tracking (local)
├── requirements.txt
└── README.md
```

# Bước 1-2: Data + Cleaning
Những vấn đề cần xử lý trong dataset này:
1. TotalCharges có ~11 giá trị rỗng (space) → convert float, fillna
2. customerID → drop (không phải feature)
3. Churn: Yes/No → 1/0
4. SeniorCitizen đã là 0/1, các col khác là string Yes/No
5. Validate schema, xử lý outlier sensor values
6. DVC hoặc versioning đơn giản bằng timestamp

validate_schema:
  - TotalCharges: numeric
  - tenure: int >= 0
  - MonthlyCharges: float > 0
  - Churn: binary

# Bước 3: Feature Engineering
```
# Từ dataset này có thể tạo thêm:
tenure_group         = cut(tenure, bins=[0,12,24,48,60,72])
charges_per_month    = TotalCharges / (tenure + 1)
num_services         = sum([PhoneService, OnlineSecurity,
                            OnlineBackup, DeviceProtection,
                            TechSupport, StreamingTV, StreamingMovies])
is_month_to_month    = (Contract == 'Month-to-month')
auto_payment         = PaymentMethod.isin(['Bank transfer', 'Credit card'])

# Encoding:
# - Binary cols (Yes/No) → 0/1
# - Contract, PaymentMethod, InternetService → OneHotEncoder
# - tenure_group → OrdinalEncoder
```

# Bước 4-5: Model Training + Tracking
```
Models để so sánh:
  1. Logistic Regression   (baseline)
  2. Random Forest
  3. XGBoost               (likely best)
  4. PyTorch TabNet        (deep learning option)

MLflow log:
  - params: max_depth, n_estimators, learning_rate...
  - metrics: accuracy, precision, recall, f1, AUC-ROC
  - artifacts: model.pkl, confusion_matrix.png, feature_importance.png
  - tags: dataset_version, feature_version
```

# Bước 6: Evaluation Gate
- → Reject model nếu Recall < 0.85
- → Log confusion matrix, feature importance
```
def evaluation_gate(metrics: dict) -> bool:
    """Reject model nếu không đạt threshold"""
    return (
        metrics["recall"] >= 0.80 and
        metrics["f1"]     >= 0.75
    )
# Nếu fail → không promote lên registry, alert, không deploy
```

# Bước 7: Deployment
- → FastAPI endpoint: POST /predict
- → Docker compose: API + MLflow server
```
# POST /predict
# Input : customer features (JSON)
# Output: churn_probability, churn_label, risk_tier

# Risk tier:
# >= 0.7  → HIGH   (priority contact)
# 0.4-0.7 → MEDIUM
# < 0.4   → LOW


services:
  api:        # FastAPI model serving
  mlflow:     # Experiment tracking UI
  dashboard:  # Streamlit simulation
  postgres:   # Backend store cho MLflow
```

---

## Điểm làm dự án này nổi bật hơn notebook thông thường
```
✅ Có evaluation gate → không deploy model kém
✅ MLflow registry → model versioning đúng nghĩa
✅ Risk tier output → business-ready, không chỉ 0/1
✅ Drift detection → hệ thống tự biết khi nào cần retrain
✅ Simulation script → demo được "production flow"
✅ Docker → reproducible, shareable
```

# Bước 8: Monitoring + Simulation
- → Script giả lập sensor stream
- → Track accuracy over time, detect data drift
- → Airflow DAG: retrain khi drift detected
```
# Streamlit dashboard hiển thị:
# - Simulate "new customers arriving" daily
# - Model predictions + confidence
# - Churn distribution over time
# - PSI (Population Stability Index) để detect data drift
# - Trigger retrain nếu PSI > 0.2

# Airflow DAG:
# - Daily: batch predict new customers
# - Weekly: check drift → retrain nếu cần
```