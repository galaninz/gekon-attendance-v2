import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import * as Localization from "expo-localization";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const API_URL =
  "https://script.google.com/macros/s/AKfycbz0fjpzP6KOn_0mPkz5zTJfTQbLmIrY6ZwvhFT4dBP-6t-kJLyM6DO_eneJDYH7a--l3A/exec";
const APP_KEY = "ZAK_ATT_2026_demo";

const LOGO = require("../../assets/gekon.png");

const STORE = {
  deviceId: "deviceId",
  name: "name",
  lang: "lang",
};

type Lang = "en" | "es";
type Site = { id: string; name: string; lat: number; lon: number; radiusM: number };
type Loc = { latitude: number; longitude: number; accuracy: number | null };
type Employee = {
  employeeId: string;
  code: string;
  name: string;
  status: string;
  oshaExpiryISO: string;
  oshaExpired: boolean;
  oshaApproved: boolean;
  attestedToday: boolean;
  oshaCardFileId: string;
};
type MeResponse = {
  ok: boolean;
  employee: Employee;
  todayISO: string;
  serverNowISO: string;
  todayMs: number;
  clockedIn: boolean;
  openInISO: string;
  currentSiteName?: string;
  error?: string;
  distanceM?: number;
  radiusM?: number;
  inZone?: boolean;
};

type PhotoPayload = { base64: string; mime: string; previewUri: string };

const MAX_OUT_PHOTOS = 3;

const C = {
  navy: "#0B1B3B",
  blue: "#2D5BFF",
  bg1: "#F7F9FF",
  bg2: "#FFFFFF",
  text: "#0B1320",
  muted: "#5B6475",
  border: "#E5E8F0",
  success: "#1E9E5A",
  warn: "#F5A524",
  danger: "#E5484D",
};

const STR: Record<Lang, Record<string, string>> = {
  en: {
    appName: "GEKON Attendance",
    welcome: "Welcome",
    enterOnce: "Enter your name once. Next time we won’t ask.",
    yourName: "Your name",
    continue: "Continue",
    language: "Language",
    english: "English",
    spanish: "Español",

    statusReady: "Ready to work",
    statusBlocked: "Blocked",
    refresh: "Refresh",
    site: "Site",
    reloadSites: "Reload sites",
    otherSite: "Other / New site…",
    otherSiteHint: "request + custom log",
    newSiteName: "New site name",
    radius: "Radius (m)",
    sendRequest: "Send request to admin",

    in: "I’m IN",
    out: "I’m OUT",
    outTitle: "Before OUT",
    outNote: "What did you do today? (min 2 words)",
    outNotePh: "Installed baseboards, demo…",
    takePhoto: "Take photo",
    cancel: "Cancel",
    submitOut: "Submit OUT",

    todayTime: "Today",
    onSiteTime: "On site",

    osha: "OSHA",
    att: "Attestation",
    ok: "OK",
    pending: "Pending",
    expired: "Expired",
    needed: "Needed",
    done: "Done",

    oshaTitle: "OSHA verification required",
    oshaExplain: "You cannot check IN/OUT until OSHA is valid and approved by admin.",
    expiry: "OSHA expiry (YYYY-MM-DD)",
    uploadOSHA: "Upload OSHA",
    uploaded: "OSHA uploaded. Waiting for admin approval.",

    attestTitle: "Daily Safety Attestation",
    attVideoBtn: "▶  Watch OSHA Safety Video",
    attRulesBtn: "📋  View OSHA Site Safety Rules",
    attest1: "I watched the OSHA safety video and/or reviewed the site safety rules before starting work today.",
    attest2: "I am NOT under the influence of alcohol, drugs, or any substance that impairs my judgment or physical ability.",
    attest3: "I have inspected my PPE (hard hat, gloves, boots, vest, eye protection) — it is in good condition and I will wear it at all times on site.",
    attest4: "I have no pre-existing injuries that could be aggravated by today’s work. If I do, I have reported them to my supervisor BEFORE starting.",
    attest5: "I understand that falsifying this attestation is grounds for immediate termination and may result in forfeiture of workers’ compensation benefits.",
    signature: "Signature (type your name)",
    submitAtt: "Submit attestation",
    attDone: "Daily attestation recorded.",

    blockedNotInit: "Not initialized",
    blockedInactive: "Inactive",
    blockedOshaExpired: "OSHA expired/missing",
    blockedOshaPending: "OSHA pending admin approval",
    blockedAtt: "Daily attestation required",

    outNeedNote: "Write at least 2 words about what you did today.",
    outNeedPhoto: "At least 1 photo is required for OUT (camera only).",

    gpsError: "GPS error",
    permNeeded: "Permission needed",
    allowCamera: "Allow camera access.",

    success: "Success",
    working: "Working…",
    emergencyOut: "Emergency OUT",
    emergencyOutTitle: "Emergency Clock-Out",
    emergencyOutExplain: "Use only if you forgot to clock out on site. Your current time will be recorded. Your supervisor will review and may adjust this entry.",
    emergencyOutConfirm: "Yes, Emergency OUT",
    footer: "Designed by zakhargalan.in © 2026",
  },
  es: {
    appName: "Asistencia GEKON",
    welcome: "Bienvenido",
    enterOnce: "Escribe tu nombre una sola vez. La próxima vez no lo pediremos.",
    yourName: "Tu nombre",
    continue: "Continuar",
    language: "Idioma",
    english: "English",
    spanish: "Español",

    statusReady: "Listo para trabajar",
    statusBlocked: "Bloqueado",
    refresh: "Actualizar",
    site: "Obra",
    reloadSites: "Recargar obras",
    otherSite: "Otra / Nueva obra…",
    otherSiteHint: "solicitud + registro",
    newSiteName: "Nombre de la obra",
    radius: "Radio (m)",
    sendRequest: "Enviar solicitud al admin",

    in: "Estoy DENTRO",
    out: "Estoy FUERA",
    outTitle: "Antes de SALIR",
    outNote: "¿Qué hiciste hoy? (mín. 2 palabras)",
    outNotePh: "Instalé zócalos, demo…",
    takePhoto: "Tomar foto",
    cancel: "Cancelar",
    submitOut: "Enviar SALIDA",

    todayTime: "Hoy",
    onSiteTime: "En obra",

    osha: "OSHA",
    att: "Declaración",
    ok: "OK",
    pending: "Pendiente",
    expired: "Vencido",
    needed: "Falta",
    done: "Hecho",

    oshaTitle: "Verificación OSHA requerida",
    oshaExplain: "No puedes marcar IN/OUT hasta que OSHA sea válido y aprobado por el admin.",
    expiry: "Vencimiento OSHA (YYYY-MM-DD)",
    uploadOSHA: "Subir OSHA",
    uploaded: "OSHA subido. Esperando aprobación del admin.",

    attestTitle: "Declaración diaria de seguridad",
    attVideoBtn: "▶  Ver Video de Seguridad OSHA",
    attRulesBtn: "📋  Ver Reglas de Seguridad OSHA",
    attest1: "Vi el video de seguridad OSHA y/o revisé las reglas del sitio antes de comenzar a trabajar hoy.",
    attest2: "NO estoy bajo la influencia de alcohol, drogas ni ninguna sustancia que afecte mi juicio o capacidad física.",
    attest3: "Inspeccioné mi EPP (casco, guantes, botas, chaleco, protección ocular) — está en buen estado y lo usaré en todo momento.",
    attest4: "No tengo lesiones preexistentes que puedan agravarse con el trabajo de hoy. Si las tengo, las he reportado a mi supervisor ANTES de comenzar.",
    attest5: "Entiendo que falsificar esta declaración es motivo de despido inmediato y puede resultar en la pérdida de beneficios de compensación laboral.",
    signature: "Firma (escribe tu nombre)",
    submitAtt: "Enviar declaración",
    attDone: "Declaración diaria registrada.",

    blockedNotInit: "No inicializado",
    blockedInactive: "Inactivo",
    blockedOshaExpired: "OSHA vencido/falta",
    blockedOshaPending: "OSHA pendiente de aprobación",
    blockedAtt: "Falta la declaración diaria",

    outNeedNote: "Escribe al menos 2 palabras sobre lo que hiciste hoy.",
    outNeedPhoto: "Se requiere al menos 1 foto para SALIDA (solo cámara).",

    gpsError: "Error GPS",
    permNeeded: "Permiso requerido",
    allowCamera: "Permite acceso a la cámara.",

    success: "Éxito",
    working: "Procesando…",
    emergencyOut: "SALIDA de emergencia",
    emergencyOutTitle: "Salida de emergencia",
    emergencyOutExplain: "Usar solo si olvidaste marcar salida en el sitio. Se registrará la hora actual. Tu supervisor revisará esta entrada.",
    emergencyOutConfirm: "Sí, Salida de emergencia",
    footer: "Designed by zakhargalan.in © 2026",
  },
};

function sysLangDefault(): Lang {
  const locales = Localization.getLocales?.() || [];
  const code = locales[0]?.languageCode?.toLowerCase();
  return code === "es" ? "es" : "en";
}

function genDeviceId() {
  return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function fmtDist(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 1000) return `${Math.round(feet)} ft`;
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

async function sget(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}
async function sset(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {}
}

function fmtHhMm(ms: number) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}
function fmtHhMmSs(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

async function takeAndCompressPhoto(t: (k: string) => string): Promise<PhotoPayload | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(t("permNeeded"), t("allowCamera"));
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 1 });
  if (result.canceled) return null;

  const uri = result.assets?.[0]?.uri;
  if (!uri) return null;

  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1400 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  const b64 = await FileSystem.readAsStringAsync(manipulated.uri, { encoding: FileSystem.EncodingType.Base64 });
  return { base64: b64, mime: "image/jpeg", previewUri: manipulated.uri };
}

export default function Index() {
  const [lang, setLang] = useState<Lang>(sysLangDefault());
  const t = useCallback((k: string) => STR[lang][k] || STR.en[k] || k, [lang]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [employee, setEmployee] = useState<Employee | null>(null);

  const [oshaExpiryISO, setOshaExpiryISO] = useState("");
  const [oshaPhoto, setOshaPhoto] = useState<PhotoPayload | null>(null);

  const [attSig, setAttSig] = useState("");
  const [att1, setAtt1] = useState(false);
  const [att2, setAtt2] = useState(false);
  const [att3, setAtt3] = useState(false);
  const [att4, setAtt4] = useState(false);
  const [att5, setAtt5] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [sitePickerOpen, setSitePickerOpen] = useState(false);

  const [useOther, setUseOther] = useState(false);
  const [otherSiteName, setOtherSiteName] = useState("");
  const [otherRadiusM, setOtherRadiusM] = useState("120");

  const [loc, setLoc] = useState<Loc | null>(null);
  const [distMap, setDistMap] = useState<Record<string, number>>({});
  const [autoSortedOnce, setAutoSortedOnce] = useState(false);

  const [outPanel, setOutPanel] = useState(false);
  const [outNote, setOutNote] = useState("");
  const [outPhotos, setOutPhotos] = useState<PhotoPayload[]>([]);

  // Timer fields
  const [todayMsBase, setTodayMsBase] = useState(0);
  const [serverNowBaseMs, setServerNowBaseMs] = useState(0);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clockedIn, setClockedIn] = useState(false);
  const [openInISO, setOpenInISO] = useState<string>("");
  const [currentSiteName, setCurrentSiteName] = useState("");

  const [todayMsLive, setTodayMsLive] = useState(0);
  const [onSiteMsLive, setOnSiteMsLive] = useState(0);

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteId) || null, [sites, siteId]);

  const sortedSites = useMemo(() => {
    const arr = [...sites];
    arr.sort((a, b) => (distMap[a.id] ?? 9e15) - (distMap[b.id] ?? 9e15));
    return arr;
  }, [sites, distMap]);

  useEffect(() => {
    (async () => {
      // ① Read local storage instantly (no network)
      const [savedLang, savedDeviceId, savedName] = await Promise.all([
        sget(STORE.lang),
        sget(STORE.deviceId),
        sget(STORE.name),
      ]);

      if (savedLang === "en" || savedLang === "es") setLang(savedLang as Lang);

      let did = savedDeviceId || "";
      if (!did) {
        did = genDeviceId();
        await sset(STORE.deviceId, did);
      }
      setDeviceId(did);

      const savedNameStr = savedName || "";
      if (savedNameStr) {
        setName(savedNameStr);
        setNameSaved(true);
      }

      // ② Show UI immediately — no spinner waiting for network
      setLoading(false);

      // ③ Network calls in background — non-blocking
      try { await loadSites(); } catch {}

      if (savedNameStr) {
        try {
          await initOnServer(did, savedNameStr);
          await loadMe(did);
        } catch {}
      }
    })();
  }, []);

  useEffect(() => {
    if (!nameSaved) return;
    if (!sites.length) return;
    if (autoSortedOnce) return;
    refreshDistances().finally(() => setAutoSortedOnce(true));
  }, [nameSaved, sites.length, autoSortedOnce]);

  // real-time ticking
  useEffect(() => {
    setTodayMsLive(todayMsBase);
    setOnSiteMsLive(0);

    const id = setInterval(() => {
      const nowServer = Date.now() + serverOffsetMs;

      // Today ticks only when clocked in
      if (clockedIn) {
        const extra = Math.max(0, nowServer - serverNowBaseMs);
        setTodayMsLive(todayMsBase + extra);

        if (openInISO) {
          const inMs = Date.parse(openInISO);
          setOnSiteMsLive(Math.max(0, nowServer - inMs));
        }
      } else {
        setTodayMsLive(todayMsBase);
        setOnSiteMsLive(0);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [todayMsBase, clockedIn, serverOffsetMs, serverNowBaseMs, openInISO]);

  async function loadSites() {
    const url = `${API_URL}?action=sites&appKey=${encodeURIComponent(APP_KEY)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Sites load failed");
    setSites(data.sites || []);
    if (!siteId && data.sites?.[0]?.id) setSiteId(data.sites[0].id);
  }

  async function initOnServer(did: string, nm: string) {
    const body = { action: "init", appKey: APP_KEY, deviceId: did, name: nm };
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: MeResponse = await res.json();
    if (!data?.ok) throw new Error(String(data?.error || "Init failed"));
  }

  function applyMe(data: MeResponse) {
    setEmployee(data.employee);
    if (data.employee?.oshaExpiryISO) setOshaExpiryISO(String(data.employee.oshaExpiryISO));

    const serverNowISO = String(data.serverNowISO || new Date().toISOString());
    const serverNowMs = Date.parse(serverNowISO);
    const offset = serverNowMs - Date.now();

    setServerOffsetMs(offset);
    setServerNowBaseMs(serverNowMs);

    setTodayMsBase(Number(data.todayMs || 0));
    setClockedIn(!!data.clockedIn);
    setOpenInISO(String(data.openInISO || ""));
    setCurrentSiteName(String((data as any).currentSiteName || ""));

    setTodayMsLive(Number(data.todayMs || 0));
  }

  async function loadMe(did: string) {
    const url = `${API_URL}?action=me&appKey=${encodeURIComponent(APP_KEY)}&deviceId=${encodeURIComponent(did)}`;
    const res = await fetch(url);
    const data: MeResponse = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Me load failed");
    applyMe(data);
  }

  async function requestLocationOnce(): Promise<Loc> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Location permission not granted");
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const { latitude, longitude, accuracy } = pos.coords;
    return { latitude, longitude, accuracy: accuracy ?? null };
  }

  async function refreshDistances() {
    try {
      const current = await requestLocationOnce();
      setLoc(current);
      const next: Record<string, number> = {};
      for (const s of sites) next[s.id] = haversineMeters(current.latitude, current.longitude, s.lat, s.lon);
      setDistMap(next);
    } catch (e: any) {
      Alert.alert(t("gpsError"), String(e?.message || e));
    }
  }

  function gateReason() {
    if (!employee) return t("blockedNotInit");
    if ((employee.status || "ACTIVE").toUpperCase() !== "ACTIVE") return t("blockedInactive");
    if (employee.oshaExpired) return t("blockedOshaExpired");
    if (!employee.oshaApproved) return t("blockedOshaPending");
    if (!employee.attestedToday) return t("blockedAtt");
    return "";
  }
  const ready = gateReason() === "";

  async function saveNameOnce() {
    const nm = name.trim();
    if (nm.length < 2) return;

    setBusy(true);
    try {
      await sset(STORE.name, nm);
      await sset(STORE.lang, lang);
      setNameSaved(true);

      await initOnServer(deviceId, nm);
      await loadMe(deviceId);

      await refreshDistances();
      setAutoSortedOnce(true);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitOsha() {
    if (!isISODate(oshaExpiryISO)) return;
    if (!oshaPhoto) return;

    setBusy(true);
    try {
      const body = {
        action: "register_osha",
        appKey: APP_KEY,
        deviceId,
        name: name.trim(),
        oshaExpiryISO: oshaExpiryISO.trim(),
        oshaPhotoBase64: oshaPhoto.base64,
        oshaPhotoMime: oshaPhoto.mime,
      };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: MeResponse = await res.json();
      if (!data?.ok) throw new Error(data?.error || "OSHA upload failed");
      setOshaPhoto(null);
      applyMe(data);
      await loadMe(deviceId);
      Alert.alert(t("success"), t("uploaded"));
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitAttestation() {
    const allChecked = att1 && att2 && att3 && att4 && att5;
    if (!allChecked) return;
    const sig = attSig.trim();
    if (!sig) return;

    setBusy(true);
    try {
      const body = {
        action: "attest",
        appKey: APP_KEY,
        deviceId,
        name: name.trim(),
        signature: sig,
        statements: { watchedSafetyVideo: att1, notUnderInfluence: att2, ppeInspected: att3, noPreExistingInjuries: att4, understoodConsequences: att5 },
        device: { platform: Platform.OS, deviceTimeISO: new Date().toISOString() },
      };
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: MeResponse = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Attestation failed");

      setAttSig("");
      setAtt1(false);
      setAtt2(false);
      setAtt3(false);
      setAtt4(false);
      setAtt5(false);

      applyMe(data);
      await loadMe(deviceId);
      Alert.alert(t("success"), t("attDone"));
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function requestOtherSite() {
    const nm = otherSiteName.trim();
    const rad = Number(otherRadiusM || 120);
    if (!nm || !isFinite(rad) || rad <= 0) return;

    setBusy(true);
    try {
      const current = await requestLocationOnce();
      setLoc(current);

      const body = {
        action: "site_request",
        appKey: APP_KEY,
        deviceId,
        name: name.trim(),
        siteName: nm,
        lat: current.latitude,
        lon: current.longitude,
        radiusM: rad,
        device: { platform: Platform.OS, deviceTimeISO: new Date().toISOString() },
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: MeResponse = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Site request failed");
      Alert.alert(t("success"), "Sent");
      applyMe(data);
      await loadMe(deviceId);
      setUseOther(true);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function addOutPhoto() {
    if (outPhotos.length >= MAX_OUT_PHOTOS) return;
    const p = await takeAndCompressPhoto(t);
    if (!p) return;
    setOutPhotos((prev) => [...prev, p]);
  }

  async function sendEvent(type: "IN" | "OUT") {
    if (!ready) {
      Alert.alert(t("statusBlocked"), gateReason());
      return;
    }
    if (type === "OUT") {
      const words = outNote.split(/\s+/).filter(Boolean);
      if (words.length < 2) {
        Alert.alert("OUT", t("outNeedNote"));
        return;
      }
      if (outPhotos.length < 1) {
        Alert.alert("OUT", t("outNeedPhoto"));
        return;
      }
    }

    setBusy(true);
    try {
      const current = await requestLocationOnce();
      setLoc(current);

      const payload: any = {
        action: "event",
        appKey: APP_KEY,
        deviceId,
        name: name.trim(),
        type,
        coords: { lat: current.latitude, lon: current.longitude, accuracyM: current.accuracy },
        device: { platform: Platform.OS, deviceTimeISO: new Date().toISOString() },
      };

      if (!useOther && selectedSite) {
        payload.siteId = selectedSite.id;

        const d = haversineMeters(current.latitude, current.longitude, selectedSite.lat, selectedSite.lon);
        const effective = Math.max(0, d - (current.accuracy ?? 0));
        if (effective > selectedSite.radiusM) {
          Alert.alert("Not on site", `Distance: ${fmtDist(d)} / Radius: ${fmtDist(selectedSite.radiusM)}`);
          setBusy(false);
          return;
        }
      } else {
        const nm = otherSiteName.trim() || "Other site";
        const rad = Number(otherRadiusM || 120);
        payload.customSite = { name: nm, lat: current.latitude, lon: current.longitude, radiusM: rad };
      }

      if (type === "OUT") {
        payload.workNote = outNote.trim();
        payload.outPhotos = outPhotos.slice(0, MAX_OUT_PHOTOS).map((p) => ({ base64: p.base64, mime: p.mime }));
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: MeResponse = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Server rejected");

      applyMe(data);
      await loadMe(deviceId); // <-- force refresh so clock/site updates immediately

      if (type === "OUT") {
        setOutPanel(false);
        setOutNote("");
        setOutPhotos([]);
      }

      Alert.alert(t("success"), `${type} recorded.`);
    } catch (e: any) {
      Alert.alert("Error", String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function sendEmergencyOut() {
    Alert.alert(
      t("emergencyOutTitle"),
      t("emergencyOutExplain"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("emergencyOutConfirm"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const payload = {
                action: "event",
                appKey: APP_KEY,
                deviceId,
                name: name.trim(),
                type: "OUT",
                emergencyOut: true,
                device: { platform: Platform.OS, deviceTimeISO: new Date().toISOString() },
              };
              const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const data: MeResponse = await res.json();
              if (!data?.ok) throw new Error(data?.error || "Server rejected");
              applyMe(data);
              await loadMe(deviceId);
              Alert.alert(t("success"), "Emergency OUT recorded. Your supervisor will review.");
            } catch (e: any) {
              Alert.alert("Error", String(e?.message || e));
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  const oshaState = !employee
    ? "pending"
    : employee.oshaExpired
      ? "expired"
      : employee.oshaApproved
        ? "ok"
        : "pending";

  const attState = !employee ? "pending" : employee.attestedToday ? "ok" : "needed";

  const showOshaBlock = !employee || employee.oshaExpired || !employee.oshaApproved;
  const showAttestBlock = employee && !employee.attestedToday && !employee.oshaExpired && employee.oshaApproved;

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: "#FFFFFF" }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: C.muted }}>{t("working")}</Text>
      </SafeAreaView>
    );
  }

  if (!nameSaved) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg1} translucent={false} />
        <LinearGradient colors={[C.bg1, C.bg2]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
            <View style={styles.brandHeaderOnboarding}>
              <Image source={LOGO} style={styles.logoBig} resizeMode="contain" />
            </View>

            <View style={styles.card}>
              <Text style={styles.h1}>{t("welcome")}</Text>
              <Text style={styles.muted}>{t("enterOnce")}</Text>

              <Text style={styles.label}>{t("yourName")}</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Galileo Galilei" />

              <Text style={styles.label}>{t("language")}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.langBtn, lang === "en" ? styles.langBtnOn : null]}
                  onPress={() => setLang("en")}
                  disabled={busy}
                >
                  <Text style={[styles.langText, lang === "en" ? styles.langTextOn : null]}>
                    🇺🇸 {t("english")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, lang === "es" ? styles.langBtnOn : null]}
                  onPress={() => setLang("es")}
                  disabled={busy}
                >
                  <Text style={[styles.langText, lang === "es" ? styles.langTextOn : null]}>
                    🇪🇸 {t("spanish")}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, name.trim().length < 2 ? { opacity: 0.5 } : null]}
                onPress={saveNameOnce}
                disabled={busy || name.trim().length < 2}
              >
                <Text style={styles.primaryBtnText}>{t("continue")}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>{t("footer")}</Text>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg1} translucent={false} />
      <LinearGradient colors={[C.bg1, C.bg2]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
          <View style={styles.brandHeader}>
            <Image source={LOGO} style={styles.logoSmall} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{name}</Text>
              <Text style={styles.mutedSmall}>
                {ready ? t("statusReady") : `${t("statusBlocked")}: ${gateReason()}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={async () => {
                setBusy(true);
                try {
                  await loadMe(deviceId);
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              <Text style={styles.pillBtnText}>{t("refresh")}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipsRow}>
            <StatusChip
              label={t("osha")}
              state={oshaState}
              text={oshaState === "ok" ? t("ok") : oshaState === "expired" ? t("expired") : t("pending")}
            />
            <StatusChip
              label={t("att")}
              state={attState}
              text={attState === "ok" ? t("done") : attState === "needed" ? t("needed") : t("pending")}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <View style={styles.cardMini}>
              <Text style={styles.miniLabel}>{t("todayTime")}</Text>
              <Text style={styles.miniValue}>{fmtHhMm(todayMsLive)}</Text>
            </View>

            <View style={styles.cardMini}>
              <Text style={styles.miniLabel}>{t("onSiteTime")}</Text>
              <Text style={styles.mutedSmall}>{clockedIn ? (currentSiteName || "—") : "—"}</Text>
              <Text style={styles.miniValue}>{clockedIn ? fmtHhMmSs(onSiteMsLive) : "—"}</Text>
            </View>
          </View>

          {showOshaBlock ? (
            <View style={styles.card}>
              <Text style={styles.h2}>{t("oshaTitle")}</Text>
              <Text style={styles.muted}>{t("oshaExplain")}</Text>

              <Text style={styles.label}>{t("expiry")}</Text>
              <TextInput value={oshaExpiryISO} onChangeText={setOshaExpiryISO} style={styles.input} placeholder="YYYY-MM-DD" />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={async () => {
                    const p = await takeAndCompressPhoto(t);
                    if (p) setOshaPhoto(p);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.secondaryBtnText}>{t("takePhoto")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={async () => {
                    Alert.alert("Info", "Gallery upload for OSHA is disabled in this build.");
                  }}
                  disabled={busy}
                >
                  <Text style={styles.secondaryBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              {oshaPhoto ? (
                <View style={{ marginTop: 10 }}>
                  <Image source={{ uri: oshaPhoto.previewUri }} style={styles.preview} />
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!isISODate(oshaExpiryISO) || !oshaPhoto) ? { opacity: 0.5 } : null,
                ]}
                onPress={submitOsha}
                disabled={busy || !isISODate(oshaExpiryISO) || !oshaPhoto}
              >
                <Text style={styles.primaryBtnText}>{t("uploadOSHA")}</Text>
              </TouchableOpacity>

              {employee && !employee.oshaApproved && !employee.oshaExpired ? (
                <Text style={[styles.mutedSmall, { marginTop: 8 }]}>{t("uploaded")}</Text>
              ) : null}
            </View>
          ) : null}

          {showAttestBlock ? (
            <View style={styles.card}>
              <Text style={styles.h2}>{t("attestTitle")}</Text>

              {/* Video & Rules links */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.linkBtn, { flex: 1 }]}
                  onPress={() => Linking.openURL(
                    lang === "es"
                      ? "https://www.osha.gov/vtools/construction"
                      : "https://www.osha.gov/vtools/construction"
                  )}
                >
                  <Text style={styles.linkBtnText}>{t("attVideoBtn")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkBtn, { flex: 1 }]}
                  onPress={() => Linking.openURL("https://www.osha.gov/construction")}
                >
                  <Text style={styles.linkBtnText}>{t("attRulesBtn")}</Text>
                </TouchableOpacity>
              </View>

              <CheckRow label={t("attest1")} checked={att1} onToggle={() => setAtt1(!att1)} />
              <CheckRow label={t("attest2")} checked={att2} onToggle={() => setAtt2(!att2)} />
              <CheckRow label={t("attest3")} checked={att3} onToggle={() => setAtt3(!att3)} />
              <CheckRow label={t("attest4")} checked={att4} onToggle={() => setAtt4(!att4)} />
              <CheckRow label={t("attest5")} checked={att5} onToggle={() => setAtt5(!att5)} />

              <Text style={styles.label}>{t("signature")}</Text>
              <TextInput
                value={attSig}
                onChangeText={setAttSig}
                style={styles.input}
                placeholder={name}
                placeholderTextColor="#5B6475"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!(att1 && att2 && att3 && att4 && att5) || !attSig.trim()) ? { opacity: 0.5 } : null,
                ]}
                onPress={submitAttestation}
                disabled={busy || !(att1 && att2 && att3 && att4 && att5) || !attSig.trim()}
              >
                <Text style={styles.primaryBtnText}>{t("submitAtt")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.h2}>{t("site")}</Text>

            <TouchableOpacity
              style={styles.sitePicker}
              onPress={async () => {
                setSitePickerOpen(!sitePickerOpen);
                await refreshDistances();
              }}
              disabled={busy}
            >
              <Text style={styles.siteTitle}>
                {useOther ? t("otherSite") : selectedSite ? selectedSite.name : t("site")}
              </Text>
              <Text style={styles.mutedSmall}>
                {useOther ? t("otherSiteHint") : selectedSite ? fmtDist(distMap[selectedSite.id] ?? 0) : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtnWide} onPress={loadSites} disabled={busy}>
              <Text style={styles.secondaryBtnText}>{t("reloadSites")}</Text>
            </TouchableOpacity>

            {sitePickerOpen ? (
              <View style={{ marginTop: 10 }}>
                {sortedSites.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.siteItem,
                      s.id === siteId && !useOther ? styles.siteItemOn : null,
                    ]}
                    onPress={() => {
                      setUseOther(false);
                      setSiteId(s.id);
                      setSitePickerOpen(false);
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.siteItemText}>{s.name}</Text>
                    <Text style={styles.mutedSmall}>{fmtDist(distMap[s.id] ?? 0)}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.siteItem, useOther ? styles.siteItemOn : null]}
                  onPress={() => {
                    setUseOther(true);
                    setSitePickerOpen(false);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.siteItemText}>{t("otherSite")}</Text>
                  <Text style={styles.mutedSmall}>{t("otherSiteHint")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {useOther ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>{t("newSiteName")}</Text>
                <TextInput value={otherSiteName} onChangeText={setOtherSiteName} style={styles.input} placeholder="New project" />

                <Text style={styles.label}>{t("radius")}</Text>
                <TextInput value={otherRadiusM} onChangeText={setOtherRadiusM} style={styles.input} keyboardType="numeric" />

                <TouchableOpacity style={styles.secondaryBtnWide} onPress={requestOtherSite} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>{t("sendRequest")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionIn, !ready ? { opacity: 0.5 } : null]}
              onPress={() => sendEvent("IN")}
              disabled={busy || !ready}
            >
              <Text style={styles.actionText}>{t("in")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionOut, !ready ? { opacity: 0.5 } : null]}
              onPress={() => setOutPanel(true)}
              disabled={busy || !ready}
            >
              <Text style={styles.actionText}>{t("out")}</Text>
            </TouchableOpacity>
          </View>

          {clockedIn && !outPanel ? (
            <TouchableOpacity
              style={styles.emergencyBtn}
              onPress={sendEmergencyOut}
              disabled={busy}
            >
              <Text style={styles.emergencyBtnText}>⚠️  {t("emergencyOut")}</Text>
            </TouchableOpacity>
          ) : null}

          {outPanel ? (
            <View style={styles.card}>
              <Text style={styles.h2}>{t("outTitle")}</Text>

              <Text style={styles.label}>{t("outNote")}</Text>
              <TextInput value={outNote} onChangeText={setOutNote} style={styles.input} placeholder={t("outNotePh")} />

              <TouchableOpacity style={styles.secondaryBtnWide} onPress={addOutPhoto} disabled={busy}>
                <Text style={styles.secondaryBtnText}>{t("takePhoto")}</Text>
              </TouchableOpacity>

              {outPhotos.length ? (
                <View style={{ marginTop: 10, gap: 10 }}>
                  {outPhotos.map((p, idx) => (
                    <View key={idx} style={{ position: "relative" }}>
                      <Image source={{ uri: p.previewUri }} style={styles.previewSmall} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setOutPhotos(outPhotos.filter((_, i) => i !== idx))}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900" }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setOutPanel(false)} disabled={busy}>
                  <Text style={styles.secondaryBtnText}>{t("cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { flex: 1, marginTop: 0 },
                    (!outNote.trim() || outPhotos.length < 1) ? { opacity: 0.5 } : null,
                  ]}
                  onPress={() => sendEvent("OUT")}
                  disabled={busy}
                >
                  <Text style={styles.primaryBtnText}>{t("submitOut")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Text style={styles.footer}>{t("footer")}</Text>

          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator />
              <Text style={{ marginTop: 10, color: C.muted }}>{t("working")}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom fade so buttons don't get visually cut off */}
        <LinearGradient
          colors={["transparent", C.bg2]}
          style={styles.bottomFade}
          pointerEvents="none"
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

function StatusChip({ label, state, text }: { label: string; state: string; text: string }) {
  const bg =
    state === "ok" ? "rgba(30,158,90,0.12)" :
    state === "needed" ? "rgba(245,165,36,0.12)" :
    state === "expired" ? "rgba(229,72,77,0.12)" :
    "rgba(45,91,255,0.10)";

  const dot =
    state === "ok" ? C.success :
    state === "needed" ? C.warn :
    state === "expired" ? C.danger :
    C.blue;

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: "rgba(11,27,59,0.08)" }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={styles.chipText}>
        {label}: <Text style={{ fontWeight: "900", color: C.text }}>{text}</Text>
      </Text>
    </View>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
      <View style={[styles.checkBox, checked ? styles.checkBoxOn : null]} />
      <Text style={{ flex: 1, marginLeft: 10, color: C.text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  brandHeaderOnboarding: { alignItems: "center", marginBottom: 6 },
  logoBig: { width: 120, height: 84, alignSelf: "center" },

  brandHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  logoSmall: { width: 70, height: 36 },

  userName: { fontSize: 20, fontWeight: "900", color: C.navy },
  mutedSmall: { color: C.muted, marginTop: 2 },

  h1: { fontSize: 20, fontWeight: "900", color: C.navy },
  h2: { fontSize: 15, fontWeight: "900", color: C.navy },
  muted: { color: C.muted, marginTop: 6, lineHeight: 18 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginTop: 12,
  },

  cardMini: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  miniLabel: { color: C.muted, fontWeight: "800" },
  miniValue: { color: C.navy, fontWeight: "900", fontSize: 16, marginTop: 4 },

  label: { fontSize: 12, color: C.muted, marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    color: C.text,
    backgroundColor: "#fff",
    fontSize: 15,
    minHeight: 44,
  },

  langBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    minHeight: 44,
    justifyContent: "center",
  },
  langBtnOn: { borderColor: "rgba(45,91,255,0.35)", backgroundColor: "rgba(45,91,255,0.08)" },
  langText: { color: C.navy, fontWeight: "800" },
  langTextOn: { color: C.navy },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: C.blue,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(11,27,59,0.18)",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnWide: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(11,27,59,0.18)",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: C.navy, fontWeight: "900" },

  pillBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11,27,59,0.18)",
    backgroundColor: "#fff",
  },
  pillBtnText: { color: C.navy, fontWeight: "900" },

  chipsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  chip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  chipText: { color: C.muted, fontWeight: "800", fontSize: 12, flexShrink: 1, flexWrap: "wrap" as const },

  sitePicker: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    backgroundColor: "rgba(247,249,255,0.9)",
  },
  siteTitle: { color: C.navy, fontWeight: "900", fontSize: 14 },

  siteItem: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  siteItemOn: { borderColor: "rgba(45,91,255,0.35)", backgroundColor: "rgba(45,91,255,0.07)" },
  siteItemText: { color: C.navy, fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  actionIn: { backgroundColor: C.blue },
  actionOut: { backgroundColor: C.navy },
  actionText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  emergencyBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(245,165,36,0.5)",
    backgroundColor: "rgba(245,165,36,0.08)",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center" as const,
  },
  emergencyBtnText: {
    color: "#B97A00",
    fontWeight: "800" as const,
    fontSize: 13,
  },

  preview: { width: "100%", height: 190, borderRadius: 14 },
  previewSmall: { width: "100%", height: 150, borderRadius: 14 },

  checkBox: { width: 18, height: 18, borderWidth: 1, borderColor: C.navy, borderRadius: 5 },
  checkBoxOn: { backgroundColor: C.blue, borderColor: C.blue },

  photoRemove: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  linkBtn: {
    borderWidth: 1,
    borderColor: "rgba(45,91,255,0.3)",
    backgroundColor: "rgba(45,91,255,0.06)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  linkBtnText: {
    color: "#2D5BFF",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
  },

  bottomFade: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    pointerEvents: "none" as const,
  },
  footer: {
    marginTop: 16,
    textAlign: "center",
    color: "rgba(11,27,59,0.45)",
    fontWeight: "800",
  },

  busyOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});