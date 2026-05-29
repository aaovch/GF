# GF Analytics

Веб-приложение на **SvelteKit** для аналитики потока клиентов по CSV-таблице посещаемости. Деплой — **GitHub Pages**.

## Возможности

- График потока: новые, ушедшие, вернувшиеся, активные
- Графики активных и входящего потока
- Воронка удержания и финальный отток
- Heatmap ТОП-N активных клиентов
- Текстовый отчёт (как для Telegram) с копированием в буфер

## Локальная разработка

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Сборка

```bash
npm run build
npm run preview
```

Для GitHub Pages (репозиторий `GF`) base path задаётся автоматически в CI: `/GF`.

Локально с тем же base path:

```bash
# PowerShell
$env:BASE_PATH="/GF"; npm run build
```

## GitHub Pages

1. Создайте репозиторий на GitHub и запушьте проект
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. При пуше в `main` workflow `.github/workflows/deploy.yml` соберёт и опубликует сайт

Сайт будет доступен по адресу: `https://<username>.github.io/GF/`

## Данные

По умолчанию загружается `static/data/table.csv`.

Формат CSV:
- Колонка **ФИО** (обязательно)
- Месячные колонки **MM.YY** (например `08.24`, `01.25`)
- Значение присутствия: `+`, `1`, любое положительное число
- Значение `2` — отложенный платёж по абонементу
- Колонка **Активность** — для ранжирования ТОП клиентов

Можно загрузить свой CSV через кнопку на странице.

## Структура

```
src/lib/analytics/pipeline.ts  — логика аналитики (TypeScript)
src/lib/components/            — графики и heatmap
static/data/table.csv          — данные по умолчанию
```
