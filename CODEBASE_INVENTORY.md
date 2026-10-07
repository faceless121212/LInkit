# CODEBASE_INVENTORY.md

Інвентаризація кодової бази Linkit — персонального застосунку для планування та відстеження постів у X (Twitter). Станом на 2026-10-07.

## Стек і технології

| Шар | Технологія | Версія | Примітка |
| --- | --- | --- | --- |
| Фреймворк | Next.js (App Router, Server Actions) | 15.5 | React 19.1, TypeScript 5 |
| Стилі | Tailwind CSS | 4 | `@tailwindcss/postcss`, токени в `src/app/globals.css` |
| UI-кіт | shadcn/ui (стиль `base-nova`) | 4.21 | Поверх `@base-ui/react`, іконки `lucide-react` |
| БД / Auth / Storage | Supabase (Postgres 17) | `@supabase/ssr` 0.12, `supabase-js` 2.117 | RLS на всіх таблицях |
| Email | Resend | 6.x | Лише у cron-роуті |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` | 6 / 10 | Дошка, календар |
| Дати | `date-fns`, `date-fns-tz` | 4 / 3 | UTC у БД, браузерна зона в UI, `Europe/Warsaw` для email і статистики |
| Підрахунок символів | `twitter-text` | 3.1 | URL = 23, емодзі/CJK = 2 |
| Тести | Vitest 5, Playwright 1.63 | | `tsx` для скриптів |
| Хостинг | Vercel (Hobby) | | Cron у `vercel.json` |
| Пакетний менеджер | pnpm | 10 | |

## Модулі та відповідальність

| Шлях | Відповідальність |
| --- | --- |
| `src/app/(app)/` | Захищені сторінки: дашборд `/`, `/board`, `/calendar`, `/posts`, `/posts/new`, `/posts/[id]`, `/pillars`. Layout перевіряє сесію і рендерить `AppShell`. |
| `src/app/login/` | Форма magic-link (`actions.ts` → `signInWithOtp`, `shouldCreateUser: false`). |
| `src/app/auth/` | `callback` (обмін коду на сесію → `/board`), `signout` (POST). |
| `src/app/api/cron/reminders/` | Нагадування за 60 хв + щоденний дайджест. Захищено `CRON_SECRET`. |
| `src/app/api/posts/export/` | CSV поточного фільтра списку. |
| `src/middleware.ts`, `src/lib/supabase/middleware.ts` | Оновлення сесії, редірект неавторизованих на `/login`, авторизованих з `/login` на `/board`. |
| `src/lib/supabase/` | `client` (браузер), `server` (RSC/Actions, `requireUser`), `admin` (service role; лише cron і скрипти). |
| `src/lib/posts/actions.ts` | Server Actions: `savePost`, `updatePostStatus`, `reschedulePost`, `deletePost` (чистить Storage), `savePostMetrics`. Валідація переходів статусів. |
| `src/lib/posts/queries.ts`, `list.ts` | Вибірки з реляціями, пошук через `search_posts()`, сортування, CSV. |
| `src/lib/posts/validation.ts`, `display.ts` | Перевірки «порожній / задовгий», заголовок картки, overdue, інстант для календаря. |
| `src/lib/pillars/` | CRUD категорій (pillars). |
| `src/lib/x-text.ts` | Обгортка `twitter-text.parseTweet`. |
| `src/lib/tz.ts`, `calendar.ts`, `streak.ts`, `dashboard.ts` | Чисті функції часу, сітки календаря, бакетування за днем, стрік, агрегати дашборду. |
| `src/lib/reminders/` | `select` (кого нагадувати / дайджест / час дайджесту), `email` (HTML+text шаблони), `send` (Resend). |
| `src/lib/config/reminders.ts` | Константи: `APP_TIMEZONE`, `DIGEST_HOUR`, `REMINDER_WINDOW_MINUTES`, `DEFAULT_POST_HOUR`. |
| `src/lib/storage.ts` | Валідація файлів, шляхи `{user}/{post}/{item}/{file}`, upload/remove/signed URLs, зачистка папки поста. |
| `src/lib/database.types.ts`, `types.ts` | Типи БД (написані вручну під міграцію) і доменні константи. |
| `src/components/posts/` | `post-editor` (стан, автозбереження, діалоги), `item-editor`, `char-counter`, `media-uploader`, `preview-panel`, `pillar-select`, `metrics-form`, `dialogs` (спільні з дошкою), `list-filters`, `posts-table`. |
| `src/components/board/` | `board-view` (DndContext, оптимістичні оновлення), `board-card`. |
| `src/components/calendar/` | `calendar-view` (місяць/тиждень, drag між днями, фільтри в URL). |
| `src/components/dashboard/`, `pillars/` | `overdue-list`, `pillars-manager`. |
| `src/components/ui/` | Згенеровані shadcn-компоненти (не редагувати вручну без потреби). |
| `supabase/migrations/` | `20261007000000_init.sql` — схема, індекси, тригери, RLS, `search_posts`, бакет `post-media`. |
| `e2e/`, `scripts/` | Playwright core-loop, `rls-check.ts`. |

## Точки входу

- **Браузер:** `/login` → magic link → `/auth/callback` → `/board`.
- **Сторінки:** `/`, `/board`, `/calendar`, `/posts`, `/posts/new`, `/posts/[id]`, `/pillars`.
- **HTTP-роути:** `GET /api/cron/reminders` (Vercel Cron, `Authorization: Bearer CRON_SECRET`), `GET /api/posts/export`, `POST /auth/signout`.
- **Server Actions:** усі в `src/lib/posts/actions.ts`, `src/lib/pillars/actions.ts`, `src/app/login/actions.ts`.
- **Middleware:** `src/middleware.ts` для всього, крім `/api/cron/*`, статики та `_next`.
- **Скрипти:** `pnpm rls-check`, `pnpm test:e2e`.

## Корисні команди

```bash
pnpm install              # залежності
supabase start            # локальний стек + застосування міграцій
pnpm dev                  # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e             # потрібен .env.local із service role key
pnpm rls-check            # перевірка RLS другим користувачем
pnpm db:types             # регенерація database.types.ts з локальної БД
supabase db reset         # перестворити локальну БД
supabase link --project-ref <ref> && supabase db push   # міграції у хмару
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=x pnpm build  # збірка без БД
```

## Тести й конфіги

| Файл | Призначення |
| --- | --- |
| `vitest.config.mts` | Unit-тести `src/**/*.test.ts`, alias `@` |
| `src/lib/x-text.test.ts` | Підрахунок: ASCII, URL=23, емодзі=2, CJK=2, межа 280 |
| `src/lib/calendar.test.ts` | 23:30 Warsaw на правильний день, літній час, `moveToDay`, сітки |
| `src/lib/streak.test.ts` | Стрік сьогодні/вчора, розриви, зона Warsaw vs UTC |
| `src/lib/reminders/select.test.ts` | Вікно 60 хв (межі), ідемпотентність `reminded_at`, дайджест, година дайджесту CET/CEST |
| `playwright.config.ts`, `e2e/core-loop.spec.ts` | Логін → тред із 3 постів → розклад на завтра → drag у Published → URL → календар |
| `scripts/rls-check.ts` | Другий користувач не читає/не змінює чужі дані |
| `supabase/config.toml` | Локальний стек; `site_url` і redirect на `localhost:3000` |
| `vercel.json` | Два щоденні cron-запуски (06:00 і 07:00 UTC) |
| `.env.example` | Перелік змінних середовища |
| `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `components.json` | Інструментарій |

## Карта залежностей

```
pages (RSC) ──► lib/posts/queries, lib/posts/list, lib/pillars/queries ──► lib/supabase/server
      │
      └──► client components ──► Server Actions (lib/posts/actions, lib/pillars/actions)
                 │                      │
                 │                      ├──► lib/posts/validation ──► lib/x-text ──► twitter-text
                 │                      └──► lib/storage (remove / sweep)
                 ├──► lib/supabase/client ──► Storage (upload, signed URLs)
                 ├──► lib/tz, lib/calendar, lib/posts/display
                 └──► components/ui (shadcn / base-ui)

api/cron/reminders ──► lib/supabase/admin ──► lib/reminders/{select,email,send} ──► Resend
middleware ──► lib/supabase/middleware ──► @supabase/ssr
lib/dashboard ──► lib/streak ──► lib/tz ──► date-fns-tz ──► config/reminders (APP_TIMEZONE)
```

Правило: `lib/supabase/admin` імпортується лише з `api/cron/*`, `e2e/`, `scripts/`. Жоден клієнтський компонент не торкається service role.

## Runtime-потоки

1. **Логін.** `/login` → `sendMagicLink` → лист → `/auth/callback?code=` → `exchangeCodeForSession` → cookie → `/board`.
2. **Створення поста.** `/posts/new` генерує `crypto.randomUUID()` у браузері; перша зміна → через 1.5 с `savePost` (upsert posts + post_items) → `history.replaceState('/posts/<id>')`. Порожній новий пост не зберігається.
3. **Автозбереження.** Будь-яка зміна стану → debounce 1.5 с → `savePost`. Паралельні виклики серіалізуються (`savingRef`/`queuedRef`). Валідація довжини блокує лише перехід у `scheduled`/`published`.
4. **Медіа.** Браузер вантажить напряму в бакет `post-media` (RLS за префіксом `user_id/`), шлях зберігається в `media_paths`; видалення — одразу зі Storage + зачистка «сиріт» під час `savePost`; `deletePost` обходить папку поста.
5. **Зміна статусу з дошки.** `dragEnd` → діалог за потреби (дата / URL / підтвердження) → оптимістичне оновлення → `updatePostStatus` → `revalidatePath('/', 'layout')`; при помилці відкат.
6. **Календар.** Бакетування за `scheduled_at` (або `published_at` для опублікованих) у зоні браузера після монтування; drag на інший день → `moveToDay` (час збережено) → `reschedulePost` (скидає `reminded_at`).
7. **Cron.** Перевірка секрету → усі `scheduled` пости → `selectDueReminders` → «захоплення» рядка (`reminded_at` де `null`) → лист → при помилці звільнення. Далі `shouldSendDigest` → insert у `digest_log` (PK = день) → лист дайджесту.
8. **CSV.** `/api/posts/export?<ті ж параметри>` → `queryPosts` → `postsToCsv` (екранування, захист від формул).

## Зони підвищеного ризику

- **`SUPABASE_SERVICE_ROLE_KEY`** — обходить RLS. Використовується лише у cron і скриптах; витік у клієнтський бандл = повний доступ до даних.
- **`savePost` не атомарний.** Upsert поста, видалення й upsert айтемів — окремі запити PostgREST. Збій посередині може лишити неузгоджений стан (айтеми без оновленого поста). Дані невеликі, але варто мати на увазі.
- **Автозбереження й конкурентні вкладки.** Остання вкладка перемагає; немає версіонування/конфліктів.
- **Storage-сироти.** Якщо завантаження відбулося, а збереження — ні (закрита вкладка), файл лишається до `deletePost`.
- **Cron на Vercel Hobby.** Лише щоденні запуски з неточним часом; 60-хвилинні нагадування фактично не працюють без Pro. Дайджест залежить від двох запусків 06:00/07:00 UTC і `digest_log`.
- **Resend без верифікованого домену** доставляє лише на email власника акаунта Resend.
- **Hydration у календарі.** Сітка рендериться лише після визначення зони браузера (`useEffect`), інакше розбіжність SSR/CSR.
- **Типи БД написані вручну** (`database.types.ts`). Після зміни міграцій потрібно синхронізувати або згенерувати `pnpm db:types`.
- **Пошук через `ilike`** без індексу — нормально для одного користувача, не масштабується.
- **`window.history.replaceState`** після першого збереження спирається на інтеграцію App Router; при зміні версії Next перевірити.
- **CHECK-обмеження статусів** дублюються у коді; при додаванні статусу змінювати і міграцію, і `types.ts`.

## Відкриті питання

- **База для розробки й тестів.** Локального Docker немає, а два активні Supabase-проєкти вичерпують безкоштовний ліміт. Потрібно: встановити OrbStack/Docker, або призупинити один проєкт і створити новий, або виділити існуючий. До того e2e та `rls-check` не запускалися проти живої БД.
- **Напрямок «як у популярних сайтів ніші».** Що саме повторювати: набір фіч, UX редактора, лендінг? Потребує уточнення.
- **Платформи.** Коли додавати колонку `platform` (LinkedIn, Threads) і як це вплине на лічильник символів.
- **Метрики.** Чи потрібна історія метрик (зараз один запис на пост, перезаписується).
- **Нагадування.** Переходити на Vercel Pro (hourly) чи на зовнішній планувальник (GitHub Actions / cron-job.org).
- **Домен для Resend** і фінальний `NEXT_PUBLIC_SITE_URL`.
- **Mobile UX** дошки (drag на тачі працює через dnd-kit, але колонки вузькі).
