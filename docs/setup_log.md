# Журнал настройки

Каждая строка — итог проверки со ссылкой или точным текстом ошибки. Настройка готова, только когда у каждого из 14 пунктов issue «Настройка» есть ссылка здесь.

## 23.11.2026 — первый час: доступы

| Проверка | Итог | Доказательство |
|---|---|---|
| Репозиторий подключён | да; был пустой, приватный | API GitHub: `"private": true`, веток не было |
| Первый коммит с README прямо в main (единственный мимо PR) | да | [2d772b7](https://github.com/fishert2812/strategy-2d/commit/2d772b7) |
| Создать ветку и положить файл в `.github/workflows/` | да | ветка `claude/project-thread-8epzcj`, коммит [33c6ec0](https://github.com/fishert2812/strategy-2d/commit/33c6ec0fb922239a27ebe7b03ccb0059323f0541) с `.github/workflows/probe.yml` принят без ошибки |
| Actions включены: пробный файл запустился | **нет** — прогон создан, но не стартовал | [прогон 45178875673](https://github.com/fishert2812/strategy-2d/actions/runs/45178875673): «The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings». Нужен шаг Романа (оплата или открытый репозиторий) |
| Godot у координатора (этот тред) | да, 4.7.2 поставлен вручную с выпусков Godot на GitHub | `godot --version` → `4.7.2.stable.official.ed1daf0bf` |
| Снимок под xvfb | да | `xvfb-run godot --rendering-driver opengl3`: снимок 1152×648 с надписью сохранён и просмотрен |
| Godot в CI | **не проверено**: Actions не стартуют (строка выше) | тот же прогон |
| Godot в новом рабочем треде | **не проверено**: сценария установки окружения нет. Предложено окружение «strategy-2d» со сценарием ниже — Роман отклонил запрос 23.11.2026 (был в дороге) | — |
| Пробный файл `probe.yml` | удалён в этом же PR | — |

### Сценарий установки окружения (готовый текст для Романа)

Где вставить: настройки проекта → облачное окружение → шестерёнка → Setup script. Проверен в этом треде: ставит Godot за ~6 секунд.

```bash
#!/bin/bash
# Godot для проекта strategy-2d: версия из .godot-version (иначе 4.7.2), без шаблонов экспорта.
set -e
V=4.7.2
if [ -f strategy-2d/.godot-version ]; then V=$(tr -d '[:space:]' < strategy-2d/.godot-version); fi
if ! godot --version 2>/dev/null | grep -q "^${V}\.stable"; then
  mkdir -p /opt/godot
  curl -sSfL -o /opt/godot/g.zip "https://github.com/godotengine/godot/releases/download/${V}-stable/Godot_v${V}-stable_linux.x86_64.zip"
  unzip -o -q /opt/godot/g.zip -d /opt/godot && rm /opt/godot/g.zip
  ln -sf "/opt/godot/Godot_v${V}-stable_linux.x86_64" /usr/local/bin/godot
fi
command -v xvfb-run >/dev/null || (apt-get update -qq && apt-get install -y -qq xvfb)
godot --headless --version
```

## 23.11.2026 — факты из справочника, раздел 9

| Факт | Итог сверки |
|---|---|
| Последний стабильный патч Godot | **4.7.2** — проверено: тег `4.7.2-stable` в репозитории Godot (git ls-remote), статья godotengine.org «Maintenance release: Godot 4.7.2». Тега `4.7.3` и тегов `4.8` нет |
| Шаблоны экспорта 4.7.2 | есть: `Godot_v4.7.2-stable_export_templates.tpz` на странице выпуска отвечает 302 (файл существует) |
| `.godot-version` | **ещё не записан**: по правилу — только после проверки установки в CI и в новом треде |
| Kenney: CC0 | проверено по тексту в поиске (kenney.nl/support, форум Godot); сайт из облака не открывали |
| GitHub Pro 4 доллара в месяц; Pages для приватного — только на платных | не проверено: поиск дал только оглавление docs.github.com |
| Остальные строки «не проверено» (Apple, Codemagic, веб-звук) | не сверялись в первый час; нужны к дню 2–3 |
