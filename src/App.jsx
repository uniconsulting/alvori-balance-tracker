import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BadgeAlert,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Copy,
  History,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { buildRowsForDate, calcTotals, compareStatus, getDayStatus } from "./lib/balance";
import { formatCurrency, formatInteger, parseMoney } from "./lib/money";
import { createDefaultState, loadState, saveState } from "./lib/storage";
import { formatHumanDate, sortDatesDesc } from "./lib/date";
import { DEFAULT_STYLE_SETTINGS, getFactTone, sanitizeStyleSettings } from "./lib/styleSettings";

function cn() {
  return Array.prototype.slice.call(arguments).filter(Boolean).join(" ");
}

function uid() {
  return "service-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function Button({ children, variant = "secondary", className, ...props }) {
  return (
    <button className={cn("button", `button--${variant}`, className)} {...props}>
      {children}
    </button>
  );
}

function TextInput({ className, ...props }) {
  return <input className={cn("input", className)} {...props} />;
}

function NumberInput({ className, ...props }) {
  return <input className={cn("input", className)} inputMode="numeric" type="number" min="0" {...props} />;
}

function MoneyInput({ value, onChange, className, placeholder = "0 ₽" }) {
  const [display, setDisplay] = useState(value ? formatCurrency(value) : "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplay(value ? formatCurrency(value) : "");
    }
  }, [isFocused, value]);

  return (
    <input
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      className={cn("input input--money", className)}
      onFocus={() => {
        setIsFocused(true);
        setDisplay(value ? formatInteger(value) : "");
      }}
      onBlur={() => {
        setIsFocused(false);
        setDisplay(value ? formatCurrency(value) : "");
      }}
      onChange={(event) => {
        const next = parseMoney(event.target.value);
        setDisplay(next ? formatInteger(next) : "");
        onChange(next);
      }}
    />
  );
}

function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseISODate(value));
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(gridStart);
    next.setDate(gridStart.getDate() + index);
    return next;
  });
}

function DatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [monthDate, setMonthDate] = useState(() => parseISODate(value));
  const rootRef = useRef(null);

  useEffect(() => {
    setMonthDate(parseISODate(value));
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const selected = parseISODate(value);
  const days = getCalendarDays(monthDate);
  const monthLabel = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(monthDate);

  const shiftMonth = (offset) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div className="date-control" ref={rootRef}>
      <button className="date-trigger" type="button" onClick={() => setIsOpen((next) => !next)}>
        <CalendarDays size={17} />
        <span>{formatShortDate(value)}</span>
      </button>

      {isOpen ? (
        <div className="calendar-popover">
          <div className="calendar-head">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
              <ChevronLeft size={17} />
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((day) => {
              const iso = toISODate(day);
              const isCurrentMonth = day.getMonth() === monthDate.getMonth();
              const isSelected = iso === toISODate(selected);

              return (
                <button
                  key={iso}
                  type="button"
                  className={cn(
                    "calendar-day",
                    !isCurrentMonth && "calendar-day--muted",
                    isSelected && "calendar-day--selected"
                  )}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Notice({ notice, onClose }) {
  if (!notice) {
    return null;
  }

  return (
    <div className="notice" role="status">
      <Save size={16} />
      <span>{notice.message}</span>
      {notice.action ? (
        <button className="notice__action" type="button" onClick={notice.action.onClick}>
          {notice.action.label}
        </button>
      ) : null}
      <button className="notice__close" type="button" onClick={onClose} aria-label="Закрыть уведомление">
        <X size={15} />
      </button>
    </div>
  );
}

function ActionStatus({ notice }) {
  if (!notice) {
    return null;
  }

  return (
    <div className="action-status" role="status">
      <CheckCircle2 size={17} />
      <span>{notice.message}</span>
      {notice.action ? (
        <button className="action-status__button" type="button" onClick={notice.action.onClick}>
          {notice.action.label}
        </button>
      ) : null}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-switch" aria-hidden="true" />
    </label>
  );
}

function SegmentedControl({ value, options, onChange }) {
  return (
    <div className="segmented-control">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(value === option.value && "segmented-control__item--active")}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function getFactInputClass(row, styleSettings) {
  const tone = getFactTone(row.norma, row.fact, styleSettings);

  return cn(
    "fact-input",
    `fact-input--${tone}`,
    `fact-input--${styleSettings.factFillMode}`
  );
}

function AppHeader({ date, onDateChange, onOpenHistory, onOpenSettings, onOpenStyleSettings, currentView }) {
  return (
    <header className="app-header">
      <div className="brand-lockup">
        <img src="brand/header/light/logo.svg" alt="Алвори" />
      </div>

      <div className="header-controls">
        <DatePicker value={date} onChange={onDateChange} />
        <Button variant="secondary" className={cn(currentView === "history" && "button--active")} onClick={onOpenHistory}>
          <History size={17} />
          История
        </Button>
        <Button variant="primary" onClick={onOpenSettings}>
          <Settings size={17} />
          Настройки
        </Button>
        <Button variant="secondary" onClick={onOpenStyleSettings}>
          <Palette size={17} />
          Стиль
        </Button>
      </div>
    </header>
  );
}

function TotalsPanel({ totals }) {
  const deltaLabel = totals.reserve > 0 ? "Профицит" : totals.reserve < 0 ? "Дефицит" : "В норме";
  const deltaClass = totals.reserve < 0 ? "total-value--danger" : "total-value--ok";

  return (
    <div className="totals-scroll">
      <section className="totals-panel" aria-label="Итого">
        <div className="totals-panel__title">
          <Calculator size={22} />
          <span>Итого</span>
        </div>
        <div className="totals-metric">
          <span>Норма</span>
          <strong>{formatCurrency(totals.norma)}</strong>
        </div>
        <div className="totals-metric">
          <span>Факт</span>
          <strong>{formatCurrency(totals.fact)}</strong>
        </div>
        <div className="totals-metric">
          <span>К пополнению</span>
          <strong className={totals.refill > 0 ? "total-value--danger" : "total-value--ok"}>
            {formatCurrency(totals.refill)}
          </strong>
        </div>
        <div className="totals-metric">
          <span>{deltaLabel}</span>
          <strong className={deltaClass}>{formatCurrency(Math.abs(totals.reserve))}</strong>
        </div>
      </section>
    </div>
  );
}

function BalanceTable({ rows, onFactChange, onNormaChange, onResetNorma, styleSettings }) {
  return (
    <section className={cn("table-panel", `table-panel--${styleSettings.tableFrame}`)}>
      <div className="table-scroll">
        <table
          className={cn(
            "balance-table",
            `balance-table--${styleSettings.tableDensity}`,
            !styleSettings.rowHoverEnabled && "balance-table--no-hover"
          )}
        >
          <colgroup>
            <col className="balance-col balance-col--service" />
            <col className="balance-col balance-col--norma" />
            <col className="balance-col balance-col--fact" />
            <col className="balance-col balance-col--refill" />
            <col className="balance-col balance-col--status" />
          </colgroup>
          <thead>
            <tr>
              <th>Сервис</th>
              <th className="norma-heading">
                <span>Норма на дату</span>
              </th>
              <th>Факт</th>
              <th>К пополнению</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = compareStatus(row.norma, row.fact);
              const ratio = row.norma > 0 ? Math.round((row.fact / row.norma) * 100) : 0;
              const statusLabel =
                status === "below" ? "Пополнить" : status === "above" ? "Запас" : "В норме";

              return (
                <tr key={row.service.id}>
                  <td>
                    <div className="service-name">
                      <strong>{row.service.name}</strong>
                      {row.normaOverride !== undefined ? <span>индивидуальная норма</span> : null}
                      {row.service.isArchived ? <span>архивный сервис</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="norma-cell">
                      <MoneyInput value={row.norma} onChange={(value) => onNormaChange(row.service.id, value)} />
                      {row.normaOverride !== undefined ? (
                        <button
                          className="inline-action"
                          type="button"
                          onClick={() => onResetNorma(row.service.id)}
                        >
                          к базе
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <MoneyInput
                      value={row.fact}
                      onChange={(value) => onFactChange(row.service.id, value)}
                      className={getFactInputClass(row, styleSettings)}
                    />
                  </td>
                  <td className={cn("money-cell", row.refill > 0 && "money-cell--danger")}>
                    {formatCurrency(row.refill)}
                  </td>
                  <td>
                    <div className={cn("status-pill", `status-pill--${status}`)}>
                      {status === "equal" ? <CheckCircle2 size={15} /> : <BadgeAlert size={15} />}
                      <span>{statusLabel}</span>
                      {styleSettings.showStatusPercent ? <strong>{ratio}%</strong> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsPanel({ services, onSave, onCancel }) {
  const [draft, setDraft] = useState(services);

  useEffect(() => {
    setDraft(services);
  }, [services]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const addRow = () => {
    setDraft((prev) =>
      prev.concat([
        {
          id: uid(),
          name: "",
          defaultNorma: 0,
          isArchived: false,
        },
      ])
    );
  };

  const updateRow = (id, patch) => {
    setDraft((prev) => prev.map((service) => (service.id === id ? { ...service, ...patch } : service)));
  };

  const submit = () => {
    const cleaned = draft
      .map((service) => ({
        id: service.id || uid(),
        name: String(service.name || "").trim(),
        defaultNorma: Number(service.defaultNorma) || 0,
        isArchived: Boolean(service.isArchived),
      }))
      .filter((service) => service.name);

    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <span className="eyebrow">Сервисы</span>
            <h2>Настройки лимитов</h2>
          </div>
          <Button variant="icon" onClick={onCancel} aria-label="Закрыть настройки">
            <X size={18} />
          </Button>
        </div>

        <div className="settings-list">
          <div className="settings-list__head">
            <span>Сервис</span>
            <span>Базовая норма</span>
            <span>Состояние</span>
            <span />
          </div>

          {draft.map((service) => (
            <div key={service.id} className={cn("settings-row", service.isArchived && "settings-row--archived")}>
              <TextInput
                value={service.name}
                onChange={(event) => updateRow(service.id, { name: event.target.value })}
                placeholder="Название сервиса"
              />
              <MoneyInput
                value={service.defaultNorma}
                onChange={(value) => updateRow(service.id, { defaultNorma: value })}
              />
              <span className={cn("state-badge", service.isArchived && "state-badge--archived")}>
                {service.isArchived ? "Архив" : "Активен"}
              </span>
              <Button
                variant="secondary"
                onClick={() => updateRow(service.id, { isArchived: !service.isArchived })}
              >
                {service.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                {service.isArchived ? "Вернуть" : "В архив"}
              </Button>
            </div>
          ))}
        </div>

        <div className="modal__actions">
          <Button variant="secondary" onClick={addRow}>
            <Plus size={16} />
            Добавить
          </Button>
          <div className="modal__actions-right">
            <Button variant="secondary" onClick={onCancel}>
              Отмена
            </Button>
            <Button variant="primary" onClick={submit}>
              <Save size={16} />
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StyleSettingsPanel({ settings, onChange, onCancel, onReset }) {
  const styleSettings = sanitizeStyleSettings(settings);

  const patchSettings = (patch) => {
    onChange(sanitizeStyleSettings({ ...styleSettings, ...patch }));
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal style-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <span className="eyebrow">Интерфейс</span>
            <h2>Настройки стиля</h2>
          </div>
          <Button variant="icon" onClick={onCancel} aria-label="Закрыть настройки стиля">
            <X size={18} />
          </Button>
        </div>

        <div className="style-settings">
          <section className="style-card">
            <div>
              <h3>Поле «Факт»</h3>
              <p>Выберите интенсивность подсветки дефицита, нормы и профицита.</p>
            </div>
            <SegmentedControl
              value={styleSettings.factFillMode}
              onChange={(value) => patchSettings({ factFillMode: value })}
              options={[
                { value: "solid", label: "Заливка" },
                { value: "soft", label: "Мягко" },
                { value: "border", label: "Контур" },
              ]}
            />
          </section>

          <section className="style-card">
            <ToggleSwitch
              checked={styleSettings.surplusHighlightEnabled}
              onChange={(value) => patchSettings({ surplusHighlightEnabled: value })}
              label="Выделять профицит"
              description="Оранжевая заливка показывает излишек средств выше заданного порога."
            />

            <div className="style-grid">
              <div className="style-field">
                <span>Тип порога</span>
                <SegmentedControl
                  value={styleSettings.surplusThresholdType}
                  onChange={(value) => patchSettings({ surplusThresholdType: value })}
                  options={[
                    { value: "percent", label: "% сверх нормы" },
                    { value: "rub", label: "₽ сверх нормы" },
                  ]}
                />
              </div>
              <label className="style-field">
                <span>Значение порога</span>
                <NumberInput
                  value={styleSettings.surplusThresholdValue}
                  onChange={(event) => patchSettings({ surplusThresholdValue: event.target.value })}
                />
              </label>
            </div>
          </section>

          <section className="style-card">
            <div>
              <h3>Таблица</h3>
              <p>Настройки плотности и визуальной реакции строк.</p>
            </div>
            <div className="style-grid">
              <div className="style-field">
                <span>Плотность</span>
                <SegmentedControl
                  value={styleSettings.tableDensity}
                  onChange={(value) => patchSettings({ tableDensity: value })}
                  options={[
                    { value: "standard", label: "Стандарт" },
                    { value: "compact", label: "Компактно" },
                  ]}
                />
              </div>
              <div className="style-field">
                <span>Фрейм</span>
                <SegmentedControl
                  value={styleSettings.tableFrame}
                  onChange={(value) => patchSettings({ tableFrame: value })}
                  options={[
                    { value: "flat", label: "Плоский" },
                    { value: "soft", label: "Мягкий" },
                  ]}
                />
              </div>
            </div>

            <ToggleSwitch
              checked={styleSettings.rowHoverEnabled}
              onChange={(value) => patchSettings({ rowHoverEnabled: value })}
              label="Hover строк"
              description="Подсвечивать строку при наведении."
            />
            <ToggleSwitch
              checked={styleSettings.showStatusPercent}
              onChange={(value) => patchSettings({ showStatusPercent: value })}
              label="Процент в статусе"
              description="Показывать отношение факта к норме в столбце статуса."
            />
          </section>
        </div>

        <div className="modal__actions">
          <Button variant="secondary" onClick={onReset}>
            <RotateCcw size={16} />
            Сбросить стиль
          </Button>
          <Button variant="primary" onClick={onCancel}>
            <Save size={16} />
            Готово
          </Button>
        </div>
      </div>
    </div>
  );
}

function HistoryPage({ dates, recordsByDate, services, onSelectDate, onBack }) {
  return (
    <section className="page-panel">
      <div className="table-actions">
        <div>
          <h1>История</h1>
          <span>{dates.length ? `${dates.length} дат` : "Нет сохраненных дат"}</span>
        </div>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft size={17} />
          К таблице
        </Button>
      </div>

      <div className="history-list">
        {dates.map((historyDate) => {
          const rows = buildRowsForDate(services, recordsByDate[historyDate] || {}, {
            includeArchivedWithRecords: true,
          });
          const totals = calcTotals(rows);
          const status = getDayStatus(totals);

          return (
            <button
              key={historyDate}
              type="button"
              className="history-row"
              onClick={() => onSelectDate(historyDate)}
            >
              <span>
                <strong>{formatHumanDate(historyDate)}</strong>
                <small>{historyDate}</small>
              </span>
              <span className={cn("history-status", `history-status--${status}`)}>
                {totals.refill > 0 ? `Пополнить ${formatCurrency(totals.refill)}` : "В норме"}
              </span>
              <span>{formatCurrency(totals.reserve)}</span>
            </button>
          );
        })}

        {dates.length === 0 ? <div className="empty-state">Нет сохраненных дат</div> : null}
      </div>
    </section>
  );
}

export default function App() {
  const initialState = useMemo(() => loadState(), []);
  const [services, setServices] = useState(initialState.services);
  const [recordsByDate, setRecordsByDate] = useState(initialState.recordsByDate);
  const [preferences, setPreferences] = useState(initialState.preferences);
  const [date, setDate] = useState(initialState.preferences.lastDate);
  const [notice, setNotice] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false);
  const [view, setView] = useState("balance");
  const noticeTimerRef = useRef(null);
  const actionNoticeTimerRef = useRef(null);

  const closeNotice = () => {
    window.clearTimeout(noticeTimerRef.current);
    setNotice(null);
  };

  const flash = (message, action) => {
    window.clearTimeout(noticeTimerRef.current);
    setNotice({ message, action });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), action ? 7000 : 2400);
  };

  const closeActionNotice = () => {
    window.clearTimeout(actionNoticeTimerRef.current);
    setActionNotice(null);
  };

  const flashAction = (message, action) => {
    window.clearTimeout(actionNoticeTimerRef.current);
    setActionNotice({ message, action });
    actionNoticeTimerRef.current = window.setTimeout(() => setActionNotice(null), action ? 7000 : 2400);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimerRef.current);
      window.clearTimeout(actionNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    try {
      saveState({
        services,
        recordsByDate,
        preferences: {
          ...preferences,
          lastDate: date,
        },
      });
    } catch (error) {
      console.warn("Failed to persist local state", error);
      flash("Не удалось сохранить данные");
    }
  }, [date, preferences, recordsByDate, services]);

  const rows = useMemo(
    () =>
      buildRowsForDate(services, recordsByDate[date] || {}, {
        includeArchivedWithRecords: true,
      }),
    [date, recordsByDate, services]
  );
  const totals = useMemo(() => calcTotals(rows), [rows]);
  const historyDates = useMemo(() => sortDatesDesc(Object.keys(recordsByDate)), [recordsByDate]);
  const styleSettings = sanitizeStyleSettings(preferences.styleSettings);

  const updateStyleSettings = (nextSettings) => {
    setPreferences((prev) => ({
      ...prev,
      styleSettings: sanitizeStyleSettings(nextSettings),
    }));
  };

  const updateFact = (serviceId, fact) => {
    setRecordsByDate((prev) => {
      const day = { ...(prev[date] || {}) };
      const currentCell = day[serviceId] || {};

      day[serviceId] = {
        ...currentCell,
        fact,
      };

      return {
        ...prev,
        [date]: day,
      };
    });
  };

  const updateNorma = (serviceId, value) => {
    setRecordsByDate((prev) => {
      const day = { ...(prev[date] || {}) };
      const currentCell = day[serviceId] || {};
      const service = services.find((item) => item.id === serviceId);
      const nextCell = { ...currentCell };

      if (service && value === Number(service.defaultNorma)) {
        delete nextCell.normaOverride;
      } else {
        nextCell.normaOverride = value;
      }

      day[serviceId] = nextCell;

      return {
        ...prev,
        [date]: day,
      };
    });
  };

  const resetNorma = (serviceId) => {
    setRecordsByDate((prev) => {
      const day = { ...(prev[date] || {}) };
      const currentCell = { ...(day[serviceId] || {}) };
      delete currentCell.normaOverride;
      day[serviceId] = currentCell;

      return {
        ...prev,
        [date]: day,
      };
    });
  };

  const clearFacts = () => {
    const previousDay = { ...(recordsByDate[date] || {}) };

    setRecordsByDate((prev) => {
      const day = { ...(prev[date] || {}) };

      services
        .filter((service) => !service.isArchived)
        .forEach((service) => {
          const currentCell = day[service.id] || {};
          day[service.id] = {
            ...currentCell,
            fact: 0,
          };
        });

      return {
        ...prev,
        [date]: day,
      };
    });

    flashAction("Факт за дату обнулен", {
      label: "Отменить",
      onClick: () => {
        setRecordsByDate((prev) => ({
          ...prev,
          [date]: previousDay,
        }));
        closeActionNotice();
      },
    });
  };

  const copyBalanceSummary = async () => {
    const deltaLabel = totals.reserve > 0 ? "Профицит" : totals.reserve < 0 ? "Дефицит" : "В норме";
    const lines = [
      "Учет баланса сервисов",
      `Дата: ${formatHumanDate(date)} (${date})`,
      "",
      "ИТОГО",
      `Норма: ${formatCurrency(totals.norma)}`,
      `Факт: ${formatCurrency(totals.fact)}`,
      `К пополнению: ${formatCurrency(totals.refill)}`,
      `${deltaLabel}: ${formatCurrency(Math.abs(totals.reserve))}`,
      "",
      "СЕРВИСЫ",
      "",
    ];

    rows.forEach((row, index) => {
      const status = compareStatus(row.norma, row.fact);
      const ratio = row.norma > 0 ? Math.round((row.fact / row.norma) * 100) : 0;
      const statusLabel = status === "below" ? "Пополнить" : status === "above" ? "Запас" : "В норме";

      lines.push(
        `${index + 1}. ${row.service.name}`,
        `Норма на дату: ${formatCurrency(row.norma)}`,
        `Факт: ${formatCurrency(row.fact)}`,
        `К пополнению: ${formatCurrency(row.refill)}`,
        `Статус: ${statusLabel} (${ratio}%)`
      );

      if (index < rows.length - 1) {
        lines.push("");
      }
    });

    const text = lines.join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      flashAction("Сводка скопирована");
    } catch (error) {
      console.warn("Failed to copy balance summary", error);
      flash("Не удалось скопировать сводку");
    }
  };

  const saveServices = (nextServices) => {
    setServices(nextServices.length ? nextServices : createDefaultState().services);
    setIsSettingsOpen(false);
    flash("Настройки сохранены");
  };

  const selectHistoryDate = (nextDate) => {
    setDate(nextDate);
    setView("balance");
  };

  return (
    <div className="app-shell">
      <Notice notice={notice} onClose={closeNotice} />
      <AppHeader
        date={date}
        onDateChange={setDate}
        onOpenHistory={() => setView("history")}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStyleSettings={() => setIsStyleSettingsOpen(true)}
        currentView={view}
      />

      <main className="workspace">
        {view === "history" ? (
          <HistoryPage
            dates={historyDates}
            recordsByDate={recordsByDate}
            services={services}
            onSelectDate={selectHistoryDate}
            onBack={() => setView("balance")}
          />
        ) : (
          <>
            <div className="table-actions">
              <div>
                <h1>Учет баланса сервисов</h1>
                <span>{rows.length} активных сервисов</span>
              </div>
              <div className="table-actions__buttons">
                <ActionStatus notice={actionNotice} />
                <Button variant="secondary" onClick={copyBalanceSummary}>
                  <Copy size={17} />
                  Скопировать
                </Button>
                <Button variant="danger" onClick={clearFacts}>
                  <RotateCcw size={17} />
                  Сбросить факт
                </Button>
              </div>
            </div>

            <BalanceTable
              rows={rows}
              onFactChange={updateFact}
              onNormaChange={updateNorma}
              onResetNorma={resetNorma}
              styleSettings={styleSettings}
            />
            <TotalsPanel totals={totals} />
          </>
        )}
      </main>

      {isSettingsOpen ? (
        <SettingsPanel services={services} onSave={saveServices} onCancel={() => setIsSettingsOpen(false)} />
      ) : null}

      {isStyleSettingsOpen ? (
        <StyleSettingsPanel
          settings={styleSettings}
          onChange={updateStyleSettings}
          onCancel={() => setIsStyleSettingsOpen(false)}
          onReset={() => updateStyleSettings(DEFAULT_STYLE_SETTINGS)}
        />
      ) : null}

    </div>
  );
}
