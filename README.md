# Динамика Огня

Веб-приложение для подбора комплектации системы пожаротушения техники, формирования КП и выгрузки в Excel.

## Структура

```
backend/   — FastAPI + SQLAlchemy + Alembic (Python)
frontend/  — React + Vite + TypeScript
```

## Быстрый старт

### 1. Переменные окружения

```bash
cp .env.example .env
```

Заполнить `JWT_SECRET` случайным значением. `DATABASE_URL` по умолчанию подходит для локального docker-compose.

На сервере задать `APP_BASE_URL` реальным доменом/IP (например `https://fire.example.com`) — используется для ссылки подтверждения email. Если заданы `SMTP_HOST` и `SMTP_USER` — письмо отправляется через SMTP, иначе ссылка выводится в лог сервера.

### 2. База данных (PostgreSQL)

```bash
docker compose up -d
```

Поднимает PostgreSQL 16 на порту 5432.

### 3. Backend

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API доступен на `http://localhost:8000`. Документация: `http://localhost:8000/docs`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откроется на `http://localhost:5173`. Запросы к `/api/*` проксируются на backend (порт 8000).

### 5. Тесты

```bash
cd backend
pytest
```

Тесты используют SQLite in-memory, PostgreSQL не требуется.

## Роли

| Роль | Описание |
|------|----------|
| **admin** | Полный доступ: управление пользователями, справочниками (техника, зоны, SKU, правила), редактирование любых КП |
| **manager** | Создание и редактирование своих КП, расчёт, смена статуса (согласование), экспорт в Excel |
| **warehouse** | Просмотр КП со статусом «На проверке склада», проставление наличия по позициям, подтверждение или возврат на доработку |

## Статусы КП

`draft` → `calculated` → `approved` → `warehouse_check` → `confirmed`

На любом этапе склад может вернуть КП в `rework`, после чего менеджер редактирует и пересчитывает.
