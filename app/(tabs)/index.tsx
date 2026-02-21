import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  LogBox,
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

LogBox.ignoreLogs([
  // Если у тебя старая версия и она ругается на MediaTypeOptions — скрываем этот dev-warn.
  "[expo-image-picker] `ImagePicker.MediaTypeOptions` have been deprecated",
]);

const API_URL =
  "https://script.google.com/macros/s/AKfycbz0fjpzP6KOn_0mPkz5zTJfTQbLmIrY6ZwvhFT4dBP-6t-kJLyM6DO_eneJDYH7a--l3A/exec";
const APP_KEY = "ZAK_ATT_2026_demo";

const LOGO = require("../../assets/gekon.png");

const STORE = {
  deviceId: "deviceId",
  name: "name",
  lang: "lang",
  cacheSites: "cache_sites",
  cacheMe: "cache_me",
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
};

type PhotoPayload = { base64: string; mime: string; previewUri: string };

const MAX_OUT_PHOTOS = 3;

const C = {
  navy: "#0B1B3B",
  blue: "#2D5BFF",
  fog: "#F2F2F7",      // цвет шторки iOS
  bgTop: "#F2F2F7",   // совпадает со шторкой iOS
  bgMid: "#F5F6FA",
  bgBot: "#F2F2F7",   // совпадает со шторкой iOS
  text: "#0B1320",
  muted: "#5B6475",
  border: "#E5E8F0",
  success: "#1E9E5A",
  warn: "#F5A524",
  danger: "#E5484D",
};

const STR: Record<Lang, Record<string, string>> = {
  en: {
    welcome: "Welcome",
    enterOnce: "Enter your name once. Next time we won’t ask.",
    yourName: "Your name",
    continue: "Continue",
    language: "Language",
    english: "English",
    spanish: "Español",

    statusReady: "Ready",
    statusBlocked: "Blocked",
    refresh: "Refresh",
    changeName: "Change name",

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
    chooseFromPhotos: "Choose from Photos",
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
    attest1: "I completed today’s safety briefing / toolbox talk.",
    attest2: "I am sober and fit for duty.",
    attest3: "I have required PPE.",
    attest4: "I understand the rules and have no claims/complaints at this time.",
    signature: "Signature (type your name)",
    submitAtt: "Submit attestation",
    attDone: "Daily attestation recorded.",

    blockedNotInit: "Not initialized",
    blockedInactive: "Inactive",
    blockedOshaExpired: "OSHA expired/missing",
    blockedOshaPending: "OSHA pending admin approval",
    blockedAtt: "Daily attestation required",

    outNeedNote: "Write at least 2 words about what you did today.",
    outNeedPhoto: "At least 1 photo is required for OUT.",

    gpsError: "GPS error",
    permNeeded: "Permission needed",
    allowCamera: "Allow camera access.",
    allowPhotos: "Allow photo library access.",

    cameraUnavailableTitle: "Camera unavailable",
    cameraUnavailableMsg: "Camera is not available in iOS Simulator. Choose a photo from Photos instead.",

    success: "Success",
    working: "Working…",
    footer: "Designed by zakhargalan.in © 2026",
  },
  es: {
    welcome: "Bienvenido",
    enterOnce: "Escribe tu nombre una sola vez. La próxima vez no lo pediremos.",
    yourName: "Tu nombre",
    continue: "Continuar",
    language: "Idioma",
    english: "English",
    spanish: "Español",

    statusReady: "Listo",
    statusBlocked: "Bloqueado",
    refresh: "Actualizar",
    changeName: "Cambiar nombre",

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
    chooseFromPhotos: "Elegir desde Fotos",
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
    attest1: "Completé la charla de seguridad de hoy.",
    attest2: "Estoy sobrio y apto para trabajar.",
    attest3: "Tengo el EPP requerido.",
    attest4: "Entiendo las reglas y no tengo reclamos en este momento.",
    signature: "Firma (escribe tu nombre)",
    submitAtt: "Enviar declaración",
    attDone: "Declaración diaria registrada.",

    blockedNotInit: "No inicializado",
    blockedInactive: "Inactivo",
    blockedOshaExpired: "OSHA vencido/falta",
    blockedOshaPending: "OSHA pendiente de aprobación",
    blockedAtt: "Falta la declaración diaria",

    outNeedNote: "Escribe al menos 2 palabras sobre lo que hiciste hoy.",
    outNeedPhoto: "Se requiere al menos 1 foto para SALIDA.",

    gpsError: "Error GPS",
    permNeeded: "Permiso requerido",
    allowCamera: "Permite acceso a la cámara.",
    allowPhotos: "Permite acceso a Fotos.",

    cameraUnavailableTitle: "Cámara no disponible",
    cameraUnavailableMsg: "La cámara no está disponible en el simulador iOS. Elige una foto desde Fotos.",

    success: "Éxito",
    working: "Procesando…",
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
async function sdel(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
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

// Совместимый selector mediaTypes под разные версии expo-image-picker
function getImagesMediaTypes(): any {
  const anyPicker: any = ImagePicker as any;
  // новые версии
  if (anyPicker?.MediaType?.Images) return anyPicker.MediaType.Images;
  // старые версии
  if (anyPicker?.MediaTypeOptions?.Images) return anyPicker.MediaTypeOptions.Images;
  return undefined; // пусть будет default
}

// Гарантированно даём base64: если picker не дал — прогоняем через ImageManipulator
async function assetToPayload(asset: any): Promise<PhotoPayload | null> {
  try {
    const mime = asset?.mimeType || "image/jpeg";
    if (asset?.base64) return { base64: asset.base64, mime, previewUri: asset.uri };

    // манипулятор часто умеет и ph:// и даёт file://
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1400 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const b64 = await FileSystem.readAsStringAsync(manipulated.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { base64: b64, mime: "image/jpeg", previewUri: manipulated.uri };
  } catch {
    return null;
  }
}

async function pickFromLibrary(t: (k: string) => string): Promise<PhotoPayload | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(t("permNeeded"), t("allowPhotos"));
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: getImagesMediaTypes(),
    quality: 0.8,
    base64: true,
    exif: false,
    allowsMultipleSelection: false,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset) return null;

  const payload = await assetToPayload(asset);
  if (!payload) {
    Alert.alert("Photo", "Could not attach this image. Please try another one.");
    return null;
  }
  return payload;
}

async function takePhoto(t: (k: string) => string): Promise<PhotoPayload | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(t("permNeeded"), t("allowCamera"));
    return null;
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: getImagesMediaTypes(),
      quality: 0.8,
      base64: true,
      exif: false,
    });

    if (result.canceled) return null;

    const asset = result.assets?.[0];
    if (!asset) return null;

    const payload = await assetToPayload(asset);
    if (!payload) {
      Alert.alert("Photo", "Could not attach this photo. Try again.");
      return null;
    }
    return payload;
  } catch (e: any) {
    const msg = String(e?.message || e);
    const noCamera = /simulator|not available|no camera/i.test(msg);

    if (noCamera) {
      Alert.alert(t("cameraUnavailableTitle"), t("cameraUnavailableMsg"));
      return await pickFromLibrary(t);
    }

    Alert.alert("Camera", msg);
    return null;
  }
}

export default function Index() {
  const androidTopPad = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  const [lang, setLang] = useState<Lang>(sysLangDefault());
  const t = (k: string) => STR[lang][k] || STR.en[k] || k;

  async function setLangPersist(next: Lang) {
    setLang(next);
    await sset(STORE.lang, next);
  }

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  const [employee, setEmployee] = useState<Employee | null>(null);

  const displayName = useMemo(() => {
    const serverName = String((employee as any)?.name || "").replace(/\s+/g, " ").trim();
    const localName = String(name || "").replace(/\s+/g, " ").trim();
    const chosen = serverName.length >= 2 ? serverName : localName;
    return chosen || "—";
  }, [employee, name]);

  const [oshaExpiryISO, setOshaExpiryISO] = useState("");
  const [oshaPhoto, setOshaPhoto] = useState<PhotoPayload | null>(null);

  const [attSig, setAttSig] = useState("");
  const [att1, setAtt1] = useState(false);
  const [att2, setAtt2] = useState(false);
  const [att3, setAtt3] = useState(false);
  const [att4, setAtt4] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<string>("");
  const [sitePickerOpen, setSitePickerOpen] = useState(false);

  const [useOther, setUseOther] = useState(false);
  const [otherSiteName, setOtherSiteName] = useState("");
  const [otherRadiusM, setOtherRadiusM] = useState("120");

  const [distMap, setDistMap] = useState<Record<string, number>>({});
  const [autoSortedOnce, setAutoSortedOnce] = useState(false);

  const [outPanel, setOutPanel] = useState(false);
  const [outNote, setOutNote] = useState("");
  const [outPhotos, setOutPhotos] = useState<PhotoPayload[]>([]);

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
      const savedLang = (await sget(STORE.lang)) as Lang | null;
      if (savedLang === "en" || savedLang === "es") setLang(savedLang);

      let did = (await sget(STORE.deviceId)) || "";
      if (!did) {
        did = genDeviceId();
        await sset(STORE.deviceId, did);
      }
      setDeviceId(did);

      const savedName = (await sget(STORE.name)) || "";
      if (savedName) {
        setName(savedName);
        setNameSaved(true);
      }

      // ─── Кэш: показываем мгновенно ───
      let hasCache = false;
      try {
        const [cachedSitesRaw, cachedMeRaw] = await Promise.all([
          sget(STORE.cacheSites),
          sget(STORE.cacheMe),
        ]);
        if (cachedSitesRaw) {
          const cached: Site[] = JSON.parse(cachedSitesRaw);
          if (cached.length) {
            setSites(cached);
            if (!siteId && cached[0]?.id) setSiteId(cached[0].id);
          }
        }
        if (cachedMeRaw && savedName) {
          const cached: MeResponse = JSON.parse(cachedMeRaw);
          if (cached?.employee) {
            applyMe(cached);
            hasCache = true;
          }
        }
      } catch {}

      // Если есть кэш — убираем спиннер сразу, сеть обновит в фоне
      if (hasCache) setLoading(false);

      // ─── Сеть: обновляем в фоне ───
      if (savedName) {
        Promise.all([
          loadSites().catch(() => {}),
          initOnServer(did, savedName)
            .then(() => loadMe(did))
            .catch(() => {}),
        ]).finally(() => {
          if (!hasCache) setLoading(false);
        });
      } else {
        loadSites().catch(() => {});
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!nameSaved) return;
    if (!sites.length) return;
    if (autoSortedOnce) return;
    refreshDistances().finally(() => setAutoSortedOnce(true));
  }, [nameSaved, sites.length, autoSortedOnce]);

  useEffect(() => {
    setTodayMsLive(todayMsBase);
    setOnSiteMsLive(0);

    const id = setInterval(() => {
      const nowServer = Date.now() + serverOffsetMs;

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
    // Кэшируем
    sset(STORE.cacheSites, JSON.stringify(data.sites || [])).catch(() => {});
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
    // Кэшируем
    sset(STORE.cacheMe, JSON.stringify(data)).catch(() => {});
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

  async function resetName() {
    setBusy(true);
    try {
      await sdel(STORE.name);
      setName("");
      setNameSaved(false);
      setEmployee(null);

      setOshaExpiryISO("");
      setOshaPhoto(null);

      setAttSig("");
      setAtt1(false);
      setAtt2(false);
      setAtt3(false);
      setAtt4(false);

      setOutPanel(false);
      setOutNote("");
      setOutPhotos([]);
    } finally {
      setBusy(false);
    }
  }

  function confirmResetName() {
    Alert.alert(
      t("changeName"),
      "This will reset the saved name on this device. You can enter the correct name again.",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("changeName"), style: "destructive", onPress: resetName },
      ]
    );
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
    const allChecked = att1 && att2 && att3 && att4;
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
        statements: { safetyBriefing: att1, soberFitForDuty: att2, ppeReady: att3, noClaims: att4 },
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
    const p = await takePhoto(t);
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

      const payload: any = {
        action: "event",
        appKey: APP_KEY,
        deviceId,
        name: name.trim(),
        type,
        coords: { lat: current.latitude, lon: current.longitude, accuracyM: current.accuracy },
        device: { platform: Platform.OS, deviceTimeISO: new Date().toISOString() },
      };

      if (!useOther && selectedSite) payload.siteId = selectedSite.id;
      else payload.customSite = { name: otherSiteName.trim() || "Other site", radiusM: Number(otherRadiusM || 120) };

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
      await loadMe(deviceId);

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
      <LinearGradient colors={[C.bgTop, C.bgMid, C.bgBot]} style={styles.root}>
        <SafeAreaView style={[styles.center, { paddingTop: androidTopPad }]}>
          <ActivityIndicator />
          <Text style={{ marginTop: 10, color: C.muted }}>{t("working")}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!nameSaved) {
    return (
      <LinearGradient colors={[C.bgTop, C.bgMid, C.bgBot]} style={styles.root}>
        <SafeAreaView style={{ flex: 1, paddingTop: androidTopPad }}>
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, paddingTop: 30 }}>
            <View style={styles.brandHeaderOnboarding}>
              <Image source={LOGO} style={styles.logoBig} resizeMode="contain" />
            </View>

            <View style={styles.card}>
              <Text style={styles.h1}>{t("welcome")}</Text>
              <Text style={styles.muted}>{t("enterOnce")}</Text>

              <Text style={styles.label}>{t("yourName")}</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="John Smith" />

              <Text style={styles.label}>{t("language")}</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.langBtn, lang === "en" ? styles.langBtnOn : null]}
                  onPress={() => setLangPersist("en")}
                  disabled={busy}
                >
                  <Text style={[styles.langText, lang === "en" ? styles.langTextOn : null]}>🇺🇸 {t("english")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langBtn, lang === "es" ? styles.langBtnOn : null]}
                  onPress={() => setLangPersist("es")}
                  disabled={busy}
                >
                  <Text style={[styles.langText, lang === "es" ? styles.langTextOn : null]}>🇪🇸 {t("spanish")}</Text>
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
          <FogEdges />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[C.bgTop, C.bgMid, C.bgBot]} style={styles.root}>
      <SafeAreaView style={{ flex: 1, paddingTop: androidTopPad }}>
        <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, paddingTop: 30 }}>
          {/* Header */}
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <Image source={LOGO} style={styles.logoSmall} resizeMode="contain" />
              <View style={styles.headerTitleBlock}>
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </Text>
                {/* оставляем только “Ready/Blocked”, без дубля OSHA */}
                <Text style={styles.mutedSmall}>{ready ? t("statusReady") : t("statusBlocked")}</Text>
              </View>
            </View>

            <View style={styles.headerActionsRow}>
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

              <TouchableOpacity style={styles.pillBtn} onPress={confirmResetName} disabled={busy}>
                <Text style={styles.pillBtnText}>{t("changeName")}</Text>
              </TouchableOpacity>
            </View>
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
                    const p = await takePhoto(t);
                    if (p) setOshaPhoto(p);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.secondaryBtnText}>{t("takePhoto")}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={async () => {
                    const p = await pickFromLibrary(t);
                    if (p) setOshaPhoto(p);
                  }}
                  disabled={busy}
                >
                  <Text style={styles.secondaryBtnText}>{t("chooseFromPhotos")}</Text>
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
                onPress={async () => {
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
                }}
                disabled={busy || !isISODate(oshaExpiryISO) || !oshaPhoto}
              >
                <Text style={styles.primaryBtnText}>{t("uploadOSHA")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showAttestBlock ? (
            <View style={styles.card}>
              <Text style={styles.h2}>{t("attestTitle")}</Text>
              <CheckRow label={t("attest1")} checked={att1} onToggle={() => setAtt1(!att1)} />
              <CheckRow label={t("attest2")} checked={att2} onToggle={() => setAtt2(!att2)} />
              <CheckRow label={t("attest3")} checked={att3} onToggle={() => setAtt3(!att3)} />
              <CheckRow label={t("attest4")} checked={att4} onToggle={() => setAtt4(!att4)} />

              <Text style={styles.label}>{t("signature")}</Text>
              <TextInput value={attSig} onChangeText={setAttSig} style={styles.input} placeholder={displayName} />

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!(att1 && att2 && att3 && att4) || !attSig.trim()) ? { opacity: 0.5 } : null,
                ]}
                onPress={submitAttestation}
                disabled={busy || !(att1 && att2 && att3 && att4) || !attSig.trim()}
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
                {useOther ? t("otherSiteHint") : selectedSite ? `${Math.round(distMap[selectedSite.id] ?? 0)} m` : ""}
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
                    style={[styles.siteItem, s.id === siteId && !useOther ? styles.siteItemOn : null]}
                    onPress={() => {
                      setUseOther(false);
                      setSiteId(s.id);
                      setSitePickerOpen(false);
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.siteItemText}>{s.name}</Text>
                    <Text style={styles.mutedSmall}>{Math.round(distMap[s.id] ?? 9e9)} m</Text>
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
                  style={[styles.primaryBtn, { flex: 1, marginTop: 0 }, (!outNote.trim() || outPhotos.length < 1) ? { opacity: 0.5 } : null]}
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
        <FogEdges />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function FogEdges() {
  return (
    <>
      <LinearGradient
        colors={[C.fog, C.fog + "00"]}
        style={styles.fogTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[C.fog + "00", C.fog]}
        style={styles.fogBottom}
        pointerEvents="none"
      />
    </>
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
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  brandHeaderOnboarding: { alignItems: "center", marginBottom: 6 },
  logoBig: { width: "100%", height: 84 },

  headerCard: {
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
    marginBottom: 12,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoSmall: { width: 62, height: 34 },
  headerTitleBlock: { flex: 1, minWidth: 0 }, // ключ от “переноса по буквам”

  headerActionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },

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
  },

  langBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  langBtnOn: { borderColor: "rgba(45,91,255,0.35)", backgroundColor: "rgba(45,91,255,0.08)" },
  langText: { color: C.navy, fontWeight: "800" },
  langTextOn: { color: C.navy },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: C.blue,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
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
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11,27,59,0.18)",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  pillBtnText: { color: C.navy, fontWeight: "900" },

  chipsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: C.muted, fontWeight: "800", fontSize: 13, flexShrink: 1 },

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

  fogTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    zIndex: 10,
  },
  fogBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    zIndex: 10,
  },
});