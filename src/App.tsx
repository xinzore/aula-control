import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Battery,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Command,
  Cpu,
  ExternalLink,
  Github,
  Globe2,
  LayoutDashboard,
  Lightbulb,
  LoaderCircle,
  Menu,
  MousePointer2,
  PlugZap,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Unplug,
  Usb,
  X,
  Zap,
} from "lucide-react";
import {
  DeviceSession,
  chooseDevice,
  supported,
  webHidAvailable,
} from "./lib/device";
import type { Snapshot } from "./lib/device";
import {
  DEBOUNCE,
  DeviceError,
  RATES,
  SLEEP,
  colorHex,
  decode,
  demoBlock,
  diff,
  encode,
  hexColor,
  problems,
} from "./lib/protocol";
import type { Settings } from "./lib/protocol";
import { downloadBackup, rememberBackup } from "./lib/storage";

type Lang = "tr" | "en";
type Tab = "overview" | "dpi" | "performance" | "lighting" | "device";
type Mode = "disconnected" | "demo" | "device";
type T = (tr: string, en: string) => string;
const GITHUB = "https://github.com/xinzore/aula-control";
const sample = (): Snapshot => {
  const block = demoBlock();
  return {
    model: "AULA V9 Ultra+",
    configId: 5,
    wireless: true,
    battery: 83,
    block,
    settings: decode(block),
  };
};
const readLang = (): Lang => {
  try {
    return localStorage.getItem("aula-control:lang") === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
};

function MouseArt({
  color = "#c9ed8b",
  connected = false,
}: {
  color?: string;
  connected?: boolean;
}) {
  return (
    <svg className="mouse-art" viewBox="0 0 420 300" aria-hidden="true">
      <defs>
        <linearGradient id="shell" x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#555b53" />
          <stop offset=".36" stopColor="#363c35" />
          <stop offset="1" stopColor="#222720" />
        </linearGradient>
        <linearGradient id="button" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5c6358" />
          <stop offset="1" stopColor="#3c4239" />
        </linearGradient>
        <radialGradient id="glow">
          <stop stopColor={color} stopOpacity={connected ? ".19" : ".07"} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id="shadow">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <ellipse
        cx="221"
        cy="231"
        rx="109"
        ry="25"
        fill="#000"
        opacity=".4"
        filter="url(#shadow)"
      />
      <ellipse cx="214" cy="160" rx="181" ry="132" fill="url(#glow)" />
      <g transform="translate(46 0) rotate(-22 170 150)">
        <path
          d="M116 63c24-24 75-30 106-9 23 16 38 59 43 97l5 44c3 29-22 57-69 63-49 6-85-12-91-41l-11-62c-6-35-4-72 17-92Z"
          fill="#171c16"
          stroke="#626b59"
          strokeWidth="1.2"
        />
        <path
          d="M114 60c25-25 75-29 104-8 22 16 37 57 42 94l5 43c3 29-22 55-66 61-47 6-82-11-88-40l-11-61c-6-34-5-69 14-89Z"
          fill="url(#shell)"
          stroke="#69715f"
          strokeWidth="1"
        />
        <path
          d="M114 60c15-14 34-21 54-23l14 100-79 15c-6-36-7-74 11-92Z"
          fill="url(#button)"
          stroke="#737b69"
          strokeOpacity=".6"
        />
        <path
          d="M175 37c17-1 32 3 43 12 17 13 31 42 39 80l-68 10Z"
          fill="url(#button)"
          stroke="#737b69"
          strokeOpacity=".6"
        />
        <path d="m171 41 16 99" fill="none" stroke="#151a13" strokeWidth="4" />
        <rect
          x="163"
          y="62"
          width="16"
          height="40"
          rx="8"
          fill="#11170e"
          transform="rotate(-9 171 82)"
        />
        <rect
          x="167"
          y="66"
          width="8"
          height="31"
          rx="4"
          fill={color}
          opacity={connected ? ".95" : ".4"}
          transform="rotate(-9 171 82)"
        />
        {[72, 78, 84, 90].map((y) => (
          <path
            key={y}
            d={`m167 ${y} 7-1`}
            stroke="#37422c"
            strokeWidth="1.5"
          />
        ))}
        <path
          d="m104 160 7 35m-3-30 3 12m2 5 3 12"
          stroke="#151a13"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M124 217c25 18 75 20 111-6"
          fill="none"
          stroke={color}
          strokeOpacity={connected ? ".85" : ".22"}
          strokeWidth="2"
        />
        <path
          d="m176 188 9-19 13 16m-17-4 11-1"
          fill="none"
          stroke="#89937c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
function Setting({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: ReactNode;
}) {
  return (
    <div className="setting">
      <div>
        <h3>{title}</h3>
        {text && <p>{text}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}
function Card({
  children,
  title,
  eyebrow,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
}) {
  return (
    <section className="card">
      {(title || eyebrow) && (
        <div className="card-head">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {title && <h2>{title}</h2>}
        </div>
      )}
      {children}
    </section>
  );
}
function Numeric({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="number-field">
      <input
        type="number"
        aria-label={label}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
      {unit && <span>{unit}</span>}
    </div>
  );
}
function Choices({
  value,
  items,
  onChange,
  label,
}: {
  value: number;
  items: readonly (readonly [number, string])[];
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="choices" role="group" aria-label={label}>
      {items.map(([v, name]) => (
        <button
          type="button"
          key={v}
          aria-pressed={v === value}
          className={v === value ? "selected" : ""}
          onClick={() => onChange(v)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
function Level({
  value,
  max,
  onChange,
  label,
  t,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  t: T;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {value > max && (
        <option value={value}>
          {t("Mevcut", "Current")} ({value})
        </option>
      )}
      {Array.from({ length: max + 1 }, (_, i) => (
        <option value={i} key={i}>
          {i === 0
            ? t("En düşük", "Lowest")
            : i === max
              ? t("En yüksek", "Highest")
              : `${i} / ${max}`}
        </option>
      ))}
    </select>
  );
}
function Help({ t, onClose }: { t: T; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const rule =
    'SUBSYSTEM=="hidraw", ATTRS{idVendor}=="320f", ATTRS{idProduct}=="22a0|22ba|22b6|22b7|22b8", TAG+="uaccess"';
  return (
    <dialog
      ref={ref}
      className="help-dialog"
      onCancel={onClose}
      aria-labelledby="help-title"
    >
      <button
        className="icon-button modal-close"
        aria-label={t("Kapat", "Close")}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="eyebrow">
        {t("BAĞLANTI REHBERİ", "CONNECTION GUIDE")}
      </span>
      <h2 id="help-title">
        {t("Bir bağlantı kadar yakın.", "One connection away.")}
      </h2>
      <p>
        {t(
          "Bilgisayarında Chrome, Edge veya WebHID destekleyen bir Chromium tarayıcısı kullan. USB kablosunu ya da 2.4 GHz alıcıyı bağla, ardından “Fareyi bağla” düğmesinden cihazını seç.",
          "Use Chrome, Edge, or a Chromium browser with WebHID on your computer. Connect a USB cable or 2.4 GHz receiver, then select your mouse with “Connect mouse”.",
        )}
      </p>
      <div className="help-note">
        <Usb size={20} />
        <p>
          {t(
            "Bluetooth üzerinden ayar değiştirme desteklenmiyor. Firefox ve Safari’de WebHID bulunmuyor.",
            "Configuration over Bluetooth is not supported. Firefox and Safari do not provide WebHID.",
          )}
        </p>
      </div>
      <h3>Linux</h3>
      <p>
        {t(
          "Cihaz listede görünüyor ama açılamıyorsa aşağıdaki satırı /etc/udev/rules.d/70-aula-control.rules dosyasına yönetici yetkisiyle kaydet.",
          "If your device appears but cannot be opened, save this line to /etc/udev/rules.d/70-aula-control.rules as an administrator.",
        )}
      </p>
      <pre>{rule}</pre>
      <button
        className="button secondary small"
        onClick={() =>
          void navigator.clipboard
            .writeText(rule)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        {copied ? <Check size={15} /> : <Command size={15} />}
        {copied ? t("Kopyalandı", "Copied") : t("Kuralı kopyala", "Copy rule")}
      </button>
      <p>
        {t(
          "Ardından sudo udevadm control --reload-rules komutunu çalıştır ve alıcıyı çıkarıp yeniden tak. Aulaar’ı bu bilgisayarda kurduysan bu izin zaten tanımlıdır.",
          "Then run sudo udevadm control --reload-rules and reconnect the receiver. If Aulaar is installed on this computer, you already have this permission.",
        )}
      </p>
      <h3>{t("Cihaz bulunamıyor mu?", "Still not connecting?")}</h3>
      <p>
        {t(
          "Fareyi hareket ettirerek uyandır. Aynı fareyi yöneten masaüstü yazılımını veya başka bir web panelini kapatıp tekrar dene.",
          "Move the mouse to wake it. Close other desktop software or web panels controlling the same mouse, then retry.",
        )}
      </p>
      <a
        href="https://developer.chrome.com/docs/capabilities/hid"
        target="_blank"
        rel="noreferrer"
        className="text-link"
      >
        {t("WebHID hakkında", "About WebHID")} <ExternalLink size={13} />
      </a>
    </dialog>
  );
}

export default function App() {
  const [lang, setLang] = useState<Lang>(readLang);
  const t: T = (tr, en) => (lang === "tr" ? tr : en);
  const [tab, setTab] = useState<Tab>("overview");
  const [mode, setMode] = useState<Mode>("disconnected");
  const [snapshot, setSnapshot] = useState<Snapshot>(sample);
  const [draft, setDraft] = useState<Settings>(() => sample().settings);
  const [editor, setEditor] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const session = useRef<DeviceSession | null>(null);
  const initialized = useRef(false);
  const lock = useRef(false);
  const ready = mode !== "disconnected";
  const changes = useMemo(
    () => diff(snapshot.settings, draft),
    [snapshot.settings, draft],
  );
  const pending = Object.keys(changes).length;
  const knownErrors = new Set(problems(snapshot.settings));
  const invalid = problems(draft).filter((p) => !knownErrors.has(p));
  const active = draft.stages[draft.activeStage] ?? draft.stages[0]!;
  const stage = draft.stages[editor]!;
  const rateKey = snapshot.wireless ? "pollingWireless" : "pollingWired";
  const nav = [
    {
      id: "overview" as Tab,
      icon: LayoutDashboard,
      name: t("Genel bakış", "Overview"),
    },
    { id: "dpi" as Tab, icon: Target, name: t("DPI kademeleri", "DPI stages") },
    {
      id: "performance" as Tab,
      icon: Activity,
      name: t("Performans", "Performance"),
    },
    {
      id: "lighting" as Tab,
      icon: Lightbulb,
      name: t("Aydınlatma", "Lighting"),
    },
    {
      id: "device" as Tab,
      icon: SlidersHorizontal,
      name: t("Cihaz ve yedek", "Device & backup"),
    },
  ];
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("aula-control:lang", lang);
    } catch {
      /* language preference is optional */
    }
  }, [lang]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (initialized.current || !webHidAvailable()) return;
    initialized.current = true;
    void navigator.hid
      .getDevices()
      .then((devices) => {
        const device = devices.find(supported);
        if (device) void connectTo(device);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!webHidAvailable()) return;
    const disconnect = (event: HIDConnectionEvent) => {
      if (event.device !== session.current?.device) return;
      session.current.transport.abort();
      session.current = null;
      setMode("disconnected");
      setError("DISCONNECTED");
      setBusy(false);
      lock.current = false;
    };
    navigator.hid.addEventListener("disconnect", disconnect);
    return () => navigator.hid.removeEventListener("disconnect", disconnect);
  }, []);
  useEffect(() => {
    if (mode !== "device") return;
    const timer = setInterval(() => {
      const current = session.current;
      if (!current || lock.current) return;
      lock.current = true;
      void current.transport
        .command(0x1a)
        .then((reply) =>
          setSnapshot((old) => ({
            ...old,
            battery: reply[7]! <= 100 ? reply[7]! : null,
          })),
        )
        .catch(() => undefined)
        .finally(() => {
          lock.current = false;
        });
    }, 60000);
    return () => clearInterval(timer);
  }, [mode]);
  function mutate(edit: (s: Settings) => void) {
    setDraft((old) => {
      const next = structuredClone(old);
      edit(next);
      return next;
    });
    setNotice("");
  }
  function message(code: string) {
    const messages: Record<string, [string, string]> = {
      UNSUPPORTED_BROWSER: [
        "Bu tarayıcı WebHID desteklemiyor. Bilgisayarında Chrome veya Edge ile aç.",
        "This browser does not support WebHID. Open it in desktop Chrome or Edge.",
      ],
      UNSUPPORTED_DEVICE: [
        "Bu cihazın protokolü henüz desteklenmiyor.",
        "This device protocol is not supported yet.",
      ],
      ASLEEP: [
        "Fare uykuda veya kapalı. Hareket ettirip yeniden bağlan.",
        "The mouse is asleep or off. Move it and reconnect.",
      ],
      TIMEOUT: [
        "Fare yanıt vermedi. Fareyi uyandır, diğer ayar uygulamalarını kapat ve tekrar dene.",
        "The mouse did not respond. Wake it, close other configuration apps, and retry.",
      ],
      DISCONNECTED: [
        "Cihaz bağlantısı kesildi. Tekrar bağlayabilirsin.",
        "The device disconnected. You can reconnect it.",
      ],
      INVALID_VALUE: [
        "Bir değer desteklenen aralığın dışında. DPI için 100–42000 arası, 50’nin katı bir değer kullan.",
        "A value is outside the supported range. Use DPI between 100–42000, in steps of 50.",
      ],
      WRITE_MISMATCH: [
        "Fare yeni ayarları doğrulamadı. Yenile ile cihazdaki güncel ayarları oku.",
        "The mouse did not confirm the new settings. Refresh to read its current state.",
      ],
      BACKUP_FAILED: [
        "İlk ayarlar tarayıcıya yedeklenemedi. Tarayıcının yerel depolama iznini kontrol et.",
        "The original settings could not be backed up. Check browser storage access.",
      ],
      NotAllowedError: [
        "Cihaza erişilemedi. Bağlantı rehberindeki izinleri kontrol et.",
        "Device access was denied. Check the connection guide.",
      ],
      NetworkError: [
        "Cihaz açılamadı. Diğer kontrol uygulamalarını kapat ve Linux cihaz izinlerini kontrol et.",
        "Could not open the device. Close other control apps and check Linux device permissions.",
      ],
      INVALID_CONFIG: [
        "Cihazdan beklenmeyen bir yapılandırma geldi. Tekrar bağlan.",
        "The device returned an unexpected configuration. Reconnect it.",
      ],
    };
    const pair = messages[code] ?? [
      t(
        "Bağlantı kurulamadı. Bağlantı rehberini kontrol et.",
        "Connection failed. Check the connection guide.",
      ),
      t(
        "Bağlantı kurulamadı. Bağlantı rehberini kontrol et.",
        "Connection failed. Check the connection guide.",
      ),
    ];
    return t(...pair);
  }
  function fail(e: unknown) {
    setError(
      e instanceof DeviceError
        ? e.code
        : e instanceof Error
          ? e.name
          : "UNKNOWN",
    );
  }
  async function connectTo(device: HIDDevice) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    let next: DeviceSession | null = null;
    try {
      if (session.current) await session.current.close();
      session.current = null;
      if (!device.opened) await device.open();
      next = new DeviceSession(device);
      const result = await next.read();
      session.current = next;
      setSnapshot(result);
      setDraft(structuredClone(result.settings));
      setEditor(result.settings.activeStage);
      setMode("device");
    } catch (e) {
      if (next) await next.close();
      setMode("disconnected");
      fail(e);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function connect() {
    if (busy) return;
    try {
      const device = await chooseDevice();
      if (device) await connectTo(device);
    } catch (e) {
      if (e instanceof Error && e.name === "NotFoundError") return;
      fail(e);
    }
  }
  function canDiscard() {
    return (
      !pending ||
      window.confirm(
        t(
          "Kaydedilmemiş değişiklikler silinsin mi?",
          "Discard your unsaved changes?",
        ),
      )
    );
  }
  async function disconnect() {
    if (!canDiscard()) return;
    if (session.current) await session.current.close();
    session.current = null;
    setMode("disconnected");
    const next = sample();
    setSnapshot(next);
    setDraft(next.settings);
    setError("");
    setNotice("");
  }
  function demo() {
    const next = sample();
    setSnapshot(next);
    setDraft(structuredClone(next.settings));
    setMode("demo");
    setError("");
    setEditor(2);
  }
  async function refresh() {
    if (!session.current || lock.current || !canDiscard()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await session.current.read();
      setSnapshot(next);
      setDraft(structuredClone(next.settings));
      setEditor(next.settings.activeStage);
      setNotice(
        t("Ayarlar fareden yenilendi.", "Settings refreshed from your mouse."),
      );
    } catch (e) {
      fail(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!ready || !pending || invalid.length || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      let block: Uint8Array;
      if (mode === "demo") {
        await new Promise((resolve) => setTimeout(resolve, 250));
        block = encode(draft, snapshot.block);
      } else {
        if (!session.current) throw new DeviceError("DISCONNECTED");
        block = await session.current.apply(changes, (before) =>
          rememberBackup(snapshot, before),
        );
      }
      const settings = decode(block);
      setSnapshot((old) => ({ ...old, block, settings }));
      setDraft(structuredClone(settings));
      setNotice(
        mode === "demo"
          ? t(
              "Demo ayarları güncellendi. Gerçek cihaza yazılmadı.",
              "Demo settings updated. No hardware was changed.",
            )
          : t(
              "Ayarlar kaydedildi ve fareden doğrulandı.",
              "Settings saved and verified with your mouse.",
            ),
      );
    } catch (e) {
      fail(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function navigate(id: Tab) {
    setTab(id);
    setMobileNav(false);
  }
  const stageTiles = (
    <div className="stage-grid">
      {draft.stages.map((st, i) => (
        <button
          type="button"
          key={i}
          disabled={!ready || busy}
          className={`stage-tile ${editor === i && tab === "dpi" ? "editing" : ""} ${draft.activeStage === i ? "active" : ""} ${!st.enabled ? "stage-disabled" : ""}`}
          aria-label={`${t("Kademe", "Stage")} ${i + 1}: ${st.x} DPI`}
          onClick={() => {
            setEditor(i);
            setTab("dpi");
          }}
        >
          <span className="stage-index">
            <i style={{ background: colorHex(st.color) }} />
            {String(i + 1).padStart(2, "0")}
            {draft.activeStage === i && <Check size={13} />}
          </span>
          <strong>
            {st.x.toLocaleString(lang === "tr" ? "tr-TR" : "en-US")}
          </strong>
          <span className="stage-unit">DPI</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`app ${mobileNav ? "nav-open" : ""}`}>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label={t("Menüyü kapat", "Close menu")}
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
          aria-label="AULA Control"
        >
          <span className="brand-mark">A</span>
          <span>
            AULA<span className="brand-sub">CONTROL</span>
          </span>
        </a>
        <div className="workspace-label">{t("ÇALIŞMA ALANI", "WORKSPACE")}</div>
        <nav aria-label={t("Ana menü", "Main navigation")}>
          {nav.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "nav-item current" : "nav-item"}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.name}
              {tab === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-symbol">
              <ShieldCheck size={19} />
            </span>
            <strong>{t("Kontrol sende.", "You’re in control.")}</strong>
            <p>
              {t(
                "Ayarların doğrudan cihazına gider. Hesap gerekmez.",
                "Settings go straight to your device. No account needed.",
              )}
            </p>
            <span className="local-foot">
              <i />
              {t("Yalnızca yerel iletişim", "Local device communication")}
            </span>
          </div>
          <button className="nav-item help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            {t("Bağlantı yardımı", "Connection help")}
            <ChevronRight size={15} />
          </button>
          <div className="sidebar-version">
            <span>OPEN SOURCE</span>
            <span>v0.1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label={t("Menüyü aç", "Open menu")}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>{t("Fare ayarları", "Mouse settings")}</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === tab)?.name}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="language-button"
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
              aria-label={t("İngilizceye geç", "Switch to Turkish")}
            >
              <Globe2 size={15} />
              {lang.toUpperCase()}
            </button>
            <a
              className="icon-button github-link"
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <Github size={19} />
            </a>
            <span className="topbar-divider" />
            <span
              className={`connection-pill ${mode === "device" ? "online" : ""} ${mode === "demo" ? "demo" : ""}`}
            >
              <i />
              {mode === "device"
                ? t("Bağlı", "Connected")
                : mode === "demo"
                  ? t("Demo modu", "Demo mode")
                  : t("Bağlı değil", "Not connected")}
            </span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {t(
                  "KÜÇÜK AYARLAR. BÜYÜK FARK.",
                  "SMALL ADJUSTMENTS. BIG DIFFERENCE.",
                )}
              </span>
              <h1>
                {tab === "overview" ? (
                  <>
                    {t("Her hareket,", "Every move,")}
                    <br />
                    <span>
                      {t("senin kontrolünde.", "under your control.")}
                    </span>
                  </>
                ) : (
                  nav.find((n) => n.id === tab)?.name
                )}
              </h1>
              <p>
                {tab === "overview"
                  ? t(
                      "Farenin potansiyelini açığa çıkar. Tam istediğin gibi.",
                      "Unlock your mouse’s potential. Exactly your way.",
                    )
                  : tab === "dpi"
                    ? t(
                        "Her oyun, her ekran ve her hareket için doğru hassasiyet.",
                        "The right sensitivity for every game, screen, and move.",
                      )
                    : tab === "performance"
                      ? t(
                          "Hız ve hassasiyet arasındaki dengeyi sen belirle.",
                          "Find your balance between speed and precision.",
                        )
                      : tab === "lighting"
                        ? t(
                            "Masanın havasına küçük bir dokunuş.",
                            "A little personality for your desk.",
                          )
                        : t(
                            "Cihazını tanı. Ayarlarının bir kopyasını sakla.",
                            "Know your device. Keep a copy of your settings.",
                          )}
              </p>
            </div>
            <div className="heading-actions">
              {mode === "disconnected" ? (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void connect()}
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <PlugZap size={17} />
                  )}{" "}
                  {t("Fareyi bağla", "Connect mouse")}
                </button>
              ) : (
                <>
                  <button
                    className="icon-button refresh-button"
                    disabled={busy || mode === "demo"}
                    onClick={() => void refresh()}
                    aria-label={t("Ayarları yenile", "Refresh settings")}
                  >
                    <RefreshCw size={18} className={busy ? "spin" : ""} />
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void disconnect()}
                  >
                    <Unplug size={16} />
                    {mode === "demo"
                      ? t("Demodan çık", "Exit demo")
                      : t("Bağlantıyı kes", "Disconnect")}
                  </button>
                </>
              )}
            </div>
          </div>
          {mode === "demo" && (
            <div className="demo-banner">
              <span>
                <span className="demo-tag">DEMO</span>
                {t(
                  "Keşfetmek serbest. Buradaki değişiklikler yalnızca örnek cihaza uygulanır.",
                  "Explore freely. Changes here only affect a simulated device.",
                )}
              </span>
              <button onClick={() => void connect()} disabled={busy}>
                {t("Kendi fareni bağla", "Connect your mouse")}
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="alert error-alert">
              <span>{message(error)}</span>
              <button onClick={() => setHelp(true)}>
                {t("Yardım", "Help")}
                <CircleHelp size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={t("Bildirimi kapat", "Dismiss notification")}
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success-alert">
              <CheckCheck size={18} />
              <span>{notice}</span>
            </div>
          )}
          {!ready && tab !== "overview" && (
            <div className="connect-hint">
              <Usb size={18} />
              <span>
                {t(
                  "Ayarları düzenlemek için fareni bağla veya",
                  "Connect your mouse to edit settings or",
                )}
              </span>
              <button onClick={demo}>
                {t("demoyu dene", "try the demo")}
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {tab === "overview" && (
            <>
              <div className="hero-grid">
                <section className="device-hero">
                  <div className="hero-card-top">
                    <span className="hero-label">
                      {t("CİHAZIN", "YOUR DEVICE")}
                    </span>
                    <span className="hero-link">
                      <Radio size={12} />
                      {ready
                        ? snapshot.wireless
                          ? "2.4 GHz"
                          : "USB"
                        : "USB / 2.4 GHz"}
                    </span>
                  </div>
                  <MouseArt color={colorHex(active.color)} connected={ready} />
                  <div className="hero-card-bottom">
                    <div>
                      <span className="hero-series">WIRELESS GAMING MOUSE</span>
                      <h2>{ready ? snapshot.model : "AULA V9 / X9"}</h2>
                    </div>
                    <span className={`device-light ${ready ? "on" : ""}`} />
                  </div>
                  <div className="hero-caption">
                    {ready
                      ? t(
                          "Bir sonraki hareketine hazır.",
                          "Ready for your next move.",
                        )
                      : t(
                          "Faren burada kendini evinde hissedecek.",
                          "Your mouse will feel right at home.",
                        )}
                  </div>
                </section>
                <section className="sensitivity-card">
                  <div className="section-title">
                    <span className="eyebrow">
                      {t("ANLIK HASSASİYET", "CURRENT SENSITIVITY")}
                    </span>
                    <MousePointer2 size={19} />
                  </div>
                  <div className="big-dpi">
                    {ready
                      ? active.x.toLocaleString(
                          lang === "tr" ? "tr-TR" : "en-US",
                        )
                      : "—"}
                    <span>DPI</span>
                  </div>
                  <div className="dpi-caption">
                    <span className="mini-pill">
                      {ready
                        ? `${t("Kademe", "Stage")} ${draft.activeStage + 1} / 6`
                        : t("Bağlantı bekleniyor", "Waiting for connection")}
                    </span>
                    {!!pending && (
                      <span className="unsaved-label">
                        {t("Kaydedilmedi", "Unsaved")}
                      </span>
                    )}
                  </div>
                  <div className="sensitivity-bottom">
                    <div className="fine-line">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <p>
                      {ready
                        ? t(
                            "İyi bir his, doğru bir ayarla başlar.",
                            "A good feel starts with the right setting.",
                          )
                        : t(
                            "Cihazına izin ver. Geri kalanını birlikte ayarlayalım.",
                            "Allow access to your device. Make yourself at home.",
                          )}
                    </p>
                    <button
                      className="text-link"
                      onClick={() => (ready ? navigate("dpi") : demo())}
                    >
                      {ready
                        ? t("Hassasiyeti düzenle", "Adjust sensitivity")
                        : t("Önce demoyu keşfet", "Explore the demo first")}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-icon">
                    <Zap size={19} />
                  </span>
                  <div>
                    <span>{t("Raporlama hızı", "Polling rate")}</span>
                    <strong>
                      {ready
                        ? (RATES[draft[rateKey]] ?? "?").toLocaleString()
                        : "—"}{" "}
                      <small>Hz</small>
                    </strong>
                  </div>
                  <span className="stat-note">
                    {t("Daha hızlı tepki.", "Faster response.")}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">
                    <Battery size={20} />
                  </span>
                  <div>
                    <span>{t("Pil durumu", "Battery level")}</span>
                    <strong>
                      {ready && snapshot.battery !== null
                        ? snapshot.battery
                        : "—"}{" "}
                      <small>%</small>
                    </strong>
                  </div>
                  <span className="battery-meter">
                    <span
                      style={{
                        width: `${ready ? (snapshot.battery ?? 0) : 0}%`,
                      }}
                    />
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon">
                    <Target size={19} />
                  </span>
                  <div>
                    <span>{t("Kalkış mesafesi", "Lift-off distance")}</span>
                    <strong>
                      {ready ? draft.lod + 1 : "—"} <small>mm</small>
                    </strong>
                  </div>
                  <span className="stat-note">
                    {t("Kontrollü hareket.", "Precise movement.")}
                  </span>
                </div>
              </div>
              <Card>
                <div className="inline-card-heading">
                  <div>
                    <h2>
                      {t("Hassasiyet kademelerin", "Your sensitivity stages")}
                    </h2>
                    <p>
                      {ready
                        ? t(
                            "İnce ayar yapmak için bir kademeyi seç.",
                            "Select a stage to fine-tune it.",
                          )
                        : t(
                            "Altı farklı kademe. Her senaryoya bir ayar.",
                            "Six different stages. One for every scenario.",
                          )}
                    </p>
                  </div>
                  <span className="subtle-tag">6 {t("KADEME", "STAGES")}</span>
                </div>
                {stageTiles}
              </Card>
              <div className="support-strip">
                <span className="support-icon">
                  <Cpu size={20} />
                </span>
                <div>
                  <strong>
                    {t(
                      "AULA V9 ve X9 ailesi için tasarlandı.",
                      "Built for the AULA V9 and X9 families.",
                    )}
                  </strong>
                  <p>
                    {t(
                      "V9 Ultra+ ile doğrulandı. Diğer modeller aynı Evision protokolünü kullanır.",
                      "Verified with V9 Ultra+. Other listed models share the Evision protocol.",
                    )}
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() => navigate("device")}
                >
                  {t("Uyumluluk", "Compatibility")}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          <fieldset disabled={!ready || busy} className="settings-fieldset">
            {tab === "dpi" && (
              <>
                <Card>
                  <div className="inline-card-heading">
                    <div>
                      <h2>{t("Bir kademe seç", "Pick a stage")}</h2>
                      <p>
                        {t(
                          "Seçmek ayarları fareye yazmaz. Değişikliklerini hazır olduğunda uygula.",
                          "Selecting does not write to your mouse. Apply your changes when ready.",
                        )}
                      </p>
                    </div>
                    <span className="subtle-tag">
                      {t("AKTİF", "ACTIVE")}: {draft.activeStage + 1}
                    </span>
                  </div>
                  {stageTiles}
                </Card>
                <Card
                  eyebrow={`${t("KADEME", "STAGE")} ${String(editor + 1).padStart(2, "0")}`}
                  title={t(
                    "İnce ayar, tam kararında.",
                    "Fine-tuned to feel right.",
                  )}
                >
                  <Setting
                    title={t("Etkin kademe", "Active stage")}
                    text={t(
                      "Farenin şu anda kullanacağı hassasiyet.",
                      "The sensitivity your mouse will use.",
                    )}
                  >
                    <button
                      className={`button ${draft.activeStage === editor ? "soft" : "secondary"} small`}
                      onClick={() =>
                        mutate((s) => {
                          s.stages[editor]!.enabled = true;
                          s.activeStage = editor;
                        })
                      }
                    >
                      {draft.activeStage === editor ? (
                        <>
                          <Check size={15} />
                          {t("Etkin", "Active")}
                        </>
                      ) : (
                        t("Bu kademeyi etkinleştir", "Activate this stage")
                      )}
                    </button>
                  </Setting>
                  <Setting
                    title={t(
                      "DPI düğmesi döngüsüne dahil et",
                      "Include in DPI button cycle",
                    )}
                  >
                    <Toggle
                      checked={stage.enabled}
                      disabled={draft.activeStage === editor}
                      label={t(
                        "Kademeyi döngüye dahil et",
                        "Include stage in cycle",
                      )}
                      onChange={(v) =>
                        mutate((s) => {
                          s.stages[editor]!.enabled = v;
                        })
                      }
                    />
                  </Setting>
                  <Setting
                    title={t(
                      "X / Y eksenlerini ayrı ayarla",
                      "Separate X / Y sensitivity",
                    )}
                    text={t(
                      "Yatay ve dikey hareket için farklı değerler kullan.",
                      "Use different values for horizontal and vertical movement.",
                    )}
                  >
                    <Toggle
                      checked={stage.separate}
                      label={t("Eksenleri ayrı ayarla", "Separate axes")}
                      onChange={(v) =>
                        mutate((s) => {
                          s.stages[editor]!.separate = v;
                          if (!v) s.stages[editor]!.y = s.stages[editor]!.x;
                        })
                      }
                    />
                  </Setting>
                  <div className="dpi-editor">
                    {(stage.separate
                      ? (["x", "y"] as const)
                      : (["x"] as const)
                    ).map((axis) => (
                      <div className="axis-editor" key={axis}>
                        <div className="range-heading">
                          <label htmlFor={`dpi-${axis}`}>
                            {stage.separate
                              ? `${axis.toUpperCase()} ${t("ekseni", "axis")}`
                              : t("Hassasiyet", "Sensitivity")}
                          </label>
                          <Numeric
                            label={
                              stage.separate
                                ? `${axis.toUpperCase()} DPI`
                                : "DPI"
                            }
                            value={stage[axis]}
                            min={100}
                            max={42000}
                            step={50}
                            unit="DPI"
                            onChange={(v) =>
                              mutate((s) => {
                                s.stages[editor]![axis] = v;
                                if (!s.stages[editor]!.separate)
                                  s.stages[editor]!.y = v;
                              })
                            }
                          />
                        </div>
                        <input
                          id={`dpi-${axis}`}
                          type="range"
                          min={100}
                          max={42000}
                          step={50}
                          value={
                            Number.isFinite(stage[axis]) ? stage[axis] : 100
                          }
                          onChange={(e) =>
                            mutate((s) => {
                              s.stages[editor]![axis] = Number(e.target.value);
                              if (!s.stages[editor]!.separate)
                                s.stages[editor]!.y = Number(e.target.value);
                            })
                          }
                        />
                        <div className="range-ticks">
                          <span>100 DPI</span>
                          <span>42.000 DPI</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Setting
                    title={t("Kademe rengi", "Stage color")}
                    text={t(
                      "DPI göstergesinin bu kademedeki rengi.",
                      "DPI indicator color for this stage.",
                    )}
                  >
                    <div className="color-field">
                      <span>{colorHex(stage.color).toUpperCase()}</span>
                      <input
                        type="color"
                        aria-label={t("Kademe rengi", "Stage color")}
                        value={colorHex(stage.color)}
                        onChange={(e) =>
                          mutate((s) => {
                            s.stages[editor]!.color = hexColor(e.target.value);
                          })
                        }
                      />
                    </div>
                  </Setting>
                </Card>
              </>
            )}

            {tab === "performance" && (
              <>
                <Card
                  eyebrow={t("HIZ VE TEPKİ", "SPEED & RESPONSE")}
                  title={t(
                    "Her milisaniye sayılır.",
                    "Every millisecond counts.",
                  )}
                >
                  <div className="rate-heading">
                    <div>
                      <h3>{t("Raporlama hızı", "Polling rate")}</h3>
                      <p>
                        {t(
                          "Farenin bilgisayara saniyede kaç kez veri gönderdiği.",
                          "How often your mouse sends data to your computer.",
                        )}
                      </p>
                    </div>
                    <span className="mini-pill">
                      {snapshot.wireless ? "2.4 GHz" : "USB"}
                    </span>
                  </div>
                  <Choices
                    label={t("Raporlama hızı", "Polling rate")}
                    value={draft[rateKey]}
                    items={RATES.map((r, i) => [i, `${r} Hz`] as const)}
                    onChange={(v) =>
                      mutate((s) => {
                        s[rateKey] = v;
                      })
                    }
                  />
                  <p className="field-note">
                    {t(
                      "Yüksek raporlama hızı pil tüketimini ve işlemci yükünü artırabilir. Kablolu ve kablosuz ayarlar ayrı saklanır.",
                      "Higher polling rates can increase battery use and CPU load. Wired and wireless rates are stored separately.",
                    )}
                  </p>
                </Card>
                <Card title={t("Sensör davranışı", "Sensor behavior")}>
                  <Setting
                    title="Motion Sync"
                    text={t(
                      "Sensör okumalarını raporlama zamanıyla eşleştirir.",
                      "Synchronizes sensor readings with report timing.",
                    )}
                  >
                    <Toggle
                      checked={draft.motionSync}
                      label="Motion Sync"
                      onChange={(v) =>
                        mutate((s) => {
                          s.motionSync = v;
                        })
                      }
                    />
                  </Setting>
                  <Setting
                    title={t("Açı düzeltme", "Angle snapping")}
                    text={t(
                      "Hafif çapraz hareketleri daha düz çizgilere dönüştürür.",
                      "Straightens slightly diagonal movement.",
                    )}
                  >
                    <Toggle
                      checked={draft.angleSnap}
                      label={t("Açı düzeltme", "Angle snapping")}
                      onChange={(v) =>
                        mutate((s) => {
                          s.angleSnap = v;
                        })
                      }
                    />
                  </Setting>
                  <Setting
                    title={t(
                      "Kalkış mesafesi (LOD)",
                      "Lift-off distance (LOD)",
                    )}
                    text={t(
                      "Fareyi kaldırdığında sensörün izlemeyi bıraktığı yükseklik.",
                      "Height at which tracking stops when the mouse is lifted.",
                    )}
                  >
                    <Choices
                      value={draft.lod}
                      label="LOD"
                      items={[
                        [0, "1 mm"],
                        [1, "2 mm"],
                      ]}
                      onChange={(v) =>
                        mutate((s) => {
                          s.lod = v;
                        })
                      }
                    />
                  </Setting>
                  <Setting
                    title={t("Sensör dönüş açısı", "Sensor rotation")}
                    text={t(
                      "Fareyi tutuş açına göre hareket yönünü ayarla.",
                      "Compensate for the angle of your grip.",
                    )}
                  >
                    <Numeric
                      label={t("Sensör dönüş açısı", "Sensor rotation")}
                      min={-30}
                      max={30}
                      value={draft.rotation}
                      unit="°"
                      onChange={(v) =>
                        mutate((s) => {
                          s.rotation = v;
                        })
                      }
                    />
                  </Setting>
                </Card>
                <Card title={t("Tıklama ve güç", "Clicks & power")}>
                  <Setting
                    title={t("Tıklama gecikmesi", "Click debounce")}
                    text={t(
                      "İstenmeyen çift tıklamaları azaltmak için gecikmeyi artırabilirsin.",
                      "Increase delay to reduce accidental double clicks.",
                    )}
                  >
                    <select
                      aria-label={t("Tıklama gecikmesi", "Click debounce")}
                      value={draft.debounce}
                      onChange={(e) =>
                        mutate((s) => {
                          s.debounce = Number(e.target.value);
                        })
                      }
                    >
                      {!DEBOUNCE.includes(
                        draft.debounce as (typeof DEBOUNCE)[number],
                      ) && (
                        <option value={draft.debounce}>
                          {draft.debounce} ms
                        </option>
                      )}
                      {DEBOUNCE.map((v) => (
                        <option key={v} value={v}>
                          {v} ms
                        </option>
                      ))}
                    </select>
                  </Setting>
                  <Setting
                    title={t("Uyku süresi", "Sleep timeout")}
                    text={t(
                      "Kullanılmadığında farenin uykuya geçeceği süre.",
                      "Idle time before your mouse goes to sleep.",
                    )}
                  >
                    <select
                      aria-label={t("Uyku süresi", "Sleep timeout")}
                      value={draft.sleep}
                      onChange={(e) =>
                        mutate((s) => {
                          s.sleep = Number(e.target.value);
                        })
                      }
                    >
                      {!SLEEP.includes(
                        draft.sleep as (typeof SLEEP)[number],
                      ) && <option value={draft.sleep}>{draft.sleep} s</option>}
                      {SLEEP.map((v) => (
                        <option key={v} value={v}>
                          {v / 60} {t("dakika", "minutes")}
                        </option>
                      ))}
                    </select>
                  </Setting>
                </Card>
              </>
            )}

            {tab === "lighting" && (
              <>
                {![0, 1, 2, 11].includes(snapshot.configId) ? (
                  <Card
                    eyebrow={t("KENDİ RENGİNİ BUL", "FIND YOUR COLOR")}
                    title={t("Işıklar sana uysun.", "Make the light yours.")}
                  >
                    <Setting title={t("Aydınlatma efekti", "Lighting effect")}>
                      <select
                        aria-label={t("Aydınlatma efekti", "Lighting effect")}
                        value={draft.lighting.mode}
                        onChange={(e) =>
                          mutate((s) => {
                            s.lighting.mode = Number(e.target.value);
                            s.lighting.colorful = [3, 4].includes(
                              s.lighting.mode,
                            );
                            if (![1, 2].includes(s.lighting.direction))
                              s.lighting.direction = 1;
                          })
                        }
                      >
                        {[
                          t("Sabit", "Static"),
                          t("Nefes", "Breathing"),
                          t("Yanıp sönme", "Blink"),
                          t("Spektrum", "Spectrum"),
                          t("Dalga", "Wave"),
                          t("Kapalı", "Off"),
                        ].map((name, i) => (
                          <option key={i} value={i}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </Setting>
                    <Setting title={t("Renk", "Color")}>
                      <div className="color-field">
                        <span>
                          {colorHex(draft.lighting.color).toUpperCase()}
                        </span>
                        <input
                          type="color"
                          aria-label={t("Aydınlatma rengi", "Lighting color")}
                          disabled={[3, 4, 5].includes(draft.lighting.mode)}
                          value={colorHex(draft.lighting.color)}
                          onChange={(e) =>
                            mutate((s) => {
                              s.lighting.color = hexColor(e.target.value);
                            })
                          }
                        />
                      </div>
                    </Setting>
                    <Setting title={t("Parlaklık", "Brightness")}>
                      <Level
                        t={t}
                        label={t("Gövde parlaklığı", "Body brightness")}
                        max={4}
                        value={draft.lighting.brightness}
                        onChange={(v) =>
                          mutate((s) => {
                            s.lighting.brightness = v;
                          })
                        }
                      />
                    </Setting>
                    <Setting title={t("Efekt hızı", "Effect speed")}>
                      <Level
                        t={t}
                        label={t("Gövde efekt hızı", "Body effect speed")}
                        max={4}
                        value={draft.lighting.speed}
                        onChange={(v) =>
                          mutate((s) => {
                            s.lighting.speed = v;
                          })
                        }
                      />
                    </Setting>
                    {draft.lighting.mode === 4 && (
                      <Setting title={t("Yön", "Direction")}>
                        <Choices
                          label={t("Dalga yönü", "Wave direction")}
                          value={draft.lighting.direction}
                          items={[
                            [1, t("İleri", "Forward")],
                            [2, t("Geri", "Reverse")],
                          ]}
                          onChange={(v) =>
                            mutate((s) => {
                              s.lighting.direction = v;
                            })
                          }
                        />
                      </Setting>
                    )}
                  </Card>
                ) : (
                  <div className="connect-hint">
                    <Lightbulb size={18} />
                    {t(
                      "Bu modelde gövde aydınlatması bulunmuyor.",
                      "This model has no body lighting.",
                    )}
                  </div>
                )}
                <Card title={t("DPI göstergesi", "DPI indicator")}>
                  <Setting title={t("Gösterge efekti", "Indicator effect")}>
                    <select
                      aria-label={t("Gösterge efekti", "Indicator effect")}
                      value={draft.dpiLighting.mode}
                      onChange={(e) =>
                        mutate((s) => {
                          s.dpiLighting.mode = Number(e.target.value);
                        })
                      }
                    >
                      {[
                        t("Kapalı", "Off"),
                        t("Sabit", "Static"),
                        t("Nefes", "Breathing"),
                      ].map((name, i) => (
                        <option key={i} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Setting>
                  <Setting title={t("Parlaklık", "Brightness")}>
                    <Level
                      t={t}
                      label={t(
                        "DPI gösterge parlaklığı",
                        "DPI indicator brightness",
                      )}
                      value={draft.dpiLighting.brightness}
                      max={2}
                      onChange={(v) =>
                        mutate((s) => {
                          s.dpiLighting.brightness = v;
                        })
                      }
                    />
                  </Setting>
                  <Setting title={t("Efekt hızı", "Effect speed")}>
                    <Level
                      t={t}
                      label={t("DPI gösterge hızı", "DPI indicator speed")}
                      value={draft.dpiLighting.speed}
                      max={2}
                      onChange={(v) =>
                        mutate((s) => {
                          s.dpiLighting.speed = v;
                        })
                      }
                    />
                  </Setting>
                </Card>
              </>
            )}
          </fieldset>

          {tab === "device" && (
            <>
              <div className="device-info-grid">
                <Card
                  eyebrow={t("BAĞLANTI", "CONNECTION")}
                  title={
                    ready
                      ? snapshot.model
                      : t("Bir fare bağla", "Connect a mouse")
                  }
                >
                  <div className="device-detail">
                    <span>{t("Bağlantı türü", "Connection")}</span>
                    <strong>
                      {ready
                        ? snapshot.wireless
                          ? "2.4 GHz / USB Dongle"
                          : "USB"
                        : "—"}
                    </strong>
                  </div>
                  <div className="device-detail">
                    <span>{t("Pil seviyesi", "Battery")}</span>
                    <strong>
                      {ready && snapshot.battery !== null
                        ? `${snapshot.battery}%`
                        : "—"}
                    </strong>
                  </div>
                  <div className="device-detail">
                    <span>{t("Durum", "Status")}</span>
                    <strong>
                      {mode === "demo"
                        ? t("Örnek cihaz", "Simulated device")
                        : ready
                          ? t("Bağlı", "Connected")
                          : t("Bağlı değil", "Disconnected")}
                    </strong>
                  </div>
                </Card>
                <Card
                  eyebrow={t(
                    "AYARLARININ BİR KOPYASI",
                    "A COPY OF YOUR SETTINGS",
                  )}
                  title={t(
                    "Küçük bir yedek, büyük rahatlık.",
                    "A little backup, peace of mind.",
                  )}
                >
                  <p className="backup-text">
                    {t(
                      "Kaydedilmiş ayarlarını JSON dosyası olarak indir. İlk yazmadan önceki ayarların da bu tarayıcıda ayrıca saklanır.",
                      "Download your saved settings as a JSON file. Your settings before the first write are also kept in this browser.",
                    )}
                  </p>
                  <div className="backup-buttons">
                    <button
                      className="button primary small"
                      disabled={!ready || busy}
                      onClick={() => downloadBackup(snapshot)}
                    >
                      <ArrowDownToLine size={16} />
                      {t("Güncel ayarları indir", "Download current settings")}
                    </button>
                    <button
                      className="button secondary small"
                      disabled={mode !== "device" || busy}
                      onClick={() => {
                        try {
                          downloadBackup(snapshot, true);
                        } catch {
                          setError("BACKUP_FAILED");
                        }
                      }}
                    >
                      <ArrowDownToLine size={16} />
                      {t("İlk yedeği indir", "Download original backup")}
                    </button>
                  </div>
                </Card>
              </div>
              <Card
                title={t(
                  "Birlikte daha çok cihaza.",
                  "More devices, together.",
                )}
              >
                <p className="compatibility-intro">
                  {t(
                    "V9 Ultra+ gerçek cihazla test edildi. Listelenen diğer modeller için protokol desteği mevcut; tüm varyantlar henüz donanımda doğrulanmadı.",
                    "V9 Ultra+ has been tested on real hardware. The protocol supports the other listed models; every variant has not yet been hardware-verified.",
                  )}
                </p>
                <div className="compatibility-row">
                  <strong>AULA V9 Ultra+</strong>
                  <span className="verified-badge">
                    <CheckCheck size={14} />
                    {t("Donanımda doğrulandı", "Hardware verified")}
                  </span>
                </div>
                <div className="compatibility-row">
                  <strong>V9 / V9+ / Pro / Pro+ / Ultra / Max / Max+</strong>
                  <span>{t("Protokol desteği", "Protocol support")}</span>
                </div>
                <div className="compatibility-row">
                  <strong>X9 / X9 Pro / X9 Ultra / X9 Max</strong>
                  <span>{t("Protokol desteği", "Protocol support")}</span>
                </div>
                <div className="compatibility-row">
                  <strong>AULA 8K / 2.4G Dongle</strong>
                  <span>USB / 2.4 GHz</span>
                </div>
                <div className="project-note">
                  <Github size={20} />
                  <div>
                    <strong>
                      {t(
                        "Açık kaynak. Toplulukla daha iyi.",
                        "Open source. Better together.",
                      )}
                    </strong>
                    <p>
                      {t(
                        "Cihazını test et, bulgularını paylaş, geliştirmeye katıl. Aulaar’ın Evision protokolü temel alınmıştır. Tuş atamaları ve makrolar bu sürümde bulunmuyor.",
                        "Test your device, share findings, contribute. Based on Aulaar’s Evision protocol. Button mapping and macros are not available in this release.",
                      )}
                    </p>
                  </div>
                  <a
                    className="icon-button"
                    href={GITHUB}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="GitHub"
                  >
                    <ArrowRight size={18} />
                  </a>
                </div>
              </Card>
            </>
          )}

          {pending > 0 && ready && (
            <div className="apply-bar">
              <div>
                <span className="apply-dot" />
                <strong>
                  {t("Değişikliklerin hazır.", "Your changes are ready.")}
                </strong>
                <p>
                  {invalid.length
                    ? message("INVALID_VALUE")
                    : mode === "demo"
                      ? t(
                          "Demo cihazına uygulanacak.",
                          "These will update the demo device.",
                        )
                      : t(
                          "Uyguladığında fareye kaydedilir.",
                          "Apply to save them to your mouse.",
                        )}
                </p>
              </div>
              <div className="apply-actions">
                <button
                  className="button secondary small"
                  disabled={busy}
                  onClick={() => setDraft(structuredClone(snapshot.settings))}
                >
                  {t("Vazgeç", "Discard")}
                </button>
                <button
                  className="button primary small"
                  disabled={busy || invalid.length > 0}
                  onClick={() => void apply()}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}{" "}
                  {t("Uygula", "Apply")}
                </button>
              </div>
            </div>
          )}
          <footer className="footer">
            <span>
              <span className="footer-logo">A</span>AULA CONTROL
              <span className="footer-dash">/</span>
              {t(
                "Topluluk tarafından, senin için.",
                "By the community, for you.",
              )}
            </span>
            <span>
              {t(
                "Bağımsız proje. AULA ile bağlantılı değildir.",
                "Independent project. Not affiliated with AULA.",
              )}
              <span className="footer-dot" />
              <span>GPL-2.0+</span>
            </span>
          </footer>
        </main>
      </div>
      {help && <Help t={t} onClose={() => setHelp(false)} />}
    </div>
  );
}
