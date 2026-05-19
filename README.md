# RetainAI - Hệ thống quản lý và dự báo rác thải sinh hoạt thông minh

RetainAI là một hệ thống quản lý rác thải dựa trên AI được thiết kế để tối ưu hóa quy trình thu gom và xử lý rác thải sinh hoạt tại địa phương. Hệ thống cung cấp các công cụ giám sát theo thời gian thực, phân tích chuyên sâu và lập kế hoạch chu trình rác thải hiệu quả.

## 🚀 Tính năng chính

- **Giám sát thời gian thực**: Theo dõi lượng rác thải phát sinh, tỷ lệ tái chế và thành phố hoạt động thông qua giao diện trực quan.
- **Phân tích chuyên sâu**: Khám phá các mô hình rác thải theo năm, quý và tháng, cung cấp thông tin chi tiết về xu hướng và biến động của rác thải.
- **Dự báo thông minh**: Sử dụng Mô hình ARIMA để dự báo lượng rác thải trong tương lai, hỗ trợ quy hoạch và phân bổ nguồn lực hiệu quả.
- **Quản lý dự án**: Theo dõi tiến độ dự án và quy trình làm việc thông qua các thẻ Kanban tương tác.
- **Quản lý dữ liệu**: Tích hợp đầy đủ MLOps pipeline với MLflow cho quản lý thực nghiệm, theo dõi mô hình và quản lý siêu dữ liệu.

## 🛠️ Công nghệ sử dụng

- **Backend**: FastAPI
- **Frontend**: React
- **Cơ sở dữ liệu**: PostgreSQL
- **MLOps**: MLflow, scikit-learn, statsmodels
- **Containerization**: Docker, docker-compose

## 📂 Cấu trúc dự án

```
smart_system_hk252/
├── api/                     # FastAPI backend service
│   ├── main.py              # FastAPI application
│   └── routers/             # API routers and endpoints
├── frontend/                # React frontend application
│   └── src/                 # Frontend source code
├── models/                  # Machine learning models
├── data/                    # Datasets and data processing
├── mlruns/                  # MLflow experiment data
├── airflow/                 # Airflow DAGs for data pipelines
├── docker/                  # Dockerfiles for services
└── docker-compose.yml       # Docker Compose configuration
```

## 📋 Cài đặt và khởi chạy

### Yêu cầu tiên quyết

- Docker
- Docker Compose

### Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd smart_system_hk252
```

2. Build và khởi chạy services:
```bash
docker compose up --build
```

### Dừng hệ thống

```bash
docker compose down
```

## 🔑 Biến môi trường

Cấu hình hệ thống thông qua các biến môi trường trong tệp `.env` (tạo từ `.env.example` nếu cần):

| Biến số | Mô tả |
|---------|-------|
| `POSTGRES_USER` | Tên người dùng PostgreSQL |
| `POSTGRES_PASSWORD` | Mật khẩu PostgreSQL |
| `POSTGRES_DB` | Tên cơ sở dữ liệu |
| `POSTGRES_PORT` | Cổng PostgreSQL (mặc định: 5432) |
| `API_PORT` | Cổng API backend (mặc định: 8000) |
| `FRONTEND_PORT` | Cổng frontend (mặc định: 3000) |
| `MLFLOW_PORT` | Cổng MLflow UI (mặc định: 5000) |
| `AIRFLOW_URL` | URL của Airflow API |
| `MLRUNS_PATH` | Đường dẫn đến thư mục MLflow |

## 📡 Giao diện truy cập

- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **MLflow UI**: http://localhost:5000
- **Airflow UI**: http://localhost:8080

## 🎓 Đồ án môn hệ thống thông minh

Đây là sản phẩm của đồ án môn học, được phát triển với mục tiêu ứng dụng AI và các công nghệ hiện đại để giải quyết các vấn đề thực tế trong quản lý tài nguyên và dịch vụ công.

---

**Lưu ý**: Hệ thống này là một phần của đồ án môn học và được cung cấp như một ví dụ minh họa về cách tích hợp các công nghệ AI để xây dựng các ứng dụng thông minh.

Youtube: https://youtu.be/bJ9mM-gv4jk
Contact: 
- dvhung.sdh241@hcmut.edu.vn
- hblong.sdh242@hcmut.edu.vn
