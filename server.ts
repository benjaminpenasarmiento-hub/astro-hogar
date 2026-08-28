import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { addDoc, collection, doc, setDoc, getDoc } from "firebase/firestore";
import { PlantDiagnosis, Plant } from "./src/types";
import { 
  loadDatabase, 
  getStore, 
  addCalendarItem, 
  updateCalendarItem, 
  deleteCalendarItem,
  addPet,
  updatePet,
  deletePet,
  addPetVaccine,
  addPetMedication,
  logPetWeight,
  addPlant,
  deletePlant,
  updatePlant,
  addPlantAction,
  bulkPlantAction,
  addPlantDiagnosis,
  addWish,
  updateWish,
  deleteWish,
  addMemory,
  updateMemory,
  deleteMemory,
  addDocument,
  deleteDocument,
  updateHomeSettings,
  onboardingCreateHome,
  onboardingJoinHome,
  doesHomeExist,
  getStoreByCode,
  normalizeHomeCode,
  resetDatabase,
  addCheckin,
  getCheckins,
  getAstroProfile,
  getHomePersonalityState,
  updateUserProfile,
  getBudgetStore,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  addBudgetTemplate,
  updateBudgetTemplate,
  deleteBudgetTemplate,
  applyBudgetTemplate,
  addBudgetAccount,
  deleteBudgetAccount,
  closeBudgetFortnight,
  openBudgetFortnight,
  clearBudgetStore,
  getOrCreateDailyQuestions,
  getOrCreateActiveChallenges,
  toggleSaludChallenge,
  submitQuestionAnswer,
  addFrascoMessage,
  calculateSaludIndicators,
  addCierreMensual,
  addCustomSaludChallenge,
  homeContextStorage,
  getWorkoutLogs,
  addWorkoutLog,
  deleteWorkoutLog,
  getWorkoutRoutines,
  saveWorkoutRoutine,
  deleteWorkoutRoutine,
  getWorkoutDetailedLogs,
  saveWorkoutDetailedLog,
  deleteWorkoutDetailedLog,
  getBodyMetrics,
  saveBodyMetric,
  deleteBodyMetric,
  getPersonalRecords,
  savePersonalRecord,
  getCustomExercises,
  saveCustomExercise,
  deleteCustomExercise,
  firestore,
  addNotification,
  markNotificationsAsRead,
  clearNotifications,
  getUserName,
  getEmotionCheckins,
  saveEmotionCheckins,
  getCustomEmotions,
  saveCustomEmotions,
  getSyncStatus,
  restoreFromFirestore,
  createBackupDisk,
  listBackupsDisk,
  restoreBackupDisk,
  CURRENT_APP_VERSION,
  CURRENT_SCHEMA_VERSION,
  getClosetCategories,
  saveClosetCategory,
  deleteClosetCategory,
  getClosetGarments,
  saveClosetGarment,
  deleteClosetGarment,
  getSavedOutfits,
  saveSavedOutfit,
  deleteSavedOutfit,
  getWornOutfitLogs,
  recordWornOutfit,
  logAuditTrail,
  getAuditLogs,
  rescueDataForHome,
  validateUserAccess
} from "./serverStore";

// Initialize database
loadDatabase();

// Initialize the Google GenAI SDK
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

// Keep initialization lazy and safe
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    console.log("Gemini GenAI SDK initialized successfully.");
  } catch (err) {
    console.log("Milo Info: GoogleGenAI se inicializará con respaldo miau.");
  }
} else {
  console.log("No GEMINI_API_KEY found or default placeholder detected. Utilizing cute fallback simulated AI.");
}

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Dynamic partition nesting routing helper
app.use((req, res, next) => {
  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);
  homeContextStorage.run(homeCode, () => {
    next();
  });
});

// Helper to compile home status overview for AI context
function getHomeContextSummary() {
  const store = getStore();
  const todayStr = new Date().toISOString().split('T')[0];

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekLaterStr = weekLater.toISOString().split('T')[0];

  const petsSummary = (store.pets || []).length === 0 
    ? "Ninguna mascota registrada en el nido."
    : store.pets.map(p => {
        const vax = p.medical.vaccinations.map(v => `${v.name} (última: ${v.date}${v.nextDueDate ? `, próxima: ${v.nextDueDate}` : ''})`).join(", ");
        const meds = p.medical.medications.map(m => `${m.name} (${m.dosage}, ${m.schedule})`).join(", ");
        return `- ${p.name}: Peso: ${p.weight}kg. Vacunas: [${vax || 'ninguna'}]. Medicinas: [${meds || 'ninguna'}]. Alergias: ${p.medical.allergies?.join(", ") || 'ninguna'}.`;
      }).join("\n");

  const plantsSummary = (store.plants || []).length === 0 
    ? "NINGUNA PLANTA REGISTRADA EN EL HOGAR (0 plantas). NO hay plantas actualmente en el nido."
    : store.plants.map(p => {
        const lastWater = p.careHistory.find(h => h.type === 'water');
        let daysSinceWater = "nunca registrado";
        if (lastWater) {
          const diffTime = Math.abs(new Date().getTime() - new Date(lastWater.date).getTime());
          daysSinceWater = `${Math.floor(diffTime / (1000 * 60 * 60 * 24))} días`;
        }
        return `- ${p.name} (${p.species || 'especie no especificada'}): Último riego: hace ${daysSinceWater}. Acciones: ${p.careHistory.length} totales.`;
      }).join("\n");

  const todayTasks = (store.calendarItems || []).filter(i => i.date === todayStr);
  const tasksSummary = todayTasks.length === 0 
    ? "Ninguna tarea ni evento agendado para hoy." 
    : todayTasks.map(t => `- [${t.status === 'done' ? 'Hecho' : 'Pendiente'}] ${t.title} (${t.time || 'todo el día'}) - Asignado a: ${t.assignedTo}`).join("\n");

  const upcomingWeekTasks = (store.calendarItems || []).filter(i => i.date > todayStr && i.date <= weekLaterStr);
  const weekTasksSummary = upcomingWeekTasks.length === 0 
    ? "Sin eventos ni tareas para los próximos 7 días." 
    : upcomingWeekTasks.map(t => `- [${t.date}] ${t.title} (${t.time || 'todo el día'}) - Asignado a: ${t.assignedTo}`).join("\n");

  const recentCheckins = (store.checkins || []).length === 0 
    ? "Sin registros emocionales recientes."
    : (store.checkins || []).slice(-4).map((c: any) => `- ${c.userId === 'mafe' ? 'Mafe' : 'Benja'} en ${c.date}: Ánimo "${c.mood || 'normal'}", Energía ${c.energyLevel || 3}/5, Estrés ${c.stressLevel || 1}/5 (${c.notes || 'sin notas'})`).join("\n");

  const budgetItems = store.budgetItems || [];
  const incomeTotal = budgetItems.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const expenseTotal = budgetItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
  const budgetAccountsStr = store.budgetAccounts?.map(a => `${a.name}: $${a.balance.toLocaleString('es-CO')}`).join(", ") || "General";
  const budgetSummary = `Ingresos acumulados: $${incomeTotal.toLocaleString('es-CO')}, Gastos acumulados: $${expenseTotal.toLocaleString('es-CO')}, Balance activo: $${(incomeTotal - expenseTotal).toLocaleString('es-CO')}. Cuentas: [${budgetAccountsStr}]. Quincenas cerradas: ${store.closedFortnights?.length || 0}.`;

  const recentWorkouts = (store.workoutLogs || []).length === 0 
    ? "Sin entrenamientos recientes registrados."
    : (store.workoutLogs || []).slice(-3).map((w: any) => `- ${w.userName || 'Usuario'} (${w.date}): ${w.routineTitle || 'Entrenamiento'} (${w.durationMinutes || 30} min)`).join("\n");

  const closetGarments = store.closetGarments || [];
  const closetSummary = closetGarments.length === 0 
    ? "El closet no tiene prendas registradas."
    : `Total prendas: ${closetGarments.length} (Mafe: ${closetGarments.filter(g => g.ownerId === 'mafe').length}, Benja: ${closetGarments.filter(g => g.ownerId === 'benja').length}, Compartidas: ${closetGarments.filter(g => g.ownerId === 'ambos').length}).`;

  const wishesSummary = (store.wishes || []).length === 0 
    ? "Sin anhelos ni deseos registrados."
    : (store.wishes || []).map(w => `- ${w.name} (${w.category}) para ${w.owner}: ${w.status}`).join("\n");

  const memoriesSummary = (store.memories || []).length === 0 
    ? "Ningún recuerdo registrado en el álbum aún."
    : (store.memories || []).map(m => `- "${m.title}" (${m.date}) en ${m.location || 'desconocido'}: ${m.description || 'sin descripción'}`).join("\n");

  const frascoSummary = (store.frascoMessages || []).length === 0 
    ? "Sin mensajes de amor en el frasco."
    : (store.frascoMessages || []).slice(-3).map(m => `- De ${m.senderId === 'mafe' ? 'Mafe' : 'Benja'}: "${m.text}"`).join("\n");

  const upcomingAlerts = [];
  if (store.plants && store.plants.length > 0) {
    store.plants.forEach(p => {
      const lastWater = p.careHistory.find(h => h.type === 'water');
      if (lastWater) {
        const diff = Math.floor(Math.abs(new Date().getTime() - new Date(lastWater.date).getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 6) {
          upcomingAlerts.push(`⚠️ Alerta planta: ${p.name} lleva ${diff} días sin riego.`);
        }
      } else {
        upcomingAlerts.push(`⚠️ Alerta planta: ${p.name} no registra riego inicial.`);
      }
    });
  }

  (store.calendarItems || []).forEach(i => {
    if (i.type === "reminder" && i.status === "pending") {
      upcomingAlerts.push(`📅 Recordatorio activo: ${i.title} para el ${i.date}.`);
    }
  });

  return {
    today: todayStr,
    location: "Bogotá, Sabana de Bogotá (2.640 msnm, clima templado/fresco)",
    pets: petsSummary,
    plants: plantsSummary,
    tasks: tasksSummary,
    weekTasks: weekTasksSummary,
    alerts: upcomingAlerts.join("\n") || "No hay alertas activas en el hogar hoy.",
    checkins: recentCheckins,
    budget: budgetSummary,
    workouts: recentWorkouts,
    closet: closetSummary,
    wishes: wishesSummary,
    memories: memoriesSummary,
    frasco: frascoSummary
  };
}

// REST API Routes
app.get("/api/home-data", (req, res) => {
  res.json(getStore());
});

app.post("/api/rescue-data", async (req, res) => {
  const userId = (req.headers["x-user-id"] as string) || "sistema";
  try {
    const result = await rescueDataForHome(userId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al ejecutar rescate de datos" });
  }
});

app.get("/api/audit-logs", (req, res) => {
  res.json(getAuditLogs());
});

app.post("/api/force-firestore-sync", async (req, res) => {
  try {
    await restoreFromFirestore();
    res.json({ success: true, store: getStore(), syncStatus: getSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error during sync" });
  }
});

app.get("/api/force-firestore-sync", async (req, res) => {
  try {
    await restoreFromFirestore();
    res.json({ success: true, store: getStore(), syncStatus: getSyncStatus() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error during sync" });
  }
});

app.post("/api/notifications/read", (req, res) => {
  const userId = req.headers["x-user-id"] as string || "";
  const { ids } = req.body;
  markNotificationsAsRead(userId, ids);
  res.json({ success: true, notifications: getStore().notifications || [] });
});

app.post("/api/notifications/clear", (req, res) => {
  clearNotifications();
  res.json({ success: true, notifications: [] });
});

// Endpoint to capture and persist error logs in Firestore for debugging (e.g. mobile issues)
app.post("/api/error-logs", async (req, res) => {
  const { errorMessage, errorStack, context } = req.body;
  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);
  const userAgent = req.headers["user-agent"] || "Unknown";

  try {
    if (firestore) {
      await addDoc(collection(firestore, "error_logs"), {
        homeCode,
        userAgent,
        errorMessage: errorMessage || "Unknown error",
        errorStack: errorStack || "",
        context: context || {},
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.warn("Firestore error_log save bypassed (quota or connectivity):", err?.message || err);
      });
      console.log(`Error log processed for home ${homeCode}`);
    } else {
      console.warn("Firestore not initialized, error log fell back to console:", {
        homeCode,
        userAgent,
        errorMessage,
        errorStack,
        context
      });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Failed to write error log to Firestore:", err);
    return res.status(500).json({ error: "Failed to persist error log" });
  }
});

app.get("/api/sync-status", (req, res) => {
  try {
    const status = getSyncStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Error fetching sync status" });
  }
});

// Backup System Endpoints
app.post("/api/backup/create", (req, res) => {
  try {
    const reason = req.body?.reason || "Manual desde Ajustes";
    const backupInfo = createBackupDisk(reason);
    res.json(backupInfo);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al crear la copia de seguridad" });
  }
});

app.get("/api/backup/list", (req, res) => {
  try {
    const backups = listBackupsDisk();
    res.json({
      success: true,
      backups,
      total: backups.length,
      currentAppVersion: CURRENT_APP_VERSION,
      currentSchemaVersion: CURRENT_SCHEMA_VERSION
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al obtener la lista de backups" });
  }
});

app.post("/api/backup/restore", (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Se requiere especificar el nombre de archivo de la copia de seguridad." });
    }
    const result = restoreBackupDisk(filename);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al restaurar desde la copia de seguridad" });
  }
});

app.post("/api/onboarding/create-home", async (req, res) => {
  const { homeName, userName, email, birthDate, birthTime, birthPlace, emoji } = req.body;
  const aiSigns = await calculateAIOldCartaNatal(birthDate, birthTime, birthPlace);
  const result = onboardingCreateHome(homeName, userName, birthDate, birthTime, birthPlace, emoji, aiSigns || undefined, email);
  res.json(result);
});

app.post("/api/onboarding/join-home", async (req, res) => {
  const { inviteCode, userName, email, birthDate, birthTime, birthPlace, emoji } = req.body;
  const rawCode = inviteCode || req.headers["x-home-code"] as string || "";
  const code = normalizeHomeCode(rawCode);
  
  if (!code) {
    return res.status(400).json({ error: "Se requiere un código de hogar para ingresar." });
  }
  
  if (!doesHomeExist(code)) {
    return res.status(404).json({ error: "El código de invitación ingresado no existe. Verifica e intenta de nuevo." });
  }

  homeContextStorage.run(code, async () => {
    const aiSigns = await calculateAIOldCartaNatal(birthDate, birthTime, birthPlace);
    const result = onboardingJoinHome(userName, birthDate, birthTime, birthPlace, emoji, aiSigns || undefined, email);
    res.json(result);
  });
});

app.post("/api/onboarding/enter-home", (req, res) => {
  const { homeCode } = req.body;
  if (!homeCode) {
    return res.status(400).json({ error: "Se requiere ingresar un código de hogar." });
  }
  const code = normalizeHomeCode(homeCode);
  if (!doesHomeExist(code)) {
    return res.status(404).json({ error: "El código de hogar ingresado no existe. ¿Seguro de que el código es correcto?" });
  }
  const store = getStoreByCode(code);
  res.json({
    success: true,
    home: store.home,
    users: store.users
  });
});

app.put("/api/users/:id", async (req, res) => {
  const { name, email, birthDate, birthTime, birthPlace, emoji, pushToken, alertPreferences } = req.body;
  const aiSigns = await calculateAIOldCartaNatal(birthDate, birthTime, birthPlace);
  const updated = updateUserProfile(
    req.params.id, 
    { name, email, birthDate, birthTime, birthPlace, emoji, pushToken, alertPreferences }, 
    aiSigns || undefined
  );
  if (!updated) {
    return res.status(404).json({ error: "Usuario no encontrado" });
  }
  res.json(updated);
});

app.post("/api/onboarding/reset", (req, res) => {
  resetDatabase();
  res.json({ success: true, store: getStore() });
});

app.post("/api/calendar", (req, res) => {
  const newItem = addCalendarItem(req.body);
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Nuevo evento/tarea",
    `${name} agregó: "${newItem.title}" al calendario.`,
    "calendar"
  );
  res.status(201).json(newItem);
});

app.put("/api/calendar/:id", (req, res) => {
  const updated = updateCalendarItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Item not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  if (req.body.status === "done") {
    addNotification(
      userId,
      "Tarea completada",
      `${name} completó la tarea: "${updated.title}". 🎉`,
      "calendar"
    );
  } else {
    addNotification(
      userId,
      "Calendario actualizado",
      `${name} actualizó "${updated.title}" en el calendario.`,
      "calendar"
    );
  }
  res.json(updated);
});

app.delete("/api/calendar/:id", (req, res) => {
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  const store = getStore();
  const item = store.calendarItems.find(i => i.id === req.params.id);
  const title = item ? item.title : "un elemento";
  
  const success = deleteCalendarItem(req.params.id);
  if (!success) return res.status(404).json({ error: "Item not found" });
  addNotification(
    userId,
    "Elemento eliminado",
    `${name} eliminó "${title}" del calendario.`,
    "calendar"
  );
  res.json({ success: true });
});

app.post("/api/pets", (req, res) => {
  const newPet = addPet(req.body);
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Mascota registrada",
    `${name} registró a la mascota ${newPet.name} en el hogar. 🐾`,
    "pet"
  );
  res.status(201).json(newPet);
});

app.put("/api/pets/:id", (req, res) => {
  const updated = updatePet(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Pet not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Mascota actualizada",
    `${name} actualizó el perfil de ${updated.name}.`,
    "pet"
  );
  res.json(updated);
});

app.delete("/api/pets/:id", (req, res) => {
  const store = getStore();
  const pet = store.pets.find(p => p.id === req.params.id);
  const petName = pet ? pet.name : "una mascota";
  const success = deletePet(req.params.id);
  if (!success) return res.status(404).json({ error: "Pet not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Mascota eliminada",
    `${name} eliminó a ${petName} del nido.`,
    "pet"
  );
  res.json({ success: true });
});

app.post("/api/pets/:id/vaccine", (req, res) => {
  const updated = addPetVaccine(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Pet not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Vacuna registrada",
    `${name} registró la vacuna "${req.body.name}" para ${updated.name}. 💉`,
    "pet"
  );
  res.json(updated);
});

app.post("/api/pets/:id/medication", (req, res) => {
  const updated = addPetMedication(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Pet not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Medicamento registrado",
    `${name} registró el medicamento "${req.body.name}" para ${updated.name}. 💊`,
    "pet"
  );
  res.json(updated);
});

app.post("/api/pets/:id/weight", (req, res) => {
  const updated = logPetWeight(req.params.id, req.body.weight);
  if (!updated) return res.status(404).json({ error: "Pet not found" });
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Peso registrado",
    `${name} registró un nuevo peso de ${req.body.weight} kg para ${updated.name}. ⚖️`,
    "pet"
  );
  res.json(updated);
});

app.post("/api/plants", async (req, res) => {
  try {
    const { name, photoUrl, photoUrls, species } = req.body;
    
    // Create first with defaults
    const newPlant = addPlant({
      name,
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=200",
      photoUrls: photoUrls || (photoUrl ? [photoUrl] : []),
      species: species || "Identificando...",
    });

    // Get home registered city
    const store = getStore();
    const homeCity = store.users?.[0]?.birthPlace || "Bogotá";

    // Build photo array to analyze
    const photosToAnalyze = photoUrls && photoUrls.length > 0 ? photoUrls : (photoUrl ? [photoUrl] : []);
    const hasUploadedPhotos = photosToAnalyze.some((p: string) => p && p.startsWith("data:image"));
    let aiResult: any = null;
    if (ai && !isQuotaExhausted()) {
      try {
        const parts = [];
        if (hasUploadedPhotos) {
          for (const p of photosToAnalyze) {
            if (p && p.startsWith("data:image")) {
              const cleanBase = p.replace(/^data:image\/\w+;base64,/, "");
              parts.push({ inlineData: { data: cleanBase, mimeType: "image/png" } });
            }
          }
        }

        const systemInstruction = `Eres un botánico experto de confianza especializado en identificar plantas y analizar su salud.
Tus respuestas son asertivas, claras, profesionales pero muy amigables, transmitiendo un tono de calidez natural colombiana (puedes usar palabras como "chévere", "de una", "pues", "vaina" de forma sutil, cercana y respetuosa). Elimina por completo los maullidos, ronroneos u otras expresiones felinas.

REQUISITO CRÍTICO DE UBICACIÓN (idealLocation):
- Describe de forma directa y fluida cuál es el rincón ideal del apartamento para este tipo de planta considerando el clima real de la ciudad registrada (por ejemplo, "En Bogotá, se recomienda ubicarla en un espacio interior muy luminoso, como la sala de estar, cerca de una ventana amplia...").
- NO incluyas frases de advertencia metatextuales ni directivas dirigidas al usuario tales como "no asumas dónde la tienes", "no te fíes de dónde la tienes ahora", "sin asumir su posición actual" o similares. Describe directamente la recomendación botánica ideal.

Retorna un JSON con este formato exacto:
{
  "identifiedSpecies": "Nombre científico real de la planta (ej: Monstera deliciosa)",
  "idealLocation": "Ubicación ideal en un apartamento en la ciudad registrada. Debe ser un párrafo asertivo, elegante y amigable que explique directamente cuál es el lugar idóneo en el apartamento para este clima.",
  "recommendedWatering": "Pauta de riego detallada para la planta considerando el clima de la ciudad registrada.",
  "currentStateDesc": "Descripción detallada del estado de salud actual. Si hay fotos, evalúalas minuciosamente. Si no hay fotos, describe detalladamente los requerimientos de salud generales de esta especie y si suele necesitar fertilizantes o abonos para un follaje óptimo.",
  "result": "healthy" o "alert" o "critical",
  "confidence": un número entre 0.0 y 1.0,
  "recommendations": [
    "Recomendación práctica 1 sobre nutrientes, abono o fertilización que le hace falta o requiere para estar más saludable",
    "Recomendación de mantenimiento 2",
    "Recomendación de cuidado 3"
  ]
}`;

        const prompt = hasUploadedPhotos
          ? `Analiza las fotos de la planta con nombre '${name}' en un apartamento de la ciudad de '${homeCity}'. Identifica su especie, ubicación ideal en apartamento para esa ciudad, pauta de riego y estado actual. Evalúa detalladamente si le falta fertilizante o qué nutrientes necesita para estar saludable.`
          : `Analiza basándote en el nombre de la planta '${name}' (especie o tipo: '${species || name}') en un apartamento de la ciudad de '${homeCity}'. Identifica su especie científica exacta, describe detalladamente la ubicación idónea en un apartamento para esa ciudad, su pauta de riego recomendada, y una guía sobre su estado óptimo de nutrientes y fertilización.`;
        
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.7,
          }
        });

        aiResult = JSON.parse(response.text || "{}");
      } catch (err) {
        recordQuotaFailure();
        console.error("Milo Info: Error en diagnóstico inicial, usando simulación", err);
      }
    }

    // Validate if aiResult has all required properties, otherwise discard it and use robust simulation
    const isValidDiagnosis = aiResult && 
      typeof aiResult === 'object' && 
      typeof aiResult.identifiedSpecies === 'string' &&
      typeof aiResult.idealLocation === 'string' &&
      typeof aiResult.recommendedWatering === 'string' &&
      typeof aiResult.currentStateDesc === 'string' &&
      (aiResult.result === 'healthy' || aiResult.result === 'alert' || aiResult.result === 'critical') &&
      Array.isArray(aiResult.recommendations);

    if (!isValidDiagnosis) {
      aiResult = null;
    }

    if (!aiResult) {
      // Custom simulated response
      const nameLower = (name || "").toLowerCase();
      let identifiedSpecies = species || "Planta Tropical de Interior";
      let idealLocation = `Dado el clima fresco y cambiante de ${homeCity}, el lugar ideal en tu apartamento es un rincón con excelente iluminación indirecta natural. Un salón o comedor bien iluminado, alejado de corrientes directas de viento frío, mantendrá sus hojas vibrantes y sanas.`;
      let recommendedWatering = `Riega moderadamente cada 7 u 8 días en ${homeCity}. Asegúrate de revisar que la superficie del sustrato esté seca antes de volver a regar.`;
      let currentStateDesc = "¡Sus hojas se ven estables y con buen porte! Para potenciar su desarrollo y mantener un color verde intenso, le vendría de maravilla un aporte mensual de fertilizante líquido para plantas de interior.";
      let result: "healthy" | "alert" | "critical" = "healthy";
      let recommendations = [
        "Aplica fertilizante líquido balanceado diluido una vez al mes durante las temporadas templadas para estimular un crecimiento vigoroso.",
        "Limpia el polvo acumulado en sus hojas con un paño húmedo para facilitar la respiración celular.",
        "Gira la maceta un poco cada semana para que reciba luz uniforme en todas sus ramas."
      ];

      if (nameLower.includes("monstera") || nameLower.includes("costilla")) {
        identifiedSpecies = "Monstera deliciosa (Costilla de Adán)";
        idealLocation = `En un apartamento en ${homeCity}, lo ideal es colocarla en la sala o cerca de un ventanal amplio con luz suave indirecta. Este ambiente imita la iluminación tamizada de las selvas, ideal para que sus hojas crezcan fuertes y desplieguen sus hermosas aberturas naturales.`;
        recommendedWatering = `Riego moderado cada 9 a 12 días en ${homeCity}. Reduce la frecuencia en épocas de mayor frío o lluvia.`;
        currentStateDesc = "Las hojas tienen un buen porte, pero para intensificar su color y apoyar el desarrollo de nuevas hojas gigantes, un abono rico en nitrógeno o humus de lombriz es muy recomendable.";
        recommendations[0] = "Añade humus de lombriz rico en nutrientes en la capa superior del sustrato una vez por temporada.";
      } else if (nameLower.includes("lengua") || nameLower.includes("suegra") || nameLower.includes("sansevieria") || nameLower.includes("sansi") || nameLower.includes("sans")) {
        identifiedSpecies = "Sansevieria trifasciata (Espada de San Jorge)";
        idealLocation = `Para este apartamento en ${homeCity}, es ideal ubicarla en un dormitorio, sala de estar o pasillo iluminado. Tolera muy bien la sombra, pero la luz indirecta media ayudará a que las líneas amarillas de sus bordes se mantengan muy definidas y brillantes.`;
        recommendedWatering = `Riego escaso y bien espaciado: aproximadamente cada 15 a 20 días en ${homeCity}. Espera a que el sustrato esté completamente seco.`;
        currentStateDesc = "La planta se encuentra firme y robusta. Para apoyar su excelente capacidad de purificación de aire, un aporte muy sutil de abono mineral soluble será beneficioso.";
        recommendations[0] = "Usa un abono específico para cactus y suculentas muy diluido solo una vez cada dos meses.";
      } else if (nameLower.includes("poto") || nameLower.includes("pothos") || nameLower.includes("liana") || nameLower.includes("hiedra") || nameLower.includes("teléfono") || nameLower.includes("telefono") || nameLower.includes("enredadera")) {
        identifiedSpecies = "Epipremnum aureum (Poto / Potus / Liana)";
        idealLocation = `Para tu apartamento en ${homeCity}, el Poto o Liana se adaptará de maravilla en un estante alto o colgado en la sala de estar o estudio. Agradece la luz indirecta brillante, que le ayudará a mantener el hermoso variegado de sus hojas, pero tolera bien espacios con menor luz pues.`;
        recommendedWatering = `Riego moderado: cada 8 a 10 días en ${homeCity}, dejando secar el sustrato por completo entre riegos. Evita encharcar para proteger sus raíces.`;
        currentStateDesc = "Las hojas lucen brillantes y con buen vigor para crecer en cascada. Para fomentar que sus lianas sigan extendiéndose con hojas grandes, un fertilizante líquido balanceado cada mes será estupendo.";
        recommendations[0] = "Usa un fertilizante universal para plantas de interior diluido en el riego cada 30 días.";
      } else if (nameLower.includes("helecho")) {
        identifiedSpecies = "Nephrolepis exaltata (Helecho de Espada)";
        idealLocation = `Para el clima de ${homeCity}, el baño o la cocina son lugares perfectos debido a la humedad del aire. Colócalo en un espacio con luz filtrada o semisombra, donde no reciba luz solar directa ni corrientes de aire secas.`;
        recommendedWatering = `Mantén el sustrato constantemente húmedo (pero no encharcado) regando cada 4 días y pulverizando sus hojas con agua tibia.`;
        currentStateDesc = "Las ramas se ven frondosas. No obstante, para evitar que las puntas se resequen, un fertilizante específico para helechos le aportará la nutrición exacta que necesita.";
        recommendations[0] = "Usa un fertilizante para helechos alto en nitrógeno diluido a la mitad de la dosis recomendada cada 6 semanas.";
      } else if (nameLower.includes("suculenta") || nameLower.includes("cactus") || nameLower.includes("aloe") || nameLower.includes("lola")) {
        identifiedSpecies = "Aloe vera / Suculenta";
        idealLocation = `Para tu apartamento en ${homeCity}, las suculentas y cactus necesitan la mayor cantidad de luz solar directa posible. Ubícalas justo al lado de una ventana muy soleada o en el balcón para evitar que se estiren buscando luz.`;
        recommendedWatering = `Riego muy escaso: aproximadamente cada 15 a 20 días en ${homeCity}, o cuando el sustrato esté completamente seco y las hojas se sientan ligeramente blandas.`;
        currentStateDesc = "La planta tiene una estructura compacta y saludable. Las suculentas no necesitan mucho abono, pero un sustrato bien drenante y un aporte mínimo de nutrientes específicos en épocas templadas les ayudará a florecer o crecer.";
        recommendations[0] = "Asegúrate de que la maceta tenga un excelente drenaje para evitar la acumulación de agua.";
      } else if (species && species !== "Identificando..." && species !== "Sin especie" && species.trim() !== "") {
        identifiedSpecies = species;
      } else if (name) {
        // Dynamic fallback based on user's custom name
        identifiedSpecies = name.charAt(0).toUpperCase() + name.slice(1) + " (Planta de interior)";
      }

      aiResult = {
        identifiedSpecies,
        idealLocation,
        recommendedWatering,
        currentStateDesc,
        result,
        confidence: 0.95,
        recommendations
      };
    }

    try {
      // Add the diagnosis to the history
      const firstDiagnosis: PlantDiagnosis = {
        id: `diag-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        image: hasUploadedPhotos ? photosToAnalyze.find((p: string) => p && p.startsWith("data:image")) || "" : "",
        result: aiResult.result,
        confidence: aiResult.confidence || 0.90,
        recommendations: aiResult.recommendations
      };

      newPlant.species = aiResult.identifiedSpecies;
      newPlant.idealLocation = aiResult.idealLocation;
      newPlant.recommendedWatering = aiResult.recommendedWatering;
      newPlant.currentStateDesc = aiResult.currentStateDesc;
      newPlant.aiDiagnoses = [firstDiagnosis];

      updatePlant(newPlant.id, newPlant);
    } catch (diagErr) {
      console.error("Milo Info: Error attaching diagnosis, using basic defaults miau", diagErr);
      newPlant.species = species || "Planta de interior";
      newPlant.idealLocation = `Cerca de una ventana con luz indirecta en tu apartamento de ${homeCity} miau.`;
      newPlant.recommendedWatering = "Riego regular cuando el sustrato esté seco miau.";
      newPlant.currentStateDesc = "¡Se ve genial! Recuerda regarla y alimentarla con mucho amor miau.";
      newPlant.aiDiagnoses = [{
        id: `diag-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        image: "",
        result: "healthy",
        confidence: 0.95,
        recommendations: [
          "🐾 Milo aconseja: Dale buena luz indirecta.",
          "Mantén un riego balanceado sin ahogarla miau.",
          "Consiéntela y limpia sus hojitas miau."
        ]
      }];
      updatePlant(newPlant.id, newPlant);
    }

    const userId = req.headers["x-user-id"] as string || "";
    const nameStr = getUserName(userId);
    addNotification(
      userId,
      "Nueva planta agregada",
      `${nameStr} agregó la planta "${newPlant.name}" al nido. 🌿`,
      "plant"
    );

    res.status(201).json(newPlant);
  } catch (routeErr: any) {
    console.error("DEBUG ERROR in POST /api/plants route handler:", routeErr);
    res.status(500).json({ error: routeErr.message || "Unknown error", stack: routeErr.stack });
  }
});

app.delete("/api/plants/:id", (req, res) => {
  const store = getStore();
  const plant = store.plants.find(p => p.id === req.params.id);
  const plantName = plant ? plant.name : "una planta";
  const success = deletePlant(req.params.id);
  if (!success) return res.status(404).json({ error: "Plant not found" });
  
  // Invalidate cached AI greetings for this home code so Milo reflects the plant removal immediately
  const homeCode = (req.headers["x-home-code"] as string) || "HOGARPELUDO";
  Object.keys(greetingCache).forEach(k => {
    if (k.toLowerCase().includes(homeCode.toLowerCase())) delete greetingCache[k];
  });

  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Planta eliminada",
    `${name} eliminó la planta "${plantName}" del nido.`,
    "plant"
  );
  res.json({ success: true });
});

app.put("/api/plants/:id", (req, res) => {
  const updated = updatePlant(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Plant not found" });
  res.json(updated);
});

app.post("/api/plants/:id/identify", async (req, res) => {
  try {
    const store = getStore();
    const plant = store.plants.find(p => p.id === req.params.id);
    if (!plant) return res.status(404).json({ error: "Plant not found" });

    const homeCity = store.users?.[0]?.birthPlace || "Bogotá";
    const plantName = plant.name;
    const currentSpecies = plant.species || "";
    
    let identifiedSpecies = "";
    let recommendedWatering = "";
    let idealLocation = "";

    if (ai && !isQuotaExhausted()) {
      try {
        const prompt = `Analiza la planta con nombre '${plantName}' (especie actual registrada: '${currentSpecies}') en la ciudad de '${homeCity}'.
Identifica su especie botánica exacta (nombre científico y común en español, ej: 'Tradescantia zebrina (Amor de hombre)', 'Syngonium podophyllum (Teléfono)', 'Epipremnum aureum (Pothos)', 'Monstera deliciosa (Costilla de Adán)', etc.). NUNCA uses la frase genérica 'Planta de interior'.
Suministra también una pauta de riego concisa y clara de 1 o 2 frases máximo (ej: 'Regar cada 8 a 10 días comprobando que la capa superior de tierra esté seca antes de regar') y su ubicación ideal con luz (ej: 'Luz indirecta brillante o semisombra cerca a ventana bien iluminada').

Responde estrictamente en JSON:
{
  "species": "Especie botánica y común exacta",
  "recommendedWatering": "Pauta de riego clara y resumida",
  "idealLocation": "Pauta de iluminación y ubicación clara y resumida"
}`;

        const contents: any[] = [{ text: prompt }];
        if (plant.photoUrl && plant.photoUrl.startsWith("data:image/")) {
          const cleanBase64 = plant.photoUrl.replace(/^data:image\/\w+;base64,/, "");
          contents.unshift({ inlineData: { data: cleanBase64, mimeType: "image/png" } });
        }

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
          }
        });

        const parsed = JSON.parse(response.text || "{}");
        if (parsed.species) identifiedSpecies = parsed.species;
        if (parsed.recommendedWatering) recommendedWatering = parsed.recommendedWatering;
        if (parsed.idealLocation) idealLocation = parsed.idealLocation;
      } catch (err) {
        console.error("Error identificando especie con Gemini:", err);
      }
    }

    // Fallback if Gemini unavailable or returned empty
    if (!identifiedSpecies) {
      const lower = plantName.toLowerCase();
      if (lower.includes("galaxia") || lower.includes("tradescantia") || lower.includes("zebrina")) {
        identifiedSpecies = "Tradescantia zebrina (Amor de hombre)";
        recommendedWatering = "Regar cada 8 a 10 días, asegurando que los primeros centímetros de tierra estén secos antes de regar.";
        idealLocation = "Luz indirecta brillante para intensificar sus hermosos tonos púrpuras y plateados.";
      } else if (lower.includes("monstera") || lower.includes("costilla")) {
        identifiedSpecies = "Monstera deliciosa (Costilla de Adán)";
        recommendedWatering = "Regar cada 7 a 10 días permitiendo drenaje completo.";
        idealLocation = "Luz indirecta brillante cerca a una ventana ventilada.";
      } else if (lower.includes("poto") || lower.includes("pothos") || lower.includes("milo")) {
        identifiedSpecies = "Epipremnum aureum (Pothos Dorado)";
        recommendedWatering = "Regar cada 6 a 8 días cuando el sustrato se sienta ligero.";
        idealLocation = "Espacio bien iluminado o semisombra en interiores.";
      } else if (lower.includes("sansevieria") || lower.includes("lengua")) {
        identifiedSpecies = "Sansevieria trifasciata (Lengua de Suegra)";
        recommendedWatering = "Regar cada 15 a 20 días con moderación.";
        idealLocation = "Se adapta a cualquier iluminación, ideal luz indirecta.";
      } else if (lower.includes("suculenta") || lower.includes("echeveria")) {
        identifiedSpecies = "Echeveria elegans (Rosa de Alabastro)";
        recommendedWatering = "Regar cada 10 a 14 días solo en la base.";
        idealLocation = "Luz solar directa o indirecta intensa.";
      } else if (lower.includes("helecho")) {
        identifiedSpecies = "Nephrolepis exaltata (Helecho Rizado)";
        recommendedWatering = "Regar 2 a 3 veces por semana manteniendo humedad constante.";
        idealLocation = "Sombra bien iluminada con alta humedad ambiental.";
      } else {
        identifiedSpecies = `${plantName} (Variedad Ornamental)`;
        recommendedWatering = "Regar cada 7 a 9 días comprobando la humedad del sustrato.";
        idealLocation = "Ubicación interior con luz natural indirecta.";
      }
    }

    const updates: Partial<Plant> = {
      species: identifiedSpecies
    };
    if (recommendedWatering) updates.recommendedWatering = recommendedWatering;
    if (idealLocation) updates.idealLocation = idealLocation;

    const updated = updatePlant(req.params.id, updates);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/plants/:id/action", (req, res) => {
  const { type, performedBy } = req.body;
  const updated = addPlantAction(req.params.id, type, performedBy);
  if (!updated) return res.status(404).json({ error: "Plant not found" });
  
  const userId = req.headers["x-user-id"] as string || performedBy || "";
  const name = getUserName(userId);
  
  const actionEmojiMap: Record<string, string> = {
    water: "regó 💧",
    fertilize: "fertilizó 🧪",
    prune: "podó ✂️",
    repot: "trasplantó 🪴",
    photo: "le tomó una foto 📸"
  };
  const actionText = actionEmojiMap[type] || `realizó una acción (${type})`;
  
  addNotification(
    userId,
    "Cuidado de planta",
    `${name} ${actionText} a la planta "${updated.name}".`,
    "plant"
  );
  res.json(updated);
});

app.post("/api/plants/bulk-action", (req, res) => {
  const { ids, type, performedBy } = req.body;
  const updated = bulkPlantAction(ids, type, performedBy);
  res.json(updated);
});

app.post("/api/plants/milo-analysis", async (req, res) => {
  try {
    const store = getStore();
    const plants = store.plants || [];
    if (plants.length === 0) {
      return res.json({
        success: true,
        message: "No hay plantas actualmente registradas en el hogar.",
        analyzedCount: 0,
        unknownCount: 0,
        plants: []
      });
    }

    const homeCity = store.users?.[0]?.birthPlace || "Bogotá";
    let unknownCount = 0;
    let identifiedCount = 0;

    for (const plant of plants) {
      const speciesLower = (plant.species || "").toLowerCase().trim();
      const isUnknown = !plant.species || 
        speciesLower.includes("desconocid") || 
        speciesLower.includes("por identificar") || 
        speciesLower.includes("identificando") || 
        speciesLower.includes("sin especie") || 
        speciesLower === "planta de interior" ||
        speciesLower === plant.name.toLowerCase().trim();

      if (isUnknown) {
        unknownCount++;
        let identifiedSpecies = "";
        let recommendedWatering = "";
        let idealLocation = "";
        let currentStateDesc = "";

        if (ai && !isQuotaExhausted()) {
          try {
            const prompt = `Analiza la planta de interior '${plant.name}' en un hogar en la ciudad de '${homeCity}'.
Identifica su especie botánica exacta (nombre científico y común). Proporciona pautas de cuidado específicas:
1. Frecuencia y forma de riego ideal en ${homeCity}.
2. Ubicación e iluminación adecuada en apartamento.
3. Cuidados de nutrición o fertilización.

Responde estrictamente en JSON:
{
  "species": "Especie botánica y común",
  "recommendedWatering": "Pauta de riego específica",
  "idealLocation": "Ubicación e iluminación recomendada",
  "currentStateDesc": "Nutrientes y recomendaciones de fertilización"
}`;
            const contents: any[] = [{ text: prompt }];
            if (plant.photoUrl && plant.photoUrl.startsWith("data:image/")) {
              const cleanBase64 = plant.photoUrl.replace(/^data:image\/\w+;base64,/, "");
              contents.unshift({ inlineData: { data: cleanBase64, mimeType: "image/png" } });
            }

            const response = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents,
              config: { responseMimeType: "application/json", temperature: 0.4 }
            });
            const parsed = JSON.parse(response.text || "{}");
            if (parsed.species) identifiedSpecies = parsed.species;
            if (parsed.recommendedWatering) recommendedWatering = parsed.recommendedWatering;
            if (parsed.idealLocation) idealLocation = parsed.idealLocation;
            if (parsed.currentStateDesc) currentStateDesc = parsed.currentStateDesc;
          } catch (e) {
            console.error("Milo plant analysis AI error:", e);
          }
        }

        if (!identifiedSpecies) {
          const nameLower = plant.name.toLowerCase();
          if (nameLower.includes("monstera") || nameLower.includes("costilla")) {
            identifiedSpecies = "Monstera deliciosa (Costilla de Adán)";
            recommendedWatering = `Regar cada 7 a 9 días en ${homeCity}, asegurando secado de la capa superior.`;
            idealLocation = "Luz indirecta brillante cerca a ventana ventilada.";
            currentStateDesc = "Abono foliar o humus de lombriz una vez al mes para follaje frondoso.";
          } else if (nameLower.includes("poto") || nameLower.includes("pothos") || nameLower.includes("milo")) {
            identifiedSpecies = "Epipremnum aureum (Pothos Dorado)";
            recommendedWatering = "Regar cada 6 a 8 días cuando el sustrato se sienta ligero.";
            idealLocation = "Repisa o maceta colgante con buena luz natural indirecta.";
            currentStateDesc = "Fertilizante líquido balanceado para potenciar el verdor.";
          } else if (nameLower.includes("sansevieria") || nameLower.includes("lengua")) {
            identifiedSpecies = "Sansevieria trifasciata (Lengua de Suegra)";
            recommendedWatering = "Regar con moderación cada 15 a 20 días.";
            idealLocation = "Luz indirecta o ambiente templado de interior.";
            currentStateDesc = "Muy resistente y purificadora del aire.";
          } else if (nameLower.includes("suculenta") || nameLower.includes("echeveria")) {
            identifiedSpecies = "Echeveria elegans (Suculenta de Interior)";
            recommendedWatering = "Regar directo al sustrato cada 12 a 15 días con buen drenaje.";
            idealLocation = "Luz solar directa o indirecta intensa.";
            currentStateDesc = "Evitar encharcamientos sobre las rosetas de hojas.";
          } else {
            identifiedSpecies = `${plant.name} (Variedad Ornamental)`;
            recommendedWatering = `Regar cada 7 a 10 días según humedad en ${homeCity}.`;
            idealLocation = "Luz indirecta filtrada en espacio interior luminoso.";
            currentStateDesc = "Cuidados estándar de follaje de interior.";
          }
        }

        updatePlant(plant.id, {
          species: identifiedSpecies,
          recommendedWatering: recommendedWatering || plant.recommendedWatering,
          idealLocation: idealLocation || plant.idealLocation,
          currentStateDesc: currentStateDesc || plant.currentStateDesc
        });
        identifiedCount++;

        addNotification(
          "all",
          "🌱 Milo identificó una planta desconocida",
          `Milo analizó la planta "${plant.name}" y determinó que es ${identifiedSpecies}. ¡Ya tienes sus pautas de riego y luz disponibles!`,
          "plant"
        );
      } else {
        if (!plant.recommendedWatering || !plant.idealLocation) {
          updatePlant(plant.id, {
            recommendedWatering: plant.recommendedWatering || `Regar según especie (${plant.species}) cada 7 a 10 días.`,
            idealLocation: plant.idealLocation || `Espacio con iluminación adecuada para ${plant.species}.`
          });
        }
      }
    }

    const homeCode = (req.headers["x-home-code"] as string) || "HOGARPELUDO";
    Object.keys(greetingCache).forEach(k => {
      if (k.toLowerCase().includes(homeCode.toLowerCase())) delete greetingCache[k];
    });

    res.json({
      success: true,
      message: unknownCount > 0 
        ? `Milo analizó el jardín e identificó ${identifiedCount} planta(s) que requerían clasificación con sus cuidados específicos.`
        : `Milo revisó las ${plants.length} plantas del hogar: todas tienen su especie e instrucciones de cuidado al día.`,
      analyzedCount: plants.length,
      unknownCount,
      identifiedCount,
      plants: getStore().plants
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Error en el análisis de plantas con Milo" });
  }
});

app.post("/api/wishes", (req, res) => {
  const newWish = addWish(req.body);
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Nuevo antojo/deseo",
    `${name} agregó un deseo: "${newWish.name}" para "${newWish.owner}". ✨`,
    "wish"
  );
  res.status(201).json(newWish);
});

app.put("/api/wishes/:id", (req, res) => {
  const updated = updateWish(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Wish not found" });
  
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  const statusLabels: Record<string, string> = {
    desired: "deseado",
    planned: "planeado",
    saving: "ahorrando",
    purchased: "comprado 🎉",
    discarded: "descartado"
  };
  const statusLabel = statusLabels[updated.status] || updated.status;
  
  addNotification(
    userId,
    "Deseo actualizado",
    `${name} cambió el estado de "${updated.name}" a "${statusLabel}".`,
    "wish"
  );
  res.json(updated);
});

app.delete("/api/wishes/:id", (req, res) => {
  const store = getStore();
  const wish = store.wishes.find(w => w.id === req.params.id);
  const wishName = wish ? wish.name : "un deseo";
  const success = deleteWish(req.params.id);
  if (!success) return res.status(404).json({ error: "Wish not found" });
  
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Deseo eliminado",
    `${name} eliminó "${wishName}" de la lista de antojos.`,
    "wish"
  );
  res.json({ success: true });
});

app.post("/api/memories", (req, res) => {
  const newMemory = addMemory(req.body);
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Nuevo recuerdo guardado",
    `${name} guardó un nuevo recuerdo: "${newMemory.title}" del ${newMemory.date}. 📸`,
    "memory"
  );
  res.status(201).json(newMemory);
});

app.delete("/api/memories/:id", (req, res) => {
  const store = getStore();
  const mem = store.memories.find(m => m.id === req.params.id);
  const title = mem ? mem.title : "un recuerdo";
  const success = deleteMemory(req.params.id);
  if (!success) return res.status(404).json({ error: "Memory not found" });
  
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Recuerdo eliminado",
    `${name} eliminó el recuerdo "${title}" del baúl.`,
    "memory"
  );
  res.json({ success: true });
});

app.put("/api/memories/:id", (req, res) => {
  const updated = updateMemory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Memory not found" });
  
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Recuerdo actualizado",
    `${name} actualizó el recuerdo "${updated.title}" en el baúl. ✨`,
    "memory"
  );
  res.json(updated);
});

app.post("/api/documents", (req, res) => {
  const newDoc = addDocument(req.body);
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Documento subido",
    `${name} subió el documento "${newDoc.title}". 📄`,
    "document"
  );
  res.status(201).json(newDoc);
});

app.delete("/api/documents/:id", (req, res) => {
  const store = getStore();
  const docItem = store.documents.find(d => d.id === req.params.id);
  const title = docItem ? docItem.title : "un documento";
  const success = deleteDocument(req.params.id);
  if (!success) return res.status(404).json({ error: "Document not found" });
  
  const userId = req.headers["x-user-id"] as string || "";
  const name = getUserName(userId);
  addNotification(
    userId,
    "Documento eliminado",
    `${name} eliminó el documento "${title}".`,
    "document"
  );
  res.json({ success: true });
});

app.put("/api/settings", (req, res) => {
  const updated = updateHomeSettings(req.body);
  res.json(updated);
});

// ==========================================
// MAPA DE EMOCIONES (SINTONÍA) SYNC ENDPOINTS
// ==========================================

app.get("/api/sintonia/checkins", (req, res) => {
  res.json(getEmotionCheckins());
});

app.post("/api/sintonia/checkins", (req, res) => {
  const { checkins } = req.body;
  if (!Array.isArray(checkins)) {
    return res.status(400).json({ error: "Checkins debe ser un arreglo válido." });
  }
  const oldCheckins = getEmotionCheckins();
  const updated = saveEmotionCheckins(checkins);

  try {
    const userId = req.headers["x-user-id"] as string || "";
    if (userId && checkins.length > oldCheckins.length) {
      const newCheckin = checkins[checkins.length - 1];
      if (newCheckin && newCheckin.userId === userId) {
        const name = getUserName(userId);
        const emotionName = newCheckin.emotion;
        addNotification(
          userId,
          "Sintonía Emocional",
          `${name} ha registrado una nueva emoción en el mapa: ${emotionName}.`,
          "salud"
        );
      }
    }
  } catch (e) {
    console.error("Error creating notification for emotion checkin:", e);
  }

  res.json(updated);
});

app.get("/api/sintonia/custom-emotions", (req, res) => {
  res.json(getCustomEmotions());
});

app.post("/api/sintonia/custom-emotions", (req, res) => {
  const { customEmotions } = req.body;
  if (!Array.isArray(customEmotions)) {
    return res.status(400).json({ error: "customEmotions debe ser un arreglo válido." });
  }
  const updated = saveCustomEmotions(customEmotions);
  res.json(updated);
});

// ==========================================
// EMOTIONAL CHECK-INS & HOME PERSONALITY ENDPOINTS
// ==========================================

app.get("/api/checkins", (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const list = getCheckins(dateStr);
  res.json(list);
});

app.post("/api/checkins", (req, res) => {
  const { userId, mood, connectionFeeling, homePerception, date } = req.body;
  if (!userId || !mood || !connectionFeeling || !homePerception) {
    return res.status(400).json({ error: "Faltan campos obligatorios para el registro emocional." });
  }
  const dateStr = date || new Date().toISOString().split("T")[0];
  const checkin = addCheckin({
    userId,
    date: dateStr,
    mood,
    connectionFeeling,
    homePerception
  });
  
  const moodLabels: Record<string, string> = {
    calm: "Tranquilidad 🌸",
    tired: "Cansancio 😴",
    energetic: "Energía pura ⚡",
    sensitive: "Sensibilidad 🥺"
  };
  const moodText = moodLabels[mood] || mood;
  const name = getUserName(userId);
  addNotification(
    userId,
    "Sintonía Emocional",
    `${name} registró su sintonía del día: ${moodText}.`,
    "salud"
  );
  
  const personalityState = getHomePersonalityState(dateStr);
  res.json({ checkin, personalityState });
});

app.get("/api/ai/astro-profile/:userId", (req, res) => {
  const { userId } = req.params;
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const profile = getAstroProfile(userId, dateStr);
  res.json(profile);
});

app.get("/api/ai/home-personality", (req, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const state = getHomePersonalityState(dateStr);
  res.json(state);
});

function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// SALUD DEL HOGAR (HOME WELLNESS) APIS
// ==========================================

app.get("/api/salud-hogar", (req, res) => {
  try {
    const date = (req.query.date as string) || getLocalDateStr();
    const forceReflexion = req.query.forceReflexion === "true";
    
    // Get start of the week for week-specific challenges (let's say Monday)
    const d = new Date(date + "T12:00:00"); // avoid timezone shift issues
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday ...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayDate = new Date(d);
    mondayDate.setDate(d.getDate() + diffToMon);
    const weekStartDate = mondayDate.toISOString().split("T")[0];

    const questions = getOrCreateDailyQuestions(date, forceReflexion);
    const challenges = getOrCreateActiveChallenges(weekStartDate);
    const indicators = calculateSaludIndicators();
    
    const store = getStore();
    res.json({
      date,
      weekStartDate,
      questions,
      challenges,
      indicators,
      answers: store.dailyAnswers || [],
      frascoMessages: store.frascoMessages || [],
      cierresMensuales: store.cierresMensuales || []
    });
  } catch (error) {
    console.error("Error in GET /api/salud-hogar:", error);
    res.status(500).json({ error: "No se pudo cargar la información de bienestar del hogar" });
  }
});

app.post("/api/salud-hogar/answer", (req, res) => {
  try {
    const { questionId, category, userId, score, textResponse, date } = req.body;
    if (!questionId || !category || !userId || !date) {
      return res.status(400).json({ error: "Faltan campos obligatorios para registrar respuesta." });
    }
    const ans = submitQuestionAnswer({
      questionId,
      category,
      userId,
      score,
      textResponse,
      date
    });
    
    const name = getUserName(userId);
    addNotification(
      userId,
      "Pregunta diaria respondida",
      `${name} respondió una pregunta de sintonía diaria. ✨`,
      "salud"
    );
    res.json({ success: true, answer: ans, indicators: calculateSaludIndicators() });
  } catch (error) {
    console.error("Error in POST /api/salud-hogar/answer:", error);
    res.status(500).json({ error: "Error interno al guardar la respuesta" });
  }
});

app.post("/api/salud-hogar/challenge/toggle", (req, res) => {
  try {
    const { id, userId, completed } = req.body;
    if (!id || !userId) {
      return res.status(400).json({ error: "Faltan id del reto o de usuario." });
    }
    const updated = toggleSaludChallenge(id, userId, completed);
    if (!updated) {
      return res.status(404).json({ error: "Reto no encontrado." });
    }
    
    if (completed) {
      const name = getUserName(userId);
      addNotification(
        userId,
        "Reto completado",
        `${name} completó el reto semanal: "${updated.title}". 🌟`,
        "salud"
      );
    }
    res.json({ success: true, challenge: updated, indicators: calculateSaludIndicators() });
  } catch (error) {
    console.error("Error in POST /api/salud-hogar/challenge/toggle:", error);
    res.status(500).json({ error: "Error al actualizar estado del reto" });
  }
});

app.post("/api/salud-hogar/challenge/add", (req, res) => {
  try {
    const { weekStartDate, title, category } = req.body;
    if (!weekStartDate || !title || !category) {
      return res.status(400).json({ error: "Faltan campos obligatorios para guardar el reto personalizado." });
    }
    const challenge = addCustomSaludChallenge(weekStartDate, title, category);
    
    const userId = req.headers["x-user-id"] as string || "";
    const name = getUserName(userId);
    addNotification(
      userId,
      "Nuevo reto",
      `${name} creó un nuevo reto personalizado: "${challenge.title}". 🎯`,
      "salud"
    );
    res.json({ success: true, challenge, indicators: calculateSaludIndicators() });
  } catch (error) {
    console.error("Error in POST /api/salud-hogar/challenge/add:", error);
    res.status(500).json({ error: "No se pudo agregar el reto personalizado." });
  }
});

app.post("/api/salud-hogar/frasco", (req, res) => {
  try {
    const { senderId, text, emoji } = req.body;
    if (!senderId || !text) {
      return res.status(400).json({ error: "El remitente y el texto son obligatorios." });
    }
    const msg = addFrascoMessage({ senderId, text, emoji });
    
    const name = getUserName(senderId);
    addNotification(
      senderId,
      "Mensaje al frasco",
      `${name} guardó un mensajito de agradecimiento en el frasco. 💌`,
      "salud"
    );
    res.json({ success: true, message: msg });
  } catch (error) {
    console.error("Error in POST /api/salud-hogar/frasco:", error);
    res.status(500).json({ error: "Error al guardar el agradecimiento en el frasco" });
  }
});

app.post("/api/salud-hogar/cierre-mensual", async (req, res) => {
  try {
    const { month } = req.body; // e.g. "2026-06"
    if (!month) {
      return res.status(400).json({ error: "El mes es obligatorio para realizar el cierre." });
    }

    const store = getStore();
    const indicators = calculateSaludIndicators(month);

    // Gather statistics for this month's closed events
    const completedChallengesCount = (store.saludChallenges || []).filter(c => c.completed).length;
    const frascoMessagesCount = (store.frascoMessages || []).length;
    const completedTasksCount = store.calendarItems.filter(i => i.status === "done").length;
    const eventsCount = store.calendarItems.filter(i => i.type === "event").length;
    const memoriesCount = store.memories.length;

    let aiReflection = `¡Miau! Felicitaciones Mafe y Benja por completar un maravilloso mes juntos en el nidito. 🐾 

Este mes hemos visto una hermosa energía circular de Conexión (${indicators.conexion}%), Armonía del hogar (${indicators.armonia}%) y Bienestar general (${indicators.bienestar}%). Hemos guardado ${frascoMessagesCount} papelitos de gratitud en el Frasco de la Convivencia y completado ${completedChallengesCount} retos reconfortantes.

Como su fiel gatito consejero, les recuerdo que cada pequeña caricia, palabra de agradecimiento y rincón ordenado suma paz al alma de nuestro hogar. ¡Sigan cultivando este nido de amor con tanta paciencia y ronroneos! Con amor infinito, Milo. 🐱✨`;

    if (ai) {
      try {
        const prompt = `Actúas como Milo, el gatito asistente de inteligencia artificial y consejero emocional del nido familiar de Mafe & Benja.
Eres tierno, empático, amoroso, y te expresas con tiernos maullidos ocasionales y sutiles términos gatunos cariñosos ("miau", "ronroneo", "garritas", "nidito", "rasguño cariñoso").
Tu tarea consiste en generar el análisis reflexivo mensual para el cierre de mes del bienestar del hogar para el periodo de ${month}.

A continuación te proveo las estadísticas reales:
- Promedio de Conexión Emocional (tiempo juntos, detalles, afecto): ${indicators.conexion}/100.
- Promedio de Armonía de Casa (cooperación, limpieza, tareas compartidas): ${indicators.armonia}/100.
- Promedio de Bienestar Individual (salud, descanso, ánimo): ${indicators.bienestar}/100.
- Retos semanales completados con éxito: ${completedChallengesCount}.
- Notas de agradecimiento y cariño acumuladas en el Frasco del Hogar: ${frascoMessagesCount}.
- Tareas domésticas y actividades marcadas como completadas en el calendario común: ${completedTasksCount}.
- Eventos de vida y recuerdos guardados: ${memoriesCount}.

Por favor, redacta un informe emotivo de cierre:
1. Una introducción cálida con un "Miau" de orgullo celebrando su esfuerzo.
2. Un análisis tierno pero sabio de cómo se vieron reflejados sus indicadores: la cercanía de la Conexión, la estabilidad de la Armonía, y la vitalidad del Bienestar.
3. Propón 2 o 3 consejos prácticos, amorosos y libres de costo para mejorar o mantener estos niveles el próximo mes basados puramente en estos números.
4. Despídete recordándoles que los amas mucho y que el hogar de Mafe, Benja y Milo es el mejor nido de amor del mundo, cerrando con un ronroneo tierno de felicidad.

Por favor exprésate estrictamente en español, con un formato de párrafos fluido y acogedor utilizando Markdown sutil.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });

        if (response.text) {
          aiReflection = response.text;
        }
      } catch (gemIniErr) {
        console.error("Gemini monthly closure generation failed, fallback to simulated reflection:", gemIniErr);
      }
    }

    const newCierre = addCierreMensual({
      id: `cier-${month}-${Date.now()}`,
      month,
      averageConexion: indicators.conexion,
      averageArmonia: indicators.armonia,
      averageBienestar: indicators.bienestar,
      completedChallengesCount,
      frascoMessagesCount,
      completedTasksCount,
      eventsCount,
      memoriesCount,
      aiReflection,
      dateCierre: new Date().toISOString().split("T")[0]
    });

    res.json({ success: true, cierre: newCierre });
  } catch (error) {
    console.error("Error in POST /api/salud-hogar/cierre-mensual:", error);
    res.status(500).json({ error: "Error al generar el cierre de mes con inteligencia artificial" });
  }
});

app.post("/api/salud-hogar/resumen-diario", async (req, res) => {
  try {
    const { date } = req.body; // e.g. "2026-06-30"
    if (!date) {
      return res.status(400).json({ error: "La fecha es obligatoria" });
    }

    const store = getStore();
    const answers = (store.dailyAnswers || []).filter(a => a.date === date);
    
    // Calculate overall house wellness indicators to make the daily report coherent
    const indicators = calculateSaludIndicators();
    const overallScore = Math.round((indicators.conexion + indicators.armonia + indicators.bienestar) / 3);

    // STATE 1: No answers for today
    if (answers.length === 0) {
      const textResponse = `¡Miau! Hoy aún no se han registrado respuestas diarias de sintonía en el nido. 

Sin embargo, la energía de su hogar esta semana se mantiene con un pulso acogedor del **${overallScore}%** de bienestar acumulado, reflejado en un **${indicators.conexion}%** de Conexión, **${indicators.armonia}%** de Armonía de casa y **${indicators.bienestar}%** de Bienestar personal. 

¡Los invito a responder las preguntas diarias de hoy para que Milo pueda calcular su sintonía exacta del día! 🐾✨`;

      return res.json({
        hasSummary: true,
        alignmentScore: overallScore,
        textResponse,
        answersCount: 0
      });
    }

    const mafeAnswers = answers.filter(a => a.userId === "mafe");
    const benjaAnswers = answers.filter(a => a.userId === "benja");
    const isAllAnswered = mafeAnswers.length >= 3 && benjaAnswers.length >= 3;

    // Compute sintonía alignment comparison
    const sharedCategories = ["conexion", "armonia", "bienestar"];
    let alignmentScore = 100;
    let categoryCount = 0;

    sharedCategories.forEach(cat => {
      const mafeAns = mafeAnswers.find(a => a.category === cat);
      const benjaAns = benjaAnswers.find(a => a.category === cat);
      if (mafeAns && benjaAns) {
        const diff = Math.abs((mafeAns.score || 0) - (benjaAns.score || 0));
        alignmentScore -= diff * 15; // 15 points off per difference
        categoryCount++;
      }
    });

    alignmentScore = Math.max(25, alignmentScore);

    // STATE 2: Only one user has answered
    if (!isAllAnswered) {
      const hasMafe = mafeAnswers.length > 0;
      const answeredUser = hasMafe ? "Mafe" : "Benja";
      const pendingUser = hasMafe ? "Benja" : "Mafe";

      // Calculate single user's average score from 1-5 to percentage
      const scoresSum = answers.reduce((sum, a) => sum + (a.score || 0), 0);
      const singleUserAvg = Math.round((scoresSum / answers.length) * 20);
      const blendedScore = Math.round((singleUserAvg + overallScore) / 2);

      const textResponse = `¡Miau! Por ahora, solo **${answeredUser}** ha compartido su sintonía de hoy. Su energía actual tiene un promedio de **${singleUserAvg}%**, lo que vibra con la armonía del nido en un **${blendedScore}%** provisional. 

Solo falta que **${pendingUser}** comparta su sentir en las categorías de hoy para calcular la sintonía final y revelar el miau-consejo estelar de Milo. ¡Anímense a sintonizar su energía hoy! 🐾💖`;

      return res.json({
        hasSummary: true,
        alignmentScore: blendedScore,
        textResponse,
        answersCount: answers.length
      });
    }

    // STATE 3: Both have answered (Complete Sintonía)
    let textResponse = `¡Excelente miau! Ambos completaron las preguntas de hoy. Sintonía total del día: **${alignmentScore}%** 💖. Se nota que su nido rebosa de amor y cuidado mutuo. Sus respuestas muestran que están muy alineados y cuidando de su bienestar.`;

    if (ai && !isQuotaExhausted()) {
      try {
        const answersStr = answers.map(a => `- ${a.userId === 'mafe' ? 'Mafe' : 'Benja'} opinó sobre ${a.category} con puntaje ${a.score}/5: "${a.textResponse || 'Sin comentario escrito'}".`).join("\n");
        const prompt = `Actúas como Milo, el gatito consejero sabio, tierno y protector de Mafe y Benja.
A continuación se muestran sus respuestas diarias en el sintonizador emocional de hoy (${date}):
${answersStr}

Genera un resumen súper cariñoso, sabio y constructivo (máximo 4 oraciones) de cómo se encuentran los dos hoy, mencionando su sintonía real de hoy (${alignmentScore}%). Dales un miau-consejo tierno para mantener la armonía. 

REGLAS ABSOLUTAS:
- Expresa tu mensaje con cariño gatuno natural (un "miau", "ronroneo", "nidito").
- Está TOTALMENTE PROHIBIDO usar palabras como "IA", "AI", "Inteligencia Artificial", "algoritmo", "actualizado", "modelo", "generado" o cualquier término técnico. Habla como un gatito sabio real que vive en su hogar.
- Usa Markdown sutil (como poner en negrita nombres o palabras importantes).`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });

        if (response.text) {
          textResponse = response.text;
        }
      } catch (err) {
        console.error("Error generating daily summary via Gemini:", err);
      }
    }

    res.json({
      hasSummary: true,
      alignmentScore,
      textResponse,
      answersCount: answers.length
    });
  } catch (err: any) {
    console.error("Error in POST /api/salud-hogar/resumen-diario:", err);
    res.status(500).json({ error: err.message || "Error" });
  }
});

// ==========================================
// BUDGET & TEMPLATES APIS (Presupuesto)
// ==========================================

app.get("/api/budget", (req, res) => {
  res.json(getBudgetStore());
});

app.post("/api/budget/item", (req, res) => {
  try {
    const { type, amount, category, account, destinationAccount, date, description, fortnightId } = req.body;
    if (!type || typeof amount !== 'number' || !category || !account || !date || !fortnightId) {
      return res.status(400).json({ error: "Faltan campos obligatorios para el registro budget." });
    }
    const item = addBudgetItem({
      type,
      amount,
      category,
      account,
      destinationAccount,
      date,
      description: description || "",
      fortnightId
    });
    
    const userId = req.headers["x-user-id"] as string || "";
    const name = getUserName(userId);
    const typeText = type === "income" ? "ingreso 💰" : (type === "expense" ? "gasto 💸" : "transferencia 🔄");
    addNotification(
      userId,
      "Transacción de presupuesto",
      `${name} registró un ${typeText} de $${amount} en "${category}".`,
      "budget"
    );
    
    res.json(item);
  } catch (err: any) {
    console.error("Error al registrar movimiento:", err);
    res.status(400).json({ error: err.message || "Error al agregar movimiento." });
  }
});

app.put("/api/budget/item/:id", (req, res) => {
  try {
    const updated = updateBudgetItem(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/budget/item/:id", (req, res) => {
  const success = deleteBudgetItem(req.params.id);
  res.json({ success });
});

app.post("/api/budget/template", (req, res) => {
  const { name, assignedFortnight, items } = req.body;
  if (!name || !assignedFortnight || !Array.isArray(items)) {
    return res.status(400).json({ error: "Faltan campos obligatorios para la plantilla." });
  }
  const template = addBudgetTemplate({
    name,
    assignedFortnight,
    items
  });
  res.json(template);
});

app.put("/api/budget/template/:id", (req, res) => {
  const { name, assignedFortnight, items } = req.body;
  if (!name || !assignedFortnight || !Array.isArray(items)) {
    return res.status(400).json({ error: "Faltan campos obligatorios para actualizar la plantilla." });
  }
  const template = updateBudgetTemplate(req.params.id, {
    name,
    assignedFortnight,
    items
  });
  if (!template) {
    return res.status(404).json({ error: "Plantilla no encontrada." });
  }
  res.json(template);
});

app.delete("/api/budget/template/:id", (req, res) => {
  const success = deleteBudgetTemplate(req.params.id);
  res.json({ success });
});

app.post("/api/budget/template/apply", (req, res) => {
  const { templateId, fortnightId } = req.body;
  if (!templateId || !fortnightId) {
    return res.status(400).json({ error: "Se requiere templateId y fortnightId." });
  }
  try {
    const estimates = applyBudgetTemplate(templateId, fortnightId);
    res.json({ success: true, estimates });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/budget/account", (req, res) => {
  const { name, balance } = req.body;
  if (!name || typeof balance !== "number") {
    return res.status(400).json({ error: "Faltan datos de la cuenta (nombre o balance miau)." });
  }
  const acc = addBudgetAccount({
    name,
    balance,
    createdAt: new Date().toISOString()
  });
  res.json(acc);
});

app.delete("/api/budget/account/:id", (req, res) => {
  const success = deleteBudgetAccount(req.params.id);
  res.json({ success });
});

app.post("/api/budget/fortnight/close", (req, res) => {
  const { fortnightId, nextFortnightId, leftoverAmount, targetAccount } = req.body;
  if (!fortnightId || !nextFortnightId) {
    return res.status(400).json({ error: "Faltan datos requeridos (fortnightId o nextFortnightId)." });
  }
  const result = closeBudgetFortnight(fortnightId, nextFortnightId, leftoverAmount || 0, targetAccount);
  res.json(result);
});

app.post("/api/budget/fortnight/open", (req, res) => {
  const { fortnightId } = req.body;
  if (!fortnightId) {
    return res.status(400).json({ error: "Falta el fortnightId." });
  }
  const result = openBudgetFortnight(fortnightId);
  res.json(result);
});

app.post("/api/budget/clear", (req, res) => {
  try {
    const result = clearBudgetStore();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al limpiar el presupuesto." });
  }
});

// ==========================================
// EJERCICIO / WORKOUT LOG APIS
// ==========================================

app.get("/api/workout/logs", (req, res) => {
  res.json(getWorkoutLogs());
});

app.post("/api/workout/log", (req, res) => {
  const { date, weightsUsed, repsDone, rpe, generalEnergy, feelingsText, workoutType, userId } = req.body;
  if (!date || !weightsUsed || !repsDone || rpe === undefined || generalEnergy === undefined || feelingsText === undefined) {
    return res.status(400).json({ error: "Faltan datos obligatorios para el registro de ejercicio." });
  }
  const log = addWorkoutLog({
    date,
    weightsUsed,
    repsDone,
    rpe: Number(rpe),
    generalEnergy: Number(generalEnergy),
    feelingsText,
    workoutType: workoutType || "Default Session",
    userId
  });
  
  const headerUserId = req.headers["x-user-id"] as string || userId || "";
  const name = getUserName(headerUserId);
  addNotification(
    headerUserId,
    "Sesión de ejercicio",
    `${name} completó un entrenamiento de ${workoutType || "fuerza"}. 💪`,
    "workout"
  );
  
  res.json(log);
});

app.delete("/api/workout/log/:id", (req, res) => {
  const success = deleteWorkoutLog(req.params.id);
  res.json({ success });
});

// ROUTINES API
app.get("/api/workout/routines", (req, res) => {
  res.json(getWorkoutRoutines());
});

app.post("/api/workout/routine", (req, res) => {
  const routine = saveWorkoutRoutine(req.body);
  res.json(routine);
});

app.delete("/api/workout/routine/:id", (req, res) => {
  const success = deleteWorkoutRoutine(req.params.id);
  res.json({ success });
});

// DETAILED WORKOUT LOGS API
app.get("/api/workout/detailed-logs", (req, res) => {
  res.json(getWorkoutDetailedLogs());
});

app.post("/api/workout/detailed-log", (req, res) => {
  const log = saveWorkoutDetailedLog(req.body);

  // Send notification to home
  const headerUserId = req.headers["x-user-id"] as string || req.body.userId || "";
  const name = getUserName(headerUserId);
  addNotification(
    headerUserId,
    "Entrenamiento Completado",
    `💪 ${name} completó la rutina "${log.routineName || "Entrenamiento"}" (${log.totalSetsCompleted || 0} series, ${log.totalVolumeKg || 0} kg total).`,
    "workout"
  );

  res.json(log);
});

app.delete("/api/workout/detailed-log/:id", (req, res) => {
  const success = deleteWorkoutDetailedLog(req.params.id);
  res.json({ success });
});

// BODY METRICS API
app.get("/api/workout/body-metrics", (req, res) => {
  res.json(getBodyMetrics());
});

app.post("/api/workout/body-metric", (req, res) => {
  const metric = saveBodyMetric(req.body);
  res.json(metric);
});

app.delete("/api/workout/body-metric/:id", (req, res) => {
  const success = deleteBodyMetric(req.params.id);
  res.json({ success });
});

// PERSONAL RECORDS API
app.get("/api/workout/prs", (req, res) => {
  res.json(getPersonalRecords());
});

app.post("/api/workout/pr", (req, res) => {
  const pr = savePersonalRecord(req.body);
  res.json(pr);
});

// CUSTOM EXERCISES API
app.get("/api/workout/custom-exercises", (req, res) => {
  res.json(getCustomExercises());
});

app.post("/api/workout/custom-exercise", (req, res) => {
  const ex = saveCustomExercise(req.body);
  res.json(ex);
});

app.delete("/api/workout/custom-exercise/:id", (req, res) => {
  const success = deleteCustomExercise(req.params.id);
  res.json({ success });
});

// Expert Coach chat endpoint
app.post("/api/coach/chat", async (req, res) => {
  const { message, history, profile, aiPlan } = req.body;
  if (!message) {
    return res.status(400).json({ error: "El mensaje no puede estar vacío." });
  }

  // Build a highly dynamic and personalized profile description
  let profileText = "";
  let hasSurgicalNotes = false;

  if (profile) {
    const objetivo = profile.objetivo || "Recomposición Corporal";
    const peso = profile.peso || 78;
    const altura = profile.altura || 175;
    const cicatriz = profile.cicatriz || "Ninguna reportada";
    const experience = profile.experience || "Principiante";
    const equipment = profile.equipment || "Mancuernas y suelo";
    const days = profile.days || 3;
    const duration = profile.duration || "30-45 minutos";

    hasSurgicalNotes = cicatriz.toLowerCase().includes("mastectom") || cicatriz.toLowerCase().includes("cirug") || cicatriz.toLowerCase().includes("cicatriz");
    
    let medidasText = "No registradas aún";
    if (profile.medidas) {
      const m = profile.medidas;
      medidasText = `Pecho: ${m.pecho || "-"} cm, Brazo Izq: ${m.brazoIzq || "-"} cm, Brazo Der: ${m.brazoDer || "-"} cm, Cintura: ${m.cintura || "-"} cm, Cadera: ${m.cadera || "-"} cm, Muslo Izq: ${m.musloIzq || "-"} cm, Muslo Der: ${m.musloDer || "-"} cm`;
    }

    profileText = `
Perfil actual del cliente (obtenido directamente de su encuesta):
- Objetivo principal: ${objetivo}
- Peso actual: ${peso} kg
- Altura: ${altura} cm
- Experiencia de pesas: ${experience}
- Historial médico / Cirugías / Precauciones: ${cicatriz}
- Equipamiento disponible: ${equipment}
- Frecuencia: ${days} días por semana, de ${duration} por sesión
- Medidas corporales registradas: ${medidasText}
`;
  } else {
    profileText = `
Perfil actual del cliente (defecto):
- Objetivo principal: Recomposición Corporal
- Peso: 78 kg
- Altura: 175 cm
- Experiencia: Principiante (0-6 meses)
- Historial médico: Ninguna cirugía reportada.
- Equipamiento: Solo mancuernas ajustables (hasta 22 kg) y el suelo
- Frecuencia: 3 días por semana, de 30-45 minutos
`;
  }

  let routineText = "";
  if (aiPlan && aiPlan.routines) {
    routineText = `
Plan de Rutinas actuales que tiene asignado y debes comentar:
${aiPlan.routines.map((r: any) => {
  return `- **${r.name}** (Enfoque muscular: ${r.focus}):
${r.exercises.map((e: any) => `  * ${e.name} (${e.series}): ${e.description} [Seguridad: ${e.adaptation}]`).join("\n")}`;
}).join("\n")}
`;
  }

  const systemInstruction = `Eres "Milo", un coach de fuerza y nutrición personal inteligente de IA, experto en kinesiología, recomposición corporal y entrenamiento basado en evidencia científica. Tu tono es directo, empático, altamente pragmático, motivador y con una calidez sutil colombiana (puedes usar palabras como "parce", "camellar", "con toda", "pues" de forma sutil, profesional y asertiva, eliminando completamente los maullidos, miau, patitas o ruidos de gato para mantener un nivel óptimo de seriedad y claridad).

${profileText}
${routineText}

Reglas Operativas Clave del Coach Milo:
1. SÉ RELEVANTE Y CONCISO: Responde de forma asertiva directa a lo que te preguntan. Nunca des respuestas genéricas ni uses un perfil estático de "mastectomía" a menos que el perfil del cliente actual lo mencione expresamente en su historial médico. Si el historial médico reporta "Ninguna", trata al usuario de acuerdo con eso.
2. VOLUMETRÍA DINÁMICA: Si el usuario reporta mal sueño, cansancio, fatiga alta o dolores musculares/articulares, rediseña dinámicamente o ajusta el volumen para hoy (ej. sugiere menos series o pesos más livianos).
3. PLANIFICACIÓN NUTRICIONAL: Si preguntan sobre nutrición, sé extremadamente asertivo, calculando rangos específicos de macronutrientes basados en el peso actual y explicando cómo distribuirlos para lograr el objetivo.
4. FORMATO: Usa markdown limpio (títulos, listas, negritas). NUNCA dejes ver las etiquetas crudas en texto plano. Evita las disculpas robóticas y ve al grano con respuestas útiles y amigables.`;

  if (ai) {
    try {
      const contentsList: any[] = [];
      if (history && Array.isArray(history)) {
        history.forEach((h: any) => {
          contentsList.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] });
        });
      }
      contentsList.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsList,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      });

      if (response && response.text) {
        return res.json({ reply: response.text });
      }
    } catch (gErr) {
      console.error("Gemini coach generation failed, fallback to simulated coach response:", gErr);
    }
  }

  // Fallback high workmanship simulated interactive coaching response!
  const lowerMsg = message.toLowerCase();
  let fakeReply = "";
  const objName = profile ? (profile.objetivo || "Recomposición Corporal") : "Recomposición Corporal";
  const userWeight = profile ? (profile.peso || 78) : 78;

  if (lowerMsg.includes("hola") || lowerMsg.includes("empezar") || lowerMsg.includes("bienvenido")) {
    fakeReply = `¡Hola! Aquí está tu coach personal **Milo** listo miau🐾. He revisado tu perfil enfocado en **${objName}** con un peso de **${userWeight} kg** y tu equipo disponible.
    
Para avanzar de manera segura, ajustaremos el entrenamiento en tiempo real según tu energía y tus consideraciones de salud. ¿Cómo te sientes para tu sesión de hoy?`;
  } else if (lowerMsg.includes("sueño") || lowerMsg.includes("cansado") || lowerMsg.includes("dormí") || lowerMsg.includes("fatiga") || lowerMsg.includes("dolor")) {
    fakeReply = `Registrado miau. Para proteger tu recuperación y tu salud articular, aplicaremos la **Regla de Volumetría Dinámica**:
- **Ajuste:** Reduciremos las series de hoy a solo 2 por ejercicio y bajaremos la carga de trabajo un 30%. Enfócate en una excelente técnica y un RPE de 6-7. ¡La constancia es lo más importante!`;
  } else if (lowerMsg.includes("medidas") || lowerMsg.includes("pecho") || lowerMsg.includes("cintura") || lowerMsg.includes("brazo")) {
    fakeReply = `¡Excelente que estés siguiendo tus medidas corporales! Para registrar tu evolución correctamente:
1. **Consistencia:** Mídete siempre por la mañana, en ayunas, y sin tensar demasiado la cinta.
2. **Puntos clave:** 
   - **Cintura:** Justo encima del ombligo.
   - **Pecho:** En el punto de mayor volumen pectoral.
   - **Brazos:** Con el brazo relajado o contraído a 90°.
¡Esto nos dará un mapa perfecto de tu recomposición física miau!`;
  } else {
    fakeReply = `Entendido miau🐾. He tomado nota de tus progresos. Como tu entrenador personal, te recomiendo seguir de cerca tu plan y mantener la consistencia en el registro de tus pesos y repeticiones. ¿Tienes alguna duda específica sobre la técnica o tu nutrición actual de hoy?`;
  }

  res.json({ reply: fakeReply });
});

// Deep Physical AI Coach Evaluator Endpoint
app.post("/api/coach/evaluate", async (req, res) => {
  const { answers } = req.body;
  if (!answers) {
    return res.status(400).json({ error: "Faltan las respuestas de evaluación." });
  }

  const isMastectomy = (answers.medical || "").toLowerCase().includes("mastectom") || (answers.medical || "").toLowerCase().includes("cirug") || (answers.medical || "").toLowerCase().includes("cicatriz");
  const preferredEx = answers.likesExercises ? `Ejercicios preferidos para incluir si es posible y seguro: ${answers.likesExercises}` : "";
  const avoidedEx = answers.dislikesExercises ? `Ejercicios a evitar estrictamente: ${answers.dislikesExercises}` : "";
  const focusBodyParts = answers.focusBodyParts || "Cuerpo Completo";

  const systemInstruction = `Eres "Milo", un coach personal inteligente y nutricionista deportivo de IA, experto en recomposición corporal, kinesiología y entrenamiento basado en evidencia científica. Tu especialidad es diseñar planes hiper-personalizados y adaptables de nutrición y ejercicio.
Tu tono es directo, motivador, empático, profesional, claro y con una calidez sutil colombiana (puedes usar palabras como "parce", "camellar", "con toda", "pues" de forma sutil, profesional y asertiva, eliminando completamente los maullidos, miau, patitas o ruidos de gato para mantener un nivel óptimo de seriedad y claridad).

Debes responder estrictamente en un objeto JSON estructurado con las siguientes claves y nada más:
{
  "summary": "### Análisis de Estado Físico & Adaptación Quirúrgica 🌱\\n\\n[Análisis detallado de su peso, altura y experiencia. Si reporta cirugías o cicatrices como mastectomía, detalla adaptaciones kinesiológicas específicas. Si no reporta cirugías, ofrece pautas generales de postura y seguridad articular sin asumir condiciones inexistentes.]\\n\\n**Detalles de Progreso:** Explicación clara y motivadora de cómo este plan les ayudará a lograr su meta de recomposición corporal.",
  "nutritionalFocus": "### Foco Nutricional y Macronutrientes Personalizados 🍳\\n\\n**Especificaciones Clave:**\\n- **Consumo Calórico Recomendado:** [Detallar calorías estimadas para déficit, superávit o mantenimiento según objetivo]\\n- **Proteínas:** [g/día estimadas basándote en su peso]\\n- **Grasas:** [g/día estimadas]\\n- **Carbohidratos:** [g/día estimados]\\n- **Pautas de Hidratación:** [L/día]\\n\\n**Recomendaciones de Alimentos:** [Qué comidas priorizar, cómo distribuir las porciones y pautas nutricionales ajustables a su día a día de forma práctica.]",
  "routines": [
    {
      "id": "A",
      "name": "Día A: ...",
      "focus": "...",
      "exercises": [
        {
          "name": "...",
          "series": "3 series x 8-12 reps",
          "adaptation": "[Cómo ejecutar de forma segura cuidando hombros, cicatrices o adaptando el rango de movimiento]",
          "description": "[Descripción paso a paso de la ejecución correcta]"
        }
      ]
    }
  ],
  "generalAdvice": "### Recomendaciones Ajustables para tu Objetivo miau🐾\\n\\n1. **Ajustes de Progreso:** [Cómo ajustar el plan a medida que logras resultados o si tu peso se estanca]\\n2. **Escala RPE:** [Cómo usar el esfuerzo percibido de 1 a 10 para autorregularte]\\n3. **Flexibilidad:** [Cómo ajustar el volumen si tienes fatiga alta o pocas horas de sueño]"
}

IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON anterior, sin explicaciones ni formato markdown fuera del JSON. Todo el texto dentro de las claves JSON debe estar escrito en un español natural y motivador.`;

  const userPrompt = `Por favor, evalúa a profundidad los siguientes datos de mi cuestionario y genera mi plan personalizado de fuerza y nutrición de forma 100% personalizada e inteligente. No me des respuestas genéricas o predeterminadas, haz una evaluación adaptativa real de lo que quiero trabajar de mi cuerpo.

Respuestas del Usuario:
- Objetivo principal: ${answers.objective}
- Enfoque corporal / Zonas a trabajar: ${focusBodyParts}
- Peso: ${answers.peso} kg
- Altura: ${answers.altura} cm
- Nivel de experiencia con pesas: ${answers.experience}
- Nivel de actividad física diaria: ${answers.activity}
- Cirugías o condiciones médicas (precauciones reportadas): ${answers.medical}
- Equipamiento disponible: ${answers.equipment}
- Frecuencia semanal deseada: ${answers.days} días
- Duración por sesión: ${answers.duration}
${preferredEx}
${avoidedEx}

Instrucciones Especiales de Diseño Personalizado:
1. Diseña un plan de ejercicio realista y seguro utilizando el equipamiento disponible.
2. Si el usuario reportó cirugías o condiciones médicas en "Cirugías o condiciones médicas" (ej. mastectomía, cicatriz), adapta de forma estricta los movimientos para proteger esas zonas. Si dice "Ninguna", no asumas cirugías ni mastectomías.
3. Incorpora activamente y prioriza los ejercicios de su preferencia y evita los indicados para evitar.
4. Genera rutinas estructuradas (ej. Día A, Día B, Día C) acordes a la frecuencia seleccionada.
5. Da especificaciones extremadamente detalladas y completas sobre su foco nutricional y recomendaciones ajustables.
6. EVALUACIÓN DE ENFOQUE CORPORAL (CRÍTICO): Adapta completamente la selección de ejercicios y la temática de los días de entrenamiento al enfoque corporal solicitado: "${focusBodyParts}". Si el usuario especificó zonas como piernas, glúteos, hombros, etc., el volumen y selección de los ejercicios debe recaer de manera sustancial sobre estas zonas deseadas, logrando rutinas adaptativas reales, evaluadas para su objetivo.`;

  // Dynamic High-Workmanship Fallback
  const proteinMin = Math.round((Number(answers.peso) || 75) * 1.8);
  const proteinMax = Math.round((Number(answers.peso) || 75) * 2.2);
  const isSurgical = (answers.medical || "").toLowerCase().includes("mastectom") || (answers.medical || "").toLowerCase().includes("cirug") || (answers.medical || "").toLowerCase().includes("cicatriz");

  // Dynamic routines construction based on focus body parts for high workmanship fallback
  const focusLower = focusBodyParts.toLowerCase().includes("pierna") || focusBodyParts.toLowerCase().includes("glúteo") || focusBodyParts.toLowerCase().includes("inferior");
  const focusUpper = focusBodyParts.toLowerCase().includes("espalda") || focusBodyParts.toLowerCase().includes("hombro") || focusBodyParts.toLowerCase().includes("superior") || focusBodyParts.toLowerCase().includes("pecho") || focusBodyParts.toLowerCase().includes("pectoral");
  const focusArms = focusBodyParts.toLowerCase().includes("brazo") || focusBodyParts.toLowerCase().includes("biceps") || focusBodyParts.toLowerCase().includes("triceps");
  const focusCore = focusBodyParts.toLowerCase().includes("abdomen") || focusBodyParts.toLowerCase().includes("core");

  let customRoutines = [];

  if (focusLower) {
    customRoutines = [
      {
        id: "A",
        name: "Día A: Fuerza y Estabilidad de Tren Inferior (Enfoque Prioritario)",
        focus: "Cuádriceps, Glúteos & Estabilidad Lumbar",
        exercises: [
          {
            name: "Goblet Squat (Sentadilla con Copa con Mancuerna)",
            series: "3 series x 8-12 repeticiones",
            adaptation: "Mantén el torso erguido. Desciende empujando la cadera hacia atrás para proteger rodillas miau🐾.",
            description: "Sujeta la mancuerna contra tu pecho, desciende de forma controlada hasta que tus muslos estén paralelos al suelo y sube con potencia."
          },
          {
            name: "Zancadas Atrás (Reverse Lunges) Controladas",
            series: "3 series x 10 repeticiones por pierna",
            adaptation: "Da el paso hacia atrás con cuidado. Haz fuerza desde el talón del pie delantero.",
            description: "Párate erguido, da un paso atrás y baja la cadera hasta que la rodilla trasera roce el suelo. Regresa."
          },
          {
            name: "Bicho Muerto (Dead Bug) Estructural",
            series: "3 series x 10 repeticiones por lado",
            adaptation: "Presiona tu espalda baja firmemente contra el suelo en cada repetición miau🐾.",
            description: "Acostado boca arriba con rodillas dobladas, extiende de manera lenta el brazo y pierna opuestos sin arquear la lumbar."
          }
        ]
      },
      {
        id: "B",
        name: "Día B: Desarrollo Posterior de Cadera & Glúteos",
        focus: "Femorales, Glúteo Mayor & Espalda Alta",
        exercises: [
          {
            name: "Peso Muerto Rumano con Mancuernas",
            series: "3 series x 10 repeticiones",
            adaptation: "Mantén la columna neutral. Siente el estiramiento en la parte trasera de tus muslos.",
            description: "De pie, desliza las mancuernas pegadas a tus piernas empujando los glúteos hacia atrás hasta la mitad de la espinilla."
          },
          {
            name: "Puentes de Glúteo Unilaterales en Suelo",
            series: "3 series x 12 repeticiones por pierna",
            adaptation: "Aprieta activamente el glúteo en la cima del movimiento durante 2 segundos.",
            description: "Acostado de espaldas con una rodilla flexionada y la otra pierna al aire, empuja el suelo con tu talón para elevar la cadera."
          },
          {
            name: "Remo con Mancuerna a Un Brazo de Soporte",
            series: "3 series x 12 repeticiones",
            adaptation: "Apóyate firmemente en una mesa o mueble. Jala guiando tu codo hacia tu cadera.",
            description: "Inclina el torso y rema la mancuerna sintiendo la contracción en el lateral de tu espalda."
          }
        ]
      },
      {
        id: "C",
        name: "Día C: Tren Superior de Soporte & Acondicionamiento Core",
        focus: "Pectoral, Hombros & Abdomen Transverso",
        exercises: [
          {
            name: "Dumbbell Floor Press (Prensa en Suelo)",
            series: "3 series x 10 repeticiones",
            adaptation: isSurgical ? "⚠️ Codos a 45° del torso. Detén la bajada en el suelo para proteger la cicatriz del pecho." : "Desciende controlado hasta rozar suave el suelo miau🐾.",
            description: "Acostado boca arriba en el suelo, empuja las mancuernas de forma vertical sin chocar los pesos arriba."
          },
          {
            name: "Vuelos Laterales con Mancuerna (Hombro)",
            series: "3 series x 12-15 repeticiones",
            adaptation: "Sube ligeramente en diagonal hacia el frente (plano escapular), no directamente a los costados.",
            description: "De pie con mancuernas a los lados, elévalas de forma controlada hasta la altura del hombro."
          },
          {
            name: "Plancha Abdominal Activa",
            series: "3 series x 30-40 segundos",
            adaptation: "Empuja activamente el suelo con tus antebrazos, no dejes caer tu cadera.",
            description: "Sostén tu cuerpo alineado horizontalmente activando glúteos y abdomen."
          }
        ]
      }
    ];
  } else if (focusUpper) {
    customRoutines = [
      {
        id: "A",
        name: "Día A: Tracción de Tren Superior & Espalda Adaptativa",
        focus: "Espalda Alta, Espalda Ancha & Bíceps",
        exercises: [
          {
            name: "Remo con Mancuerna a Un Brazo",
            series: "3 series x 10 repeticiones",
            adaptation: "Mantén el torso fijo. Concéntrate en jalar con el codo hacia atrás miau🐾.",
            description: "Con el tronco casi paralelo al suelo apoyado en una superficie, rema la mancuerna controlando el descenso."
          },
          {
            name: "Vuelos Posteriores (Pájaros) Inclinado",
            series: "3 series x 12 repeticiones",
            adaptation: "Usa un peso moderado para aislar la parte trasera del hombro sin forzar el cuello.",
            description: "Inclina tu torso al frente y eleva los brazos lateralmente como si fuesen alas."
          },
          {
            name: "Curl de Bíceps Alterno de Pie",
            series: "3 series x 12 repeticiones",
            adaptation: "Evita balancear el torso para ayudar al movimiento.",
            description: "Flexiona el codo alternadamente rotando las palmas de las manos hacia arriba en la cima."
          }
        ]
      },
      {
        id: "B",
        name: "Día B: Empuje Superior Seguro (Hombros & Pecho)",
        focus: "Hombro Frontal/Medio & Tríceps",
        exercises: [
          {
            name: "Dumbbell Floor Press (Prensa de Pecho en Suelo)",
            series: "3 series x 8-10 repeticiones",
            adaptation: isSurgical ? "⚠️ Codos a 45°. Mantén el rango de movimiento controlado evitando estirar la zona pectoral." : "Retrae las escápulas y desciende controlado.",
            description: "Acostado boca arriba, empuja las mancuernas verticalmente sintiendo tus tríceps y pecho."
          },
          {
            name: "Dumbbell Shoulder Press de Pie",
            series: "3 series x 10 repeticiones",
            adaptation: "Activa el core firmemente para no arquear la columna lumbar al subir el peso.",
            description: "Sostén mancuernas a los lados de tus orejas y empújalas en línea recta hacia el techo."
          },
          {
            name: "Vuelos Laterales con Mancuernas Estructurales",
            series: "3 series x 12-15 repeticiones",
            adaptation: "Eleva las mancuernas en plano diagonal. Mantén los hombros relajados miau🐾.",
            description: "De pie, levanta los pesos lateralmente hasta formar una T con tu cuerpo."
          }
        ]
      },
      {
        id: "C",
        name: "Día C: Tren Inferior de Soporte & Core Integrado",
        focus: "Piernas Completas, Glúteos & Abdomen Profundo",
        exercises: [
          {
            name: "Goblet Squat (Sentadilla con Copa)",
            series: "3 series x 8-10 repeticiones",
            adaptation: "Sujeta la mancuerna de forma segura contra tu pecho superior.",
            description: "Desciende de forma vertical empujando rodillas hacia afuera y cadera hacia atrás."
          },
          {
            name: "Peso Muerto Rumano Estructural",
            series: "3 series x 10-12 repeticiones",
            adaptation: "Mantén las mancuernas cerca de tu cuerpo. Espalda completamente plana.",
            description: "Empuja la cadera hacia atrás sintiendo el estiramiento en la parte posterior de los muslos."
          },
          {
            name: "Bicho Muerto (Dead Bug) Estabilizador",
            series: "3 series x 10 repeticiones por lado",
            adaptation: "Respira hondo y mantén la espalda baja pegada al piso miau🐾.",
            description: "Extiende brazo y pierna opuesta lentamente sin mover la pelvis."
          }
        ]
      }
    ];
  } else if (focusArms || focusCore) {
    customRoutines = [
      {
        id: "A",
        name: "Día A: Esculpir Brazos & Definición (Bíceps & Tríceps)",
        focus: "Bíceps, Tríceps & Estabilizadores de Hombro",
        exercises: [
          {
            name: "Curl de Bíceps Martillo con Mancuernas",
            series: "3 series x 10-12 repeticiones",
            adaptation: "Mantén los codos pegados a las costillas en todo momento miau🐾.",
            description: "De pie con palmas mirándose entre sí (agarre neutro), flexiona los codos subiendo el peso de forma controlada."
          },
          {
            name: "Extensión de Tríceps Copa (Dos Manos)",
            series: "3 series x 12 repeticiones",
            adaptation: "Mantén los codos apuntando hacia adelante para no estresar el hombro.",
            description: "Sujeta una mancuerna con ambas manos sobre la cabeza y flexiona codos para bajar el peso detrás de tu nuca, luego extiéndelo."
          },
          {
            name: "Curl Concentrado con Mancuerna Sentado",
            series: "3 series x 12 repeticiones por lado",
            adaptation: "Apoya el codo contra la cara interna de tu muslo para aislar por completo.",
            description: "Sentado, flexiona el brazo de forma estricta sintiendo el pico del bíceps."
          }
        ]
      },
      {
        id: "B",
        name: "Día B: Fuerza de Core Estructural & Abdomen Profundo",
        focus: "Abdomen, Transverso del Abdomen & Espalda Alta",
        exercises: [
          {
            name: "Bicho Muerto (Dead Bug) con Pausa Isométrica",
            series: "3 series x 10 repeticiones por lado",
            adaptation: "Sostén la extensión de brazo/pierna 2 segundos antes de regresar miau🐾.",
            description: "De espaldas, extiende extremidades opuestas manteniendo la espalda baja totalmente en contacto con el suelo."
          },
          {
            name: "Plancha Abdominal Activa (Prone Plank)",
            series: "3 series x 30-45 segundos",
            adaptation: "No permitas que la cadera caiga. Activa tus glúteos al máximo.",
            description: "Sostén el cuerpo alineado como una tabla sobre tus antebrazos y pies."
          },
          {
            name: "Remo con Mancuerna de Soporte (Espalda)",
            series: "3 series x 10 repeticiones",
            adaptation: "Espalda paralela al piso, jala con tu codo hacia la cadera.",
            description: "Sujeta la mancuerna y llévala hacia arriba controlando el movimiento."
          }
        ]
      },
      {
        id: "C",
        name: "Día C: Fuerza Base de Tren Inferior",
        focus: "Cuádriceps, Femorales & Glúteos",
        exercises: [
          {
            name: "Goblet Squat (Sentadilla con Copa)",
            series: "3 series x 10 repeticiones",
            adaptation: "Baja controlado cuidando que tus rodillas sigan la línea de tus pies.",
            description: "Sujeta la mancuerna vertical y realiza sentadillas manteniendo el torso erguido."
          },
          {
            name: "Peso Muerto Rumano con Mancuernas",
            series: "3 series x 12 repeticiones",
            adaptation: "Siente la contracción en glúteos y femorales al subir.",
            description: "De pie, empuja la pelvis hacia atrás inclinando el torso recto, luego vuelve apretando glúteos."
          },
          {
            name: "Plancha Lateral de Soporte",
            series: "3 series x 20-30 segundos por lado",
            adaptation: "Alinea cuello, columna y cadera de forma perfecta miau🐾.",
            description: "Apoya tu antebrazo de lado y eleva la cadera manteniendo la línea recta."
          }
        ]
      }
    ];
  } else {
    // Standard Balanced Body Split (Cuerpo Completo)
    customRoutines = [
      {
        id: "A",
        name: "Día A: Empuje Seguro (Hombros, Tríceps & Pecho)",
        focus: "Pectoral suave, Deltoides & Tríceps",
        exercises: [
          {
            name: "Dumbbell Floor Press (Prensa en Suelo)",
            series: "3 series x 8-10 repeticiones",
            adaptation: isSurgical ? "⚠️ Mantén los codos pegados a 45° con respecto al torso. Desciende suave y no permitas que la mancuerna jale la cicatriz." : "Mantén los hombros retraídos y baja controlado hasta rozar el suelo.",
            description: "Acostado en el suelo de espalda con las rodillas dobladas, empuja las mancuernas hacia arriba sin chocar los pesos."
          },
          {
            name: "Dumbbell Shoulder Press de Pie",
            series: "3 series x 10 repeticiones",
            adaptation: "Mantén el abdomen contraído para proteger la zona lumbar. No uses pesos excesivos al iniciar.",
            description: "Sostén las mancuernas a la altura de los hombros y empújalas hacia arriba en línea recta."
          },
          {
            name: "Copa de Tríceps a Dos Manos",
            series: "3 series x 12 repeticiones",
            adaptation: "Codos mirando hacia el frente. Si sientes tirantez excesiva en las axilas, reduce el rango de bajada.",
            description: "Sujeta una mancuerna verticalmente detrás de tu nuca y extiéndela hacia el techo apretando los tríceps."
          }
        ]
      },
      {
        id: "B",
        name: "Día B: Tracción Adaptativa (Espalda & Bíceps)",
        focus: "Espalda alta, Deltoides posterior & Bíceps",
        exercises: [
          {
            name: "Remo con Mancuerna a Un Brazo",
            series: "3 series x 10 repeticiones",
            adaptation: "Apóyate sobre una superficie estable. Concéntrate en jalar con el codo hacia tu cadera, no con la mano.",
            description: "Con el tronco casi paralelo al suelo, rema la mancuerna de forma controlada sintiendo tu espalda alta."
          },
          {
            name: "Curl de Bíceps Alterno de Pie",
            series: "3 series x 12 repeticiones",
            adaptation: "Codos fijos a los costados del cuerpo. Evita columpiar la espalda.",
            description: "Sostén las mancuernas y realiza una flexión de codos alternando los brazos, girando las palmas hacia arriba."
          },
          {
            name: "Vuelos Posteriores (Pájaros) Inclinado",
            series: "3 series x 12 repeticiones",
            adaptation: "Usa un peso moderado para aislar correctamente la parte de atrás del hombro.",
            description: "Inclina el torso hacia adelante y eleva los brazos lateralmente como si fuesen alas."
          }
        ]
      },
      {
        id: "C",
        name: "Día C: Fuerza de Tren Inferior & Core Estructural",
        focus: "Piernas completos, Glúteos & Abdomen profundo",
        exercises: [
          {
            name: "Goblet Squat (Sentadilla con Copa)",
            series: "3 series x 8-10 repeticiones",
            adaptation: "Sujeta la mancuerna firmemente contra el pecho superior para no crear palancas incómodas.",
            description: "Desciende empujando la cadera hacia atrás y las rodillas hacia afuera, manteniendo el torso erguido."
          },
          {
            name: "Peso Muerto Rumano con Mancuernas",
            series: "3 series x 10-12 repeticiones",
            adaptation: "Espalda totalmente recta. Desciende solo hasta donde tu flexibilidad posterior lo permita.",
            description: "Con las piernas semi-rígidas, empuja la cadera hacia atrás deslizando las mancuernas cerca de tus muslos."
          },
          {
            name: "Bicho Muerto (Dead Bug) Terapéutico",
            series: "3 series x 10 repeticiones por lado",
            adaptation: "Espalda baja pegada firmemente al suelo todo el tiempo. Respira hondo.",
            description: "Acostado boca arriba, estira brazo y pierna opuestos de manera lenta y controlada."
          }
        ]
      }
    ];
  }

  const defaultEvaluation = {
    summary: `### Análisis de Estado Físico & Seguridad miau🐾
Evaluando tu perfil, el foco principal está en la seguridad y el progreso gradual adaptado a tu enfoque prioritario de **${focusBodyParts}**. Con un peso de **${answers.peso} kg** y altura de **${answers.altura} cm**, estructuramos un plan adaptativo real.
  
**🩹 Consideraciones de Salud & Cicatriz:**
${isSurgical
  ? "Hemos tomado especial nota de tu historial médico/quirúrgico (Mastectomía / Cicatriz). Priorizaremos ejercicios que protejan el pectoral, manteniendo los codos a 45° en empujes y evitando estiramientos excesivos que pongan tensión en la cicatriz. Avanzaremos lento pero seguro para cuidar tus tejidos."
  : "No reportas limitaciones quirúrgicas graves en el torso. Mantendremos una técnica impecable para cuidar tus articulaciones y espalda baja."}
  
**🔌 Equipamiento:** 
Entrenarás con *${answers.equipment}*, lo cual es ideal para un entrenamiento funcional y progresivo.`,

    nutritionalFocus: `### Foco Nutricional Estelar 🍳
Para tu objetivo de **${answers.objective}**, calculamos tus requerimientos estimados:
- 🍳 **Proteína recomendada:** ~${proteinMin}g - ${proteinMax}g al día para conservar tu masa muscular.
- 💧 **Hidratación:** Mínimo 2.5 litros de agua al día.
- 🕒 **Distribución:** Intenta espaciar tu proteína en 3-4 comidas, facilitando la asimilación y digestión miau.`,

    routines: customRoutines,

    generalAdvice: `### Recomendaciones Ajustables para tu Objetivo miau🐾
1. **Sobrecarga Progresiva:** No intentes levantar pesado de inmediato. Apunta a dominar la técnica y luego suma una repetición o un poco de peso.
2. **Escala RPE (Esfuerzo Percibido):** Mantente en un RPE de 7-8 sobre 10 (que te queden 2 repeticiones en reserva). No entrenes al fallo absoluto.
3. **Escucha a tu Cuerpo:** Si notas tirantez o molestia inusual en las articulaciones o cicatrices, detén el ejercicio de inmediato y consulta a tu coach miau🐾.`
  };

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        return res.json(parsed);
      }
    } catch (gErr) {
      console.error("Gemini coach evaluation generation failed, using dynamic fallback:", gErr);
    }
  }

  // Fallback response if offline or failed
  res.json(defaultEvaluation);
});

// Visual Exercise Guide Generator Endpoint (Bypassed Gemini for 100% instant rendering)
app.post("/api/coach/exercise-visual", async (req, res) => {
  const { exerciseName, description, adaptation } = req.body;
  if (!exerciseName) {
    return res.status(400).json({ error: "Faltan datos del ejercicio" });
  }

  const lower = exerciseName.toLowerCase();
  let exerciseSvg = "";
  let instructions: string[] = [];
  let muscles: string[] = [];

  if (lower.includes("puente") || lower.includes("bridge") || lower.includes("thrust") || lower.includes("unilateral")) {
    // 1. PUENTE DE GLÚTEOS / HIP THRUST
    muscles = ["Glúteo Mayor (Foco Principal)", "Isquiotibiales", "Erectores de Espalda", "Core Abdominal"];
    instructions = [
      "Acuéstate boca arriba flexionando las rodillas con los pies firmes sobre el suelo al ancho de cadera.",
      "Empuja fuertemente desde los talones elevando la pelvis y contrayendo los glúteos al máximo arriba.",
      "Mantén 1 segundo la contracción alineando rodillas, cadera y hombros, luego desciende sin tocar el suelo."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes hipLift {
            0% { transform: translateY(0); }
            45% { transform: translateY(-18px); }
            55% { transform: translateY(-18px); }
            100% { transform: translateY(0); }
          }
          @keyframes muscleGlow {
            0% { fill: #EF4444; opacity: 0.2; }
            50% { fill: #EF4444; opacity: 0.9; }
            100% { fill: #EF4444; opacity: 0.2; }
          }
          .anim-hip { animation: hipLift 3.5s ease-in-out infinite; transform-origin: 100px 180px; }
          .glute-glow { animation: muscleGlow 3.5s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2.5; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <!-- Canvas Background -->
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        
        <!-- Floor / Mat -->
        <line x1="60" y1="185" x2="340" y2="185" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Grid pattern background for a technical kinesiologist look -->
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Hip Lift Representation (Lying down body) -->
        <g class="anim-hip">
          <!-- Head (Resting on floor) -->
          <circle cx="100" cy="175" r="10" fill="#D97706" />
          <!-- Upper Back (Pivot point on floor) -->
          <line x1="110" y1="175" x2="160" y2="175" stroke="#D97706" stroke-width="8" stroke-linecap="round" />
          <!-- Animated Torso / Pelvis (moving up) -->
          <line x1="160" y1="175" x2="220" y2="175" stroke="#D97706" stroke-width="9" stroke-linecap="round" />
          <!-- Thigh / Leg upper -->
          <line x1="220" y1="175" x2="255" y2="155" stroke="#D97706" stroke-width="7" stroke-linecap="round" />
          <!-- Lower legs to feet -->
          <line x1="255" y1="155" x2="255" y2="185" stroke="#78350F" stroke-width="6" stroke-linecap="round" />
          
          <!-- Highlighted Muscle Target (Glutes) -->
          <ellipse cx="210" cy="175" rx="12" ry="7" class="glute-glow" />
        </g>
        
        <!-- Arrow pointing up -->
        <path d="M 190,150 L 190,110" class="arrow-dir" marker-end="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="#0D9488" />
          </marker>
        </defs>
        
        <!-- Text details -->
        <text x="285" y="100" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">ZONA DE TRABAJO</text>
        <text x="285" y="115" font-family="sans-serif" font-size="9.5" fill="#451A03">GLÚTEO MAYOR</text>
        <line x1="220" y1="168" x2="280" y2="115" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="220" cy="168" r="3" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("patada") || lower.includes("donkey") || lower.includes("kickback") || lower.includes("cuadrupedia")) {
    // 2. PATADAS DE GLÚTEO (DONKEY KICKS)
    muscles = ["Glúteo Mayor (Aislamiento)", "Isquiotibiales", "Core Estabilizador", "Multífidos"];
    instructions = [
      "Colócate en cuadrupedia apoyando las manos debajo de hombros y rodillas bajo caderas.",
      "Eleva una pierna manteniendo la rodilla en 90° con la planta del pie apuntando al techo.",
      "Eleva el muslo hasta que esté alineado con el torso, evitando arquear la zona lumbar."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes legKick {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(-15deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes activeGlow {
            0% { fill: #EF4444; opacity: 0.3; }
            50% { fill: #EF4444; opacity: 0.95; }
            100% { fill: #EF4444; opacity: 0.3; }
          }
          .anim-leg { animation: legKick 3.2s ease-in-out infinite; transform-origin: 200px 135px; }
          .glute-glow { animation: activeGlow 3.2s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2.5; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Ground -->
        <line x1="80" y1="180" x2="320" y2="180" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Quadruped Torso & static parts -->
        <!-- Hands / Front legs -->
        <line x1="140" y1="135" x2="140" y2="180" stroke="#78350F" stroke-width="6" stroke-linecap="round" />
        <!-- Head -->
        <circle cx="110" cy="115" r="10" fill="#D97706" />
        <!-- Main Torso -->
        <line x1="130" y1="135" x2="200" y2="135" stroke="#D97706" stroke-width="10" stroke-linecap="round" />
        <!-- Supporting back leg on the ground -->
        <line x1="190" y1="135" x2="190" y2="180" stroke="#78350F" stroke-width="6" stroke-linecap="round" />
        
        <!-- Animated Kicking Leg -->
        <g class="anim-leg">
          <!-- Thigh -->
          <line x1="200" y1="135" x2="230" y2="145" stroke="#D97706" stroke-width="8" stroke-linecap="round" />
          <!-- Shin (Kicking up at 90°) -->
          <line x1="230" y1="145" x2="225" y2="110" stroke="#B45309" stroke-width="6" stroke-linecap="round" />
          <!-- Foot -->
          <line x1="225" y1="110" x2="235" y2="110" stroke="#78350F" stroke-width="4" stroke-linecap="round" />
          
          <!-- Highlighted Active Glute -->
          <circle cx="205" cy="135" r="8" class="glute-glow" />
        </g>
        
        <!-- Motion Arrow -->
        <path d="M 245,150 Q 260,120 240,90" class="arrow-dir" marker-end="url(#arrowhead)" />
        
        <text x="275" y="60" font-family="sans-serif" font-weight="bold" font-size="9.5" fill="#C2410C">FOCO DE CONTRACCIÓN</text>
        <text x="275" y="75" font-family="sans-serif" font-size="9" fill="#451A03">GLÚTEO SUPERIOR</text>
        <line x1="205" y1="135" x2="270" y2="70" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="205" cy="135" r="2.5" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("sentadilla") || lower.includes("squat") || lower.includes("goblet") || lower.includes("zancada") || lower.includes("lunge")) {
    // 3. SENTADILLA / COPA / GOBLET SQUAT
    muscles = ["Cuádriceps", "Glúteo Mayor", "Isquiotibiales", "Erectores de Columna", "Core"];
    instructions = [
      "De pie con pies un poco más anchos que hombros y mancuerna firmemente contra tu pecho superior.",
      "Desciende empujando la cadera hacia atrás y abriendo rodillas, manteniendo el torso erguido.",
      "Baja hasta que tus muslos estén paralelos al suelo y sube empujando fuerte desde los talones."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes deepSquat {
            0% { transform: translateY(0) scaleY(1); }
            45% { transform: translateY(32px) scaleY(0.8); }
            55% { transform: translateY(32px) scaleY(0.8); }
            100% { transform: translateY(0) scaleY(1); }
          }
          @keyframes quadricepsBurn {
            0% { fill: #EF4444; opacity: 0.1; }
            50% { fill: #EF4444; opacity: 0.85; }
            100% { fill: #EF4444; opacity: 0.1; }
          }
          .anim-squat { animation: deepSquat 3.8s ease-in-out infinite; transform-origin: 200px 190px; }
          .quads-glow { animation: quadricepsBurn 3.8s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Floor -->
        <line x1="100" y1="190" x2="300" y2="190" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Animated Squatting Silhouette -->
        <g class="anim-squat">
          <!-- Head -->
          <circle cx="200" cy="70" r="11" fill="#D97706" />
          <!-- Torso -->
          <line x1="200" y1="81" x2="200" y2="135" stroke="#D97706" stroke-width="8" stroke-linecap="round" />
          <!-- Goblet Dumbbell held at chest -->
          <rect x="204" y="90" width="10" height="22" rx="3" fill="#451A03" />
          <!-- Thigh (Leg Upper - bending) -->
          <line x1="200" y1="135" x2="225" y2="160" stroke="#D97706" stroke-width="7" stroke-linecap="round" />
          <!-- Shin (Leg Lower - bending) -->
          <line x1="225" y1="160" x2="225" y2="190" stroke="#78350F" stroke-width="6" stroke-linecap="round" />
          
          <!-- Muscle glow (Quads & Glutes) -->
          <ellipse cx="218" cy="148" rx="7" ry="10" class="quads-glow" />
        </g>
        
        <!-- Motion lines -->
        <path d="M 160,100 L 160,150" class="arrow-dir" marker-end="url(#arrowhead)" />
        
        <text x="260" y="75" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">ACTIVACIÓN MÁXIMA</text>
        <text x="260" y="90" font-family="sans-serif" font-size="9.5" fill="#451A03">CUÁDRICEPS & GLÚTEO</text>
        <line x1="215" y1="140" x2="260" y2="90" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="215" cy="140" r="3" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("hundred") || lower.includes("cien") || lower.includes("pilates") || lower.includes("bicho") || lower.includes("dead bug") || lower.includes("core") || lower.includes("abs") || lower.includes("abdominal")) {
    // 4. PILATES / HUNDRED / DEAD BUG / CORE
    muscles = ["Transverso del Abdomen (Faja profunda)", "Recto Abdominal", "Oblicuos", "Flexores de Cadera"];
    instructions = [
      "Acuéstate boca arriba, levanta cabeza y hombros manteniendo la espalda baja firmemente contra el suelo.",
      "Estira tus piernas a un ángulo de 45° o 90° y coloca tus brazos estirados a los costados.",
      "Realiza bombeos rítmicos y cortos de tus brazos arriba y abajo, sincronizados con tu respiración."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes armPump {
            0% { transform: translateY(0); }
            50% { transform: translateY(12px); }
            100% { transform: translateY(0); }
          }
          @keyframes corePulse {
            0% { transform: scale(0.9); opacity: 0.3; }
            50% { transform: scale(1.1); opacity: 0.95; }
            100% { transform: scale(0.9); opacity: 0.3; }
          }
          .anim-arm { animation: armPump 0.6s ease-in-out infinite; }
          .core-glow { animation: corePulse 2s ease-in-out infinite; transform-origin: 170px 145px; }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Mat -->
        <line x1="70" y1="170" x2="330" y2="170" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Torso lying flat with shoulders slightly raised -->
        <!-- Head raised -->
        <circle cx="115" cy="135" r="10" fill="#D97706" />
        <!-- Upper torso elevated -->
        <path d="M 125,142 C 140,145 160,150 180,150" stroke="#D97706" stroke-width="9" stroke-linecap="round" fill="none" />
        <!-- Lower body / Hips -->
        <line x1="180" y1="150" x2="220" y2="150" stroke="#D97706" stroke-width="9" stroke-linecap="round" />
        
        <!-- Legs raised to 45 degrees -->
        <line x1="220" y1="150" x2="280" y2="110" stroke="#78350F" stroke-width="7" stroke-linecap="round" />
        
        <!-- Animated Pulsing Core glow (Abdomen) -->
        <ellipse cx="170" cy="145" rx="15" ry="12" fill="#EF4444" class="core-glow" />
        
        <!-- Animated pumping arms -->
        <g class="anim-arm">
          <line x1="135" y1="147" x2="185" y2="147" stroke="#B45309" stroke-width="4.5" stroke-linecap="round" />
          <circle cx="185" cy="147" r="4.5" fill="#451A03" />
        </g>
        
        <text x="270" y="55" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">PRESIÓN ABDOMINAL</text>
        <text x="270" y="70" font-family="sans-serif" font-size="9" fill="#451A03">TRANSVERSO & CORE</text>
        <line x1="170" y1="145" x2="265" y2="65" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="170" cy="145" r="3" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("remo") || lower.includes("row") || lower.includes("bíceps") || lower.includes("curl") || lower.includes("vuelo") || lower.includes("tracción") || lower.includes("espalda")) {
    // 5. TRACCIÓN / REMO / BÍCEPS
    muscles = ["Dorsal Ancho (Espalda)", "Trapecio & Romboides", "Bíceps Braquial", "Deltoides Posterior"];
    instructions = [
      "Inclina el torso manteniendo la columna neutra y firme, sosteniendo la mancuerna de forma vertical.",
      "Jala el peso guiando el codo hacia atrás y arriba rozando tus costillas, sintiendo la contracción de tu espalda.",
      "Estira el brazo completamente de manera controlada para un rango de estiramiento óptimo."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes rowMovement {
            0% { transform: translateY(22px); }
            50% { transform: translateY(0); }
            100% { transform: translateY(22px); }
          }
          @keyframes dorsalGlow {
            0% { fill: #EF4444; opacity: 0.1; }
            50% { fill: #EF4444; opacity: 0.9; }
            100% { fill: #EF4444; opacity: 0.1; }
          }
          .anim-dumbbell { animation: rowMovement 3.4s ease-in-out infinite; }
          .dorsal-burn { animation: dorsalGlow 3.4s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Floor line -->
        <line x1="80" y1="190" x2="320" y2="190" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Torso bent over / Bench support -->
        <!-- Supporting Leg -->
        <line x1="160" y1="130" x2="160" y2="190" stroke="#78350F" stroke-width="5" stroke-linecap="round" />
        <!-- Head -->
        <circle cx="130" cy="80" r="10" fill="#D97706" />
        <!-- Back Torso -->
        <line x1="140" y1="100" x2="220" y2="130" stroke="#D97706" stroke-width="10" stroke-linecap="round" />
        
        <!-- Animated Row Arm and Dumbbell -->
        <g class="anim-dumbbell">
          <line x1="185" y1="110" x2="185" y2="138" stroke="#B45309" stroke-width="5" stroke-linecap="round" />
          <!-- Dumbbell -->
          <rect x="175" y="138" width="20" height="10" rx="2" fill="#451A03" />
        </g>
        
        <!-- Dorsal active muscle glow -->
        <ellipse cx="170" cy="105" rx="8" ry="12" class="dorsal-burn" transform="rotate(-15 170 105)" />
        
        <path d="M 230,150 L 230,110" class="arrow-dir" marker-end="url(#arrowhead)" />
        
        <text x="260" y="65" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">TRACCIÓN TRASERA</text>
        <text x="260" y="80" font-family="sans-serif" font-size="9.5" fill="#451A03">DORSALES / ESPALDA</text>
        <line x1="170" y1="105" x2="260" y2="80" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="170" cy="105" r="3" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("pecho") || lower.includes("flexi") || lower.includes("push") || lower.includes("press") || lower.includes("copa") || lower.includes("empuje")) {
    // 6. EMPUJE / PRESS / PUSHUPS / COPA TRÍCEPS
    muscles = ["Pectoral Mayor (Pecho)", "Tríceps Braquial", "Deltoides Anterior (Hombro frontal)"];
    instructions = [
      "Colócate en posición firme asegurando la alineación natural de los hombros y codos.",
      "Empuja el peso o tu cuerpo de manera controlada y explosiva, cuidando de no arquear la columna.",
      "Desciende controlando la bajada para maximizar la contracción de las fibras musculares."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes pushMovement {
            0% { transform: scaleX(1); }
            50% { transform: scaleX(0.72); }
            100% { transform: scaleX(1); }
          }
          @keyframes chestGlow {
            0% { fill: #EF4444; opacity: 0.15; }
            50% { fill: #EF4444; opacity: 0.9; }
            100% { fill: #EF4444; opacity: 0.15; }
          }
          .arms-silh { animation: pushMovement 3.2s ease-in-out infinite; transform-origin: left center; }
          .chest-glow { animation: chestGlow 3.2s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2.5; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Floor -->
        <line x1="80" y1="170" x2="320" y2="170" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Lying body representing Bench/Floor Press -->
        <!-- Head -->
        <circle cx="120" cy="140" r="10" fill="#D97706" />
        <!-- Torso lying flat -->
        <line x1="130" y1="150" x2="240" y2="150" stroke="#D97706" stroke-width="10" stroke-linecap="round" />
        
        <!-- Animated pushing arms -->
        <g class="arms-silh" transform="translate(170, 150)">
          <line x1="0" y1="0" x2="10" y2="-40" stroke="#B45309" stroke-width="5" stroke-linecap="round" />
          <line x1="10" y1="-40" x2="40" y2="-40" stroke="#78350F" stroke-width="5" stroke-linecap="round" />
          <!-- Weight / Dumbbell -->
          <rect x="35" y="-55" width="10" height="30" rx="3" fill="#451A03" />
        </g>
        
        <!-- Chest Target Highlight -->
        <circle cx="160" cy="145" r="9" class="chest-glow" />
        
        <path d="M 180,95 L 220,95" class="arrow-dir" marker-end="url(#arrowhead)" />
        
        <text x="260" y="65" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">FUERZA DE EMPUJE</text>
        <text x="260" y="80" font-family="sans-serif" font-size="9.5" fill="#451A03">PECTORAL / TRÍCEPS</text>
        <line x1="160" y1="145" x2="260" y2="80" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="160" cy="145" r="3" fill="#EF4444" />
      </svg>
    `;
  } else if (lower.includes("muerto") || lower.includes("rumano") || lower.includes("deadlift") || lower.includes("isquio") || lower.includes("femoral")) {
    // 7. PESO MUERTO RUMANO / HIP HINGE
    muscles = ["Isquiotibiales (Femorales)", "Glúteo Mayor", "Erectores de Espalda (Core lumbar)", "Antebrazos"];
    instructions = [
      "Párate erguido sosteniendo mancuernas al frente. Inicia empujando la cadera hacia atrás.",
      "Desciende deslizando las mancuernas muy cerca de tus piernas, manteniendo la espalda totalmente plana.",
      "Baja hasta sentir un estiramiento marcado en los isquiotibiales y sube contrayendo los glúteos."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes hipHinge {
            0% { transform: rotate(0deg); }
            45% { transform: rotate(24deg); }
            55% { transform: rotate(24deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes activeHamstrings {
            0% { fill: #EF4444; opacity: 0.15; }
            50% { fill: #EF4444; opacity: 0.95; }
            100% { fill: #EF4444; opacity: 0.15; }
          }
          .anim-hinge { animation: hipHinge 3.8s ease-in-out infinite; transform-origin: 210px 150px; }
          .hams-glow { animation: activeHamstrings 3.8s ease-in-out infinite; }
          .arrow-dir { stroke: #0D9488; stroke-width: 2.5; fill: none; stroke-dasharray: 4; animation: dash 2s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -20; } }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <!-- Floor -->
        <line x1="100" y1="190" x2="300" y2="190" stroke="#78350F" stroke-width="3" stroke-linecap="round" />
        
        <!-- Standing legs (static pivot) -->
        <line x1="210" y1="150" x2="210" y2="190" stroke="#78350F" stroke-width="6.5" stroke-linecap="round" />
        
        <!-- Animated Hip Hinge Upper Body -->
        <g class="anim-hinge">
          <!-- Torso Spine (straight) -->
          <line x1="210" y1="150" x2="210" y2="90" stroke="#D97706" stroke-width="9" stroke-linecap="round" />
          <!-- Head -->
          <circle cx="210" cy="75" r="10" fill="#D97706" />
          <!-- Arm holding Dumbbells close to legs -->
          <line x1="210" y1="105" x2="225" y2="135" stroke="#B45309" stroke-width="4.5" stroke-linecap="round" />
          <rect x="220" y="130" width="10" height="15" rx="2.5" fill="#451A03" />
        </g>
        
        <!-- Active muscle targets on back of legs (Hamstrings) -->
        <ellipse cx="203" cy="168" rx="5" ry="12" class="hams-glow" />
        
        <path d="M 155,110 Q 140,135 155,160" class="arrow-dir" marker-end="url(#arrowhead)" />
        
        <text x="250" y="65" font-family="sans-serif" font-weight="bold" font-size="9" fill="#C2410C">FOCO POSTERIOR</text>
        <text x="250" y="80" font-family="sans-serif" font-size="9.5" fill="#451A03">ISQUIOTIBIALES / GLÚTEO</text>
        <line x1="203" y1="168" x2="250" y2="80" stroke="#EF4444" stroke-width="1" stroke-dasharray="2" />
        <circle cx="203" cy="168" r="2.5" fill="#EF4444" />
      </svg>
    `;
  } else {
    // 8. GENERAL EXERCISE / DYNAMIC MOBILITY
    muscles = ["Músculos Activos del Ejercicio", "Estabilizadores del Core", "Sinergistas Posturales"];
    instructions = [
      "Establece una base de apoyo firme y activa tu core (abdomen profundo).",
      "Realiza el movimiento de forma fluida y a velocidad controlada, sin tirones bruscos.",
      "Inhala al estirar el músculo (fase excéntrica) y exhala al realizar el esfuerzo máximo."
    ];
    exerciseSvg = `
      <svg viewBox="0 0 400 240" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <style>
          @keyframes generalPulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
          }
          .anim-pulse { animation: generalPulse 2.2s ease-in-out infinite; transform-origin: 200px 120px; }
        </style>
        <rect width="100%" height="100%" rx="16" fill="#FDFBF7" stroke="#E7E2D5" stroke-width="2"/>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F4EFE6" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" rx="16" pointer-events="none" />
        <text x="20" y="30" font-family="monospace" font-weight="900" font-size="11" fill="#78350F">GUÍA VISUAL BIOMECÁNICA miau🐾</text>
        
        <g class="anim-pulse" transform="translate(0, 0)">
          <!-- Elegant target focus icon -->
          <circle cx="200" cy="120" r="30" fill="#FFFBEB" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="2" />
          <circle cx="200" cy="120" r="15" fill="#FEF3C7" stroke="#D97706" stroke-width="2" />
          <circle cx="200" cy="120" r="5" fill="#92400E" />
          <text x="200" y="170" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="10.5" fill="#78350F">ENFOQUE: ${exerciseName}</text>
        </g>
        
        <!-- Decorative path representing physical energy flow -->
        <path d="M 50,180 Q 120,150 200,180 T 350,180" stroke="#0D9488" stroke-width="2" fill="none" stroke-dasharray="5" />
      </svg>
    `;
  }

  res.json({
    svg: exerciseSvg,
    instructions: instructions,
    muscles: muscles
  });
});


// Memory caches to conserve precious Gemini API Daily Free Tier Quota (limit: 20 requests/day per model)
const greetingCache: Record<string, string> = {};
const horoscopeCache: Record<string, any> = {};
const moonCache: Record<string, any> = {};

let lastQuotaFailureTime = 0;
const QUOTA_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes bypass to save free tier requests

function isQuotaExhausted(): boolean {
  return (lastQuotaFailureTime > 0 && (Date.now() - lastQuotaFailureTime < QUOTA_COOLDOWN_MS));
}

function recordQuotaFailure() {
  lastQuotaFailureTime = Date.now();
}

interface AICartaNatal {
  zodiacSign: string;
  lunarSign: string;
  ascendantSign: string;
  mercurySign: string;
  venusSign: string;
  marsSign: string;
}

async function calculateAIOldCartaNatal(
  birthDate: string,
  birthTime: string,
  birthPlace: string
): Promise<AICartaNatal | null> {
  if (!ai || isQuotaExhausted()) return null;
  try {
    const prompt = `Calcula con máxima precisión astronómica y astrológica real los signos para los siguientes datos de nacimiento:
Fecha de nacimiento: ${birthDate}
Hora exacta de nacimiento: ${birthTime}
Lugar de nacimiento (coordenadas geográficas y zona horaria correspondientes): ${birthPlace}

Debes determinar con precisión científica/astrológica:
1. "zodiacSign" (Signo Solar): El signo del zodiaco en base al día de nacimiento con su símbolo (ej: "Géminis ♊", "Leo ♌", "Cáncer ♋").
2. "lunarSign" (Signo Lunar): La posición real de la Luna en el momento y lugar indicados con su símbolo (ej: "Cáncer ♋", "Acuario ♒", "Sagitario ♐").
3. "ascendantSign" (Ascendente): El signo ascendente calculado en base a la hora de nacimiento local y la latitud/longitud estimada de ${birthPlace} con su símbolo (ej: "Leo ♌", "Tauro ♉", "Libra ♎").
4. "mercurySign" (Signo de Mercurio): El signo de Mercurio en ese momento con su símbolo.
5. "venusSign" (Signo de Venus): El signo de Venus en ese momento con su símbolo.
6. "marsSign" (Signo de Marte): El signo de Marte en ese momento con su símbolo.

Nota: El usuario se ha quejado de que otros simuladores no son precisos. Por favor, usa tus conocimientos astrofísicos y astronómicos amplios para inferir la alineación planetaria de forma ultra fidedigna para esta fecha, hora y ubicación en lugar de inventarlo.

Devuelve estrictamente un JSON que siga el siguiente esquema, cuidando que todos los valores lleven su emoji tradicional:
{
  "zodiacSign": "string (con emoji)",
  "lunarSign": "string (con emoji)",
  "ascendantSign": "string (con emoji)",
  "mercurySign": "string (con emoji)",
  "venusSign": "string (con emoji)",
  "marsSign": "string (con emoji)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            zodiacSign: { type: Type.STRING },
            lunarSign: { type: Type.STRING },
            ascendantSign: { type: Type.STRING },
            mercurySign: { type: Type.STRING },
            venusSign: { type: Type.STRING },
            marsSign: { type: Type.STRING },
          },
          required: ["zodiacSign", "lunarSign", "ascendantSign", "mercurySign", "venusSign", "marsSign"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text) as AICartaNatal;
      console.log("Calculada carta natal con IA real miau:", parsed);
      return parsed;
    }
  } catch (err) {
    console.warn("⚠️ Milo no pudo calcular la carta natal vía IA (usando cálculo local miau):", err instanceof Error ? err.message : err);
    const errMsg = String(err);
    if (errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("UNAVAILABLE")) {
      recordQuotaFailure();
    }
  }
  return null;
}

// Helper calculations for Solar Times (NOAA / Astronomical Almanac algorithm)
function getCalculatedSolarTimes(date: Date = new Date(), lat = 4.7110, lon = -74.0721, tz = -5) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const hourFrac = date.getHours() + date.getMinutes() / 60;
  const gamma = (2 * Math.PI / 365.25) * (dayOfYear - 1 + (hourFrac - 12) / 24);

  // Equation of time (minutes)
  const eqtime = 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );

  // Solar declination (radians)
  const decl = 0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const latRad = (lat * Math.PI) / 180;
  const zenithRad = (90.833 * Math.PI) / 180;
  const cosHa = (Math.cos(zenithRad) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));
  const clampedCosHa = Math.max(-1, Math.min(1, cosHa));
  const haDeg = (Math.acos(clampedCosHa) * 180) / Math.PI;

  const timeOffset = eqtime + 4 * lon - 60 * tz;
  const sunriseMinutes = 720 - 4 * haDeg - timeOffset;
  const sunsetMinutes = 720 + 4 * haDeg - timeOffset;
  const solarNoonMinutes = 720 - timeOffset;

  const formatTime = (minutes: number) => {
    let m = Math.round(minutes);
    while (m < 0) m += 1440;
    while (m >= 1440) m -= 1440;
    const hours24 = Math.floor(m / 60);
    const mins = m % 60;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
  };

  const daylightDurationMinutes = Math.max(0, sunsetMinutes - sunriseMinutes);
  const durHours = Math.floor(daylightDurationMinutes / 60);
  const durMins = Math.round(daylightDurationMinutes % 60);
  const sunlightHours = `${durHours}h ${durMins.toString().padStart(2, "0")}m`;

  return {
    sunrise: formatTime(sunriseMinutes),
    sunset: formatTime(sunsetMinutes),
    solarNoon: formatTime(solarNoonMinutes),
    sunlightHours
  };
}

// Helper calculations for Milo Centralized Initialization
function getCalculatedBogotaWeather(now: Date = new Date()) {
  const hr = now.getHours();
  const day = now.getDate();
  const month = now.getMonth();
  const seed = (day * 3 + month * 7) % 100;
  const solar = getCalculatedSolarTimes(now);

  let baseTemp = 15;
  let descList = [
    "Llovizna suave y brisa fresca en los cerros orientales",
    "Cielo parcialmente nublado con aire fresco andino",
    "Clima templado y despejado con sol radiante en la Sabana",
    "Niebla matutina reconfortante con aroma a café fresco",
    "Atardecer dorado y fresco en Bogotá"
  ];
  let baseProbRain = 38;
  let baseWind = 12;

  let hourlyDiff = 0;
  if (hr >= 0 && hr < 6) hourlyDiff = -4;
  else if (hr >= 6 && hr < 11) hourlyDiff = -1;
  else if (hr >= 11 && hr < 16) hourlyDiff = +3;
  else if (hr >= 16 && hr < 20) hourlyDiff = +1;
  else hourlyDiff = -2;

  const dayDiff = (seed % 5) - 2;
  const finalTemp = baseTemp + hourlyDiff + dayDiff;
  const rainDiff = ((seed + hr * 7) % 31) - 15;
  const finalProbRain = Math.max(0, Math.min(100, baseProbRain + rainDiff));
  const windDiff = ((seed + hr) % 7) - 3;
  const finalWind = Math.max(2, baseWind + windDiff);
  const descIndex = (seed + hr) % descList.length;
  const finalDesc = descList[descIndex];

  let icon = "⛅";
  let gradient = "from-sky-50 to-blue-100";
  let miloAdvice = "Día templado en la Sabana: ideal para vestir cómodo y disfrutar el nido.";

  if (finalProbRain > 55) {
    icon = "🌧️";
    gradient = "from-slate-100 to-blue-200";
    miloAdvice = "Mayor probabilidad de llovizna en Bogotá hoy. Recuerden llevar sombrilla o chaqueta impermeable al salir.";
  } else if (finalProbRain > 30) {
    icon = "☁️";
    gradient = "from-zinc-100 to-sky-100";
    miloAdvice = "Cielo nublado y fresco. Un café o té calientito en pareja será perfecto para hoy.";
  } else {
    icon = "☀️";
    gradient = "from-amber-50 to-orange-100";
    miloAdvice = "Sol radiante en el nido. Excelente día para ventilar el hogar y regar las plantas si lo necesitan.";
  }

  const morningTemp = Math.max(10, baseTemp - 2 + dayDiff);
  const afternoonTemp = Math.max(14, baseTemp + 4 + dayDiff);
  const nightTemp = Math.max(9, baseTemp - 3 + dayDiff);

  const morningRain = Math.max(5, Math.min(90, finalProbRain - 15));
  const afternoonRain = Math.max(10, Math.min(95, finalProbRain + 15));
  const nightRain = Math.max(5, Math.min(80, finalProbRain - 20));

  return {
    city: "Bogotá, D.C.",
    temp: `${finalTemp}°C`,
    feelsLike: `${finalTemp - 1}°C`,
    desc: finalDesc,
    probRain: `${finalProbRain}%`,
    wind: `${finalWind} km/h`,
    humidity: `${Math.min(95, 65 + (seed % 20))}%`,
    icon,
    gradient,
    miloAdvice,
    sunrise: solar.sunrise,
    sunset: solar.sunset,
    solarNoon: solar.solarNoon,
    sunlightHours: solar.sunlightHours,
    forecast: {
      morning: { temp: `${morningTemp}°C`, rain: `${morningRain}%`, icon: morningRain > 40 ? "🌧️" : "⛅" },
      afternoon: { temp: `${afternoonTemp}°C`, rain: `${afternoonRain}%`, icon: afternoonRain > 50 ? "🌧️" : "☀️" },
      night: { temp: `${nightTemp}°C`, rain: `${nightRain}%`, icon: "🌙" }
    }
  };
}

function getCalculatedMoonData(dateStr: string) {
  const now = new Date(dateStr + "T12:00:00");
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = Math.floor(a / 4);
  const c = 2 - a + b;
  const e = Math.floor(365.25 * (y + 4716));
  const f = Math.floor(30.6001 * (m + 1));
  const jd = c + day + e + f - 1524.5;
  const daysSinceNew = jd - 2451549.5;
  const cycles = daysSinceNew / 29.530588853;
  const age = (cycles - Math.floor(cycles)) * 29.530588853;

  let phaseName = "";
  let phaseEmoji = "";
  if (age < 1.845) { phaseName = "Luna Nueva"; phaseEmoji = "🌑"; }
  else if (age < 5.53) { phaseName = "Luna Creciente"; phaseEmoji = "🌒"; }
  else if (age < 9.22) { phaseName = "Cuarto Creciente"; phaseEmoji = "🌓"; }
  else if (age < 12.91) { phaseName = "Gibosa Creciente"; phaseEmoji = "🌔"; }
  else if (age < 16.60) { phaseName = "Luna Llena"; phaseEmoji = "🌕"; }
  else if (age < 20.29) { phaseName = "Gibosa Menguante"; phaseEmoji = "🌖"; }
  else if (age < 23.98) { phaseName = "Cuarto Menguante"; phaseEmoji = "🌗"; }
  else if (age < 27.67) { phaseName = "Luna Menguante"; phaseEmoji = "🌘"; }
  else { phaseName = "Luna Nueva"; phaseEmoji = "🌑"; }

  const illuminationPct = Math.round((1 - Math.cos((age / 29.530588853) * 2 * Math.PI)) / 2 * 100);

  // Next New Moon calculation
  let daysUntilNextNewMoon = 29.530588853 - age;
  if (daysUntilNextNewMoon < 0.8) {
    daysUntilNextNewMoon += 29.530588853;
  }
  const roundedDays = Math.round(daysUntilNextNewMoon);

  const nextNewMoonDate = new Date(now.getTime() + daysUntilNextNewMoon * 24 * 60 * 60 * 1000);
  const monthNamesEs = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const formattedNextDate = `${nextNewMoonDate.getDate()} ${monthNamesEs[nextNewMoonDate.getMonth()]}`;

  const nextNewMoonText = `En ${roundedDays} día${roundedDays === 1 ? '' : 's'} (${formattedNextDate}) 🌑`;

  const fallbackMeanings: Record<string, string> = {
    "Luna Nueva": "Sintonía de propósitos. Afecta al nido trayendo paz reflexiva y favorece el cuidado intuitivo de vuestras emociones.",
    "Luna Creciente": "Energía ascendente. Impulsa vuestro entusiasmo en proyectos mutuos y revitaliza el dinamismo del hogar hoy.",
    "Cuarto Creciente": "Enfoque y decisión práctica. Sintoniza vuestro nido para resolver pendientes con excelente claridad y orden.",
    "Gibosa Creciente": "Armonía y paciencia. Fomenta la calma en la convivencia cotidiana y afina la intuición compartida.",
    "Luna Llena": "Máxima luz y sensibilidad. Eleva la ternura en la pareja y activa la sintonía alegre de vuestras mascotas.",
    "Gibosa Menguante": "Gratitud y descanso. Sintoniza el hogar con el agradecimiento compartido y disuelve suavemente la fatiga.",
    "Cuarto Menguante": "Limpieza y desintoxicación. Invita a renovar la energía del hogar y a regalarse un descanso reparador.",
    "Luna Menguante": "Regeneración silenciosa. Sintoniza vuestro nido con el sosiego suave, ideal para conectar en paz."
  };

  return {
    phaseName,
    phaseEmoji,
    fullPhaseText: `${phaseName} ${phaseEmoji}`,
    age: Math.round(age * 10) / 10,
    illuminationPct,
    nextNewMoonText,
    meaning: fallbackMeanings[phaseName] || "Sintoniza con la paz del nido y reflexiona en armonía."
  };
}

// Centralized Home Initialization Endpoint for Milo
app.get("/api/ai/init-home-state", async (req, res) => {
  const summary = getHomeContextSummary();
  const store = getStore();
  const now = new Date();
  const hr = now.getHours();

  let timeOfDay: "morning" | "afternoon" | "evening" = "morning";
  if (hr >= 12 && hr < 18) timeOfDay = "afternoon";
  else if (hr >= 18 || hr < 5) timeOfDay = "evening";

  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);
  const cacheKey = `${homeCode}_${summary.today}_${timeOfDay}`;
  const isForceRefresh = req.query.refresh === "true";

  // 1. Weather calculation
  const weather = getCalculatedBogotaWeather(now);

  // 2. Astronomical Moon calculation
  const moon = getCalculatedMoonData(summary.today);

  // 3. Greeting calculation
  let greeting = isForceRefresh ? null : greetingCache[cacheKey];
  if (!greeting && ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el contexto actual del hogar y genera el saludo amoroso de hoy para Mafe y Benja.
Momento: ${timeOfDay}
Fecha: ${summary.today}
Clima hoy: ${weather.desc}, ${weather.temp} en Bogotá
Fase lunar: ${moon.fullPhaseText}
Mascotas: ${summary.pets}
Plantas: ${summary.plants}
Tareas hoy: ${summary.tasks}
Alertas: ${summary.alerts}`,
        config: {
          systemInstruction: `Eres Milo, el asistente de confianza y guardián amoroso del hogar compartido de Mafe y Benja.
Tu tono es cálido, claro, asertivo y amigable, con un toque colombiano natural sutil y respetuoso.
REGLA DE ORO DE VERACIDAD DE DATOS: SOLO menciona eventos, tareas, plantas o mascotas que existan explícitamente en la lista. Si están vacíos, no inventes ninguno.
Escribe un mensaje de saludo breve (máximo 3 líneas).`,
          temperature: 0.7
        }
      });
      greeting = response.text?.trim() || null;
      if (greeting) greetingCache[cacheKey] = greeting;
    } catch (err) {
      recordQuotaFailure();
    }
  }

  if (!greeting) {
    greeting = timeOfDay === "morning"
      ? `¡Buenos días, Mafe y Benja! 🏡 Qué alegría comenzar este día en nuestro nido. Por acá todo marcha en completa calma para disfrutar en pareja. ¡Un abrazo gigante! 💛✨`
      : timeOfDay === "afternoon"
      ? `¡Buenas tardes, Mafe y Benja! ☀️ Espero que su jornada siga llena de tranquilidad y amor en nuestro hogar. ¡Un abrazo calientito! 🏡💛`
      : `¡Buenas noches, Mafe y Benja! ✨ Llegó la hora de descansar y recargar energías acurrucados en nuestro nido. ¡Que tengan sueños muy bonitos! 😴💛`;
    greetingCache[cacheKey] = greeting;
  }

  // 4. Briefing and Tasks Analysis
  const todayTasks = (store.calendarItems || []).filter(i => i.date === summary.today);
  const pendingTasks = todayTasks.filter(i => i.status !== 'done');
  const completedTasks = todayTasks.filter(i => i.status === 'done');
  const alertsList = summary.alerts ? summary.alerts.split("\n").filter(Boolean) : [];

  let harmonyScore = 95;
  if (pendingTasks.length > 3) harmonyScore -= 10;
  if (alertsList.length > 0) harmonyScore -= 5 * alertsList.length;
  harmonyScore = Math.max(60, Math.min(100, harmonyScore));

  let briefingSummary = "Todo el nido está en completa paz y orden hoy.";
  if (pendingTasks.length > 0) {
    briefingSummary = `Tenemos ${pendingTasks.length} tarea${pendingTasks.length > 1 ? 's' : ''} pendiente${pendingTasks.length > 1 ? 's' : ''} para hoy en la agenda.`;
  } else if (completedTasks.length > 0) {
    briefingSummary = `¡Excelente trabajo! Ya han completado las tareas agendadas para hoy.`;
  }

  const resultData = {
    timeOfDay,
    dailyGreeting: greeting,
    weather,
    moon,
    briefing: {
      todayTasksTotal: todayTasks.length,
      pendingTasksCount: pendingTasks.length,
      completedTasksCount: completedTasks.length,
      alertsCount: alertsList.length,
      alerts: alertsList,
      summaryText: briefingSummary
    },
    harmonyScore,
    lastUpdated: new Date().toISOString(),
    homeSummary: summary
  };

  // Save to store and Firestore database
  (store as any).miloDailyUpdates = (store as any).miloDailyUpdates || {};
  (store as any).miloDailyUpdates[`${homeCode}_${summary.today}`] = resultData;

  try {
    if (firestore) {
      const docRef = doc(firestore, "milo_daily_updates", `${homeCode}_${summary.today}`);
      setDoc(docRef, { ...resultData, updatedBy: "Milo AI (Gemini)" }, { merge: true }).catch(() => {});
    }
  } catch {}

  res.json(resultData);
});

// Endpoint to check if Milo has updated the home context for today
app.get("/api/ai/milo-daily-status", async (req, res) => {
  const summary = getHomeContextSummary();
  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);
  const dateStr = summary.today;
  const store = getStore();

  let record = (store as any).miloDailyUpdates?.[`${homeCode}_${dateStr}`];

  if (!record && firestore) {
    try {
      const docRef = doc(firestore, "milo_daily_updates", `${homeCode}_${dateStr}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        record = docSnap.data();
        (store as any).miloDailyUpdates = (store as any).miloDailyUpdates || {};
        (store as any).miloDailyUpdates[`${homeCode}_${dateStr}`] = record;
      }
    } catch {}
  }

  res.json({
    updatedToday: !!record,
    todayDate: dateStr,
    lastUpdate: record || null
  });
});

// Endpoint to explicitly trigger Milo's daily context update using Gemini
app.post("/api/ai/update-milo-daily-context", async (req, res) => {
  const summary = getHomeContextSummary();
  const store = getStore();
  const now = new Date();
  const hr = now.getHours();

  let timeOfDay: "morning" | "afternoon" | "evening" = "morning";
  if (hr >= 12 && hr < 18) timeOfDay = "afternoon";
  else if (hr >= 18 || hr < 5) timeOfDay = "evening";

  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);

  // 1. Weather calculation for Bogotá
  const weather = getCalculatedBogotaWeather(now);

  // 2. Astronomical Moon calculation
  const moon = getCalculatedMoonData(summary.today);

  // 3. Briefing analysis
  const todayTasks = (store.calendarItems || []).filter(i => i.date === summary.today);
  const pendingTasks = todayTasks.filter(i => i.status !== 'done');
  const completedTasks = todayTasks.filter(i => i.status === 'done');
  const alertsList = summary.alerts ? summary.alerts.split("\n").filter(Boolean) : [];

  let harmonyScore = 95;
  if (pendingTasks.length > 3) harmonyScore -= 10;
  if (alertsList.length > 0) harmonyScore -= 5 * alertsList.length;
  harmonyScore = Math.max(60, Math.min(100, harmonyScore));

  let briefingSummary = "Todo el nido está en completa paz y orden hoy.";
  if (pendingTasks.length > 0) {
    briefingSummary = `Tenemos ${pendingTasks.length} tarea${pendingTasks.length > 1 ? 's' : ''} pendiente${pendingTasks.length > 1 ? 's' : ''} para hoy en la agenda.`;
  } else if (completedTasks.length > 0) {
    briefingSummary = `¡Excelente trabajo! Ya han completado las tareas agendadas para hoy.`;
  }

  // 4. Generate fresh welcome message via Gemini API
  let greeting: string | null = null;
  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el contexto del hogar y genera el mensaje amoroso de bienvenida de hoy para Mafe y Benja.
Momento: ${timeOfDay}
Fecha: ${summary.today}
Clima Bogotá: ${weather.desc}, ${weather.temp}, prob. lluvia ${weather.probRain}
Fase lunar: ${moon.fullPhaseText} (${moon.illuminationPct}% iluminada)
Mascotas: ${summary.pets}
Plantas: ${summary.plants}
Tareas hoy: ${summary.tasks}
Alertas del día: ${summary.alerts}`,
        config: {
          systemInstruction: `Eres Milo, el asistente de confianza y guardián amoroso del hogar compartido de Mafe y Benja.
Tu tono es cálido, claro, asertivo y amigable, con un toque colombiano natural muy sutil.
REGLA DE ORO DE VERACIDAD DE DATOS: SOLO menciona eventos, tareas, plantas o mascotas que existan explícitamente en la lista.
Escribe un mensaje de bienvenida cálido, inspirador e intuitivo para el nido (máximo 3 líneas).`,
          temperature: 0.7
        }
      });
      greeting = response.text?.trim() || null;
    } catch (err) {
      recordQuotaFailure();
    }
  }

  if (!greeting) {
    greeting = timeOfDay === "morning"
      ? `¡Buenos días, Mafe y Benja! 🏡 Qué alegría comenzar este día en nuestro nido. El clima en Bogotá estará ${weather.desc.toLowerCase()} (${weather.temp}). Todo marcha en completa calma para disfrutar en pareja. ¡Un abrazo gigante! 💛✨`
      : timeOfDay === "afternoon"
      ? `¡Buenas tardes, Mafe y Benja! ☀️ Espero que su jornada siga llena de tranquilidad y amor en nuestro hogar. El cielo en Bogotá reporta ${weather.desc.toLowerCase()} (${weather.temp}). ¡Un abrazo calientito! 🏡💛`
      : `¡Buenas noches, Mafe y Benja! ✨ Llegó la hora de descansar y recargar energías acurrucados en nuestro nido bajo la ${moon.fullPhaseText}. ¡Que tengan sueños muy bonitos! 😴💛`;
  }

  const resultRecord = {
    timeOfDay,
    dailyGreeting: greeting,
    weather,
    moon,
    briefing: {
      todayTasksTotal: todayTasks.length,
      pendingTasksCount: pendingTasks.length,
      completedTasksCount: completedTasks.length,
      alertsCount: alertsList.length,
      alerts: alertsList,
      summaryText: briefingSummary
    },
    harmonyScore,
    lastUpdated: new Date().toISOString()
  };

  // Save to memory store
  (store as any).miloDailyUpdates = (store as any).miloDailyUpdates || {};
  (store as any).miloDailyUpdates[`${homeCode}_${summary.today}`] = resultRecord;

  // Save to Firestore database if available
  try {
    if (firestore) {
      const docRef = doc(firestore, "milo_daily_updates", `${homeCode}_${summary.today}`);
      await setDoc(docRef, { ...resultRecord, updatedBy: "Milo AI (Gemini)" }, { merge: true });
    }
  } catch (fsErr) {
    console.warn("Could not persist Milo update to Firestore:", fsErr);
  }

  res.json({
    success: true,
    updatedToday: true,
    data: resultRecord
  });
});

// Smart AI endpoints leveraging the server-side Gemini API client

// 1. Daily Message Generator (Tono Cálido + Gatito)
app.get("/api/ai/daily-greeting", async (req, res) => {
  const rawHomeCode = req.headers["x-home-code"] as string || "HOGARPELUDO";
  const homeCode = normalizeHomeCode(rawHomeCode);
  const summary = getHomeContextSummary();
  const timeOfDay = req.query.timeOfDay || "morning"; // morning / afternoon / evening
  const refresh = req.query.refresh === "true" || req.query.force === "true";

  const cacheKey = `${homeCode}_${summary.today}_${timeOfDay}`;
  if (!refresh && greetingCache[cacheKey]) {
    return res.json({ message: greetingCache[cacheKey] });
  }

  const systemInstruction = `Eres Milo, el asistente de confianza y guardián amoroso del hogar compartido de Mafe y Benja.
Tu tono es sumamente cálido, claro, asertivo y amigable, con un toque colombiano natural muy sutil y respetuoso (puedes usar de vez en cuando palabras como "chévere", "pues", "de una" o "bacano" de forma sutil). Evita maullidos, ronroneos o ruidos de gato excesivos. Hablas en español.
Usa emojis cálidos (🏡, 💛, ✨) de forma suave y refinada.
Te diriges a Mafe y Benja juntos con mucha calidez, amabilidad y respeto.

REGLA DE ORO DE VERACIDAD DE DATOS (ESTRICTA Y OBLIGATORIA):
- SOLO menciona eventos, tareas, plantas, mascotas o actividades que estén EXPLÍCITAMENTE detallados en los datos provistos.
- Si una categoría dice "Ninguna planta registrada", "Ninguna tarea", "Ninguna mascota", etc., TIENES ESTRICTAMENTE PROHIBIDO inventar o nombrar plantas (como Ornela u otras), mascotas o tareas inexistentes.
- Si no hay plantas o tareas registradas en el sistema, salúdalos enfocándote en el amor de la pareja, la armonía del hogar, el clima de Bogotá o la tranquilidad de estar juntos.
- Genera un mensaje cortito de saludo de ${timeOfDay === 'morning' ? 'Buenos días' : timeOfDay === 'afternoon' ? 'Buenas tardes' : 'Buenas noches'} de no más de 3 líneas.`;

  const prompt = `Fecha de hoy: ${summary.today}
Estado actual de las mascotas:
${summary.pets}

Estado actual de las plantas:
${summary.plants}

Actividades y Tareas de Hoy:
${summary.tasks}

Alertas críticas del hogar:
${summary.alerts}

Por favor escribe el saludo del momento del día: ${timeOfDay}. Haz que sea 100% verídico a estos datos, reconfortante y acogedor.`;

  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      const txt = response.text?.trim();
      if (txt) {
        greetingCache[cacheKey] = txt;
        return res.json({ message: txt });
      }
    } catch (err) {
      recordQuotaFailure();
      console.log("Milo Info: Canal cósmico saturado, activando respuesta sincronizada local.");
    }
  }

  // Fallback if no Gemini Client or Quota error
  const store = getStore();
  const todayTasks = store.calendarItems.filter(i => i.date === summary.today && i.status !== 'done');
  const completedTasks = store.calendarItems.filter(i => i.date === summary.today && i.status === 'done');
  const catNoises = ["¡Miau!", "¡Prrr!", "¡Purr!", "¡Miauuu!", "¡Milo miau!"];
  const noise = catNoises[Math.floor(Math.random() * catNoises.length)];

  let fallbackMessage = "";
  if (timeOfDay === "morning") {
    fallbackMessage = `${noise} ¡Buenos días, Mafe & Benja! 🐾 Espero que su mañana comience llena de paz y alegría en el nido. `;
    if (todayTasks.length > 0) {
      fallbackMessage += `Hoy tenemos en la agenda: "${todayTasks[0].title}". ¡Seguro harán un gran equipo! `;
    } else {
      fallbackMessage += `Hoy el día se siente despejado y tranquilo para disfrutar nuestro hogar. `;
    }
    if (store.pets.length > 0) {
      const petNames = store.pets.map(p => p.name).join(" y ");
      fallbackMessage += `Un abrazo cálido de Milo para ustedes dos y para ${petNames} 💛.`;
    } else {
      fallbackMessage += `Un abrazo cálido de Milo para ustedes dos 💛.`;
    }
  } else if (timeOfDay === "afternoon") {
    fallbackMessage = `${noise} ¡Buenas tardes, Mafe y Benja! ☀️ Espero que su día vaya de lo más bonito y tranquilo en nuestro nido. `;
    if (completedTasks.length > 0) {
      fallbackMessage += `Me alegra ver cómo avanzan juntos con la rutina compartida. `;
    } else {
      fallbackMessage += `Recuerden hacer una pausa para estirarse, tomar algo calientito y compartir un momento lindo juntos. `;
    }
    fallbackMessage += `¡Un abrazo con todo el cariño del nido! 🏡💛`;
  } else {
    fallbackMessage = `${noise} ¡Buenas noches, Mafe y Benja! ✨ Qué lindo es ver la paz y armonía con la que cerramos el día en nuestro hogar. Hora de descansar acurrucados y recargar energías. ¡Que tengan sueños hermosos y reparadores! 😴🏡💛`;
  }

  greetingCache[cacheKey] = fallbackMessage;
  res.json({ message: fallbackMessage });
});

// 1.5. Moon Phase Info and Meaning updated with AI
app.get("/api/ai/moon-info", async (req, res) => {
  const summary = getHomeContextSummary();
  const store = getStore();
  const activeUsers = store.users;

  // Compute precise astronomical moon data
  const baseMoonData = getCalculatedMoonData(summary.today);

  const cacheKey = `${summary.today}_moon`;
  if (moonCache[cacheKey]) {
    return res.json(moonCache[cacheKey]);
  }

  const userSigns = activeUsers.map(u => `${u.name} (${u.zodiacSign || "Signo solar místico"})`).join(", ");

  const systemInstruction = `Eres Milo, el astrólogo sabio del nido de Mafe y Benja.
Tu única misión hoy es dar un reporte ultra corto, conciso y resumido (máximo 1 frase corta y directa, de menos de 18 palabras en total) que explique únicamente cómo afecta la fase lunar de hoy (${baseMoonData.fullPhaseText}) a la sintonía del nido y a sus signos (${userSigns}) hoy.
Reglas strictly de tono:
- Sin introducciones de relleno, explicaciones académicas, ruidos de gato o terminología técnica.
- Sé sumamente breve, directo y resumido: ve directo al grano, sin dar explicaciones largas.
- Está terminantemente PROHIBIDO mencionar la palabra "IA", "AI", "Inteligencia Artificial", "actualizado con IA", "algoritmo", o cualquier referencia a actualizaciones de sistemas. Debe sonar como sabiduría astrológica interna directa.
- Longitud máxima absoluta de tu respuesta entera: 18 palabras.`;

  const prompt = `Hoy es ${summary.today}. La Luna está en fase: ${baseMoonData.fullPhaseText}. Explica en una sola frase extremadamente corta de menos de 18 palabras cómo afecta la sintonía del hogar de Mafe y Benja y sus signos hoy de forma sumamente resumida.`;

  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.8,
        }
      });
      const txt = response.text?.trim();
      if (txt) {
        const result = {
          phase: baseMoonData.fullPhaseText,
          age: baseMoonData.age,
          illuminationPct: baseMoonData.illuminationPct,
          nextNewMoonText: baseMoonData.nextNewMoonText,
          meaning: txt
        };
        moonCache[cacheKey] = result;
        return res.json(result);
      }
    } catch (err) {
      recordQuotaFailure();
    }
  }

  const result = {
    phase: baseMoonData.fullPhaseText,
    age: baseMoonData.age,
    illuminationPct: baseMoonData.illuminationPct,
    nextNewMoonText: baseMoonData.nextNewMoonText,
    meaning: baseMoonData.meaning
  };
  moonCache[cacheKey] = result;
  res.json(result);
});

// 2. Custom Personalized Zodiac Horoscope for Home Members
app.get("/api/ai/horoscope", async (req, res) => {
  const summary = getHomeContextSummary();
  const store = getStore();
  const activeUsers = store.users;

  if (activeUsers.length === 0) {
    return res.json({ userPredictions: [], homeCompatibility: { score: 100, title: "Sintonía en pausa", description: "Espera a registrar inquilinos en el nido." } });
  }

  const isRegenerate = req.query.regenerate === "true";

  // Cache key based on date and active users
  const activeUserIdsKey = activeUsers.map(u => u.id).sort().join(",");
  const cacheKey = `${summary.today}_${activeUserIdsKey}`;
  if (horoscopeCache[cacheKey] && !isRegenerate) {
    return res.json(horoscopeCache[cacheKey]);
  }

  // Calculate home state and personality values
  const personalityState = getHomePersonalityState(summary.today);
  
  // Create description of users with their dynamic daily transits
  const usersSpecs = activeUsers.map(u => {
    const transit = getAstroProfile(u.id, summary.today).transitData;
    return `- ${u.name} (Signo Solar: ${u.zodiacSign || 'No especificado'}. Tránsitos de hoy miau -> Sensibilidad Emocional: ${transit.emotionalSensitivity}%, Energía de Comunicación: ${transit.communicationEnergy}%, Influencia en Armonía Doméstica: ${transit.homeHarmonyInfluence}%).`;
  }).join("\n");

  const systemInstruction = `Eres Milo, el astrólogo y sabio consejero del nido de Mafe y Benja. Tu tono es directo, sumamente asertivo, claro, certero y muy comprensible, con un toque colombiano natural muy sutil y amigable (puedes usar de vez en cuando palabras como "chévere", "pues", "de una" o "bacano" de forma sutil). Elimina por completo los maullidos, ronroneos, ruidos de gato o terminología felina que pueda restar claridad.

${usersSpecs}

La Personalidad Cósmica del Hogar calculada hoy es: "${personalityState.currentPersonality.toUpperCase()}" (${personalityState.evolutionIdentity})
Índices de Hoy del Nido:
- Estabilidad Emocional: ${personalityState.scores.emotionalStability}%
- Conexión Social: ${personalityState.scores.socialConnection}%
- Nivel de Actividad: ${personalityState.scores.activityLevel}%
- Resistencia al Estrés: ${personalityState.scores.stressResistance}%
- Índice de Armonía: ${personalityState.scores.harmonyIndex}%

REGLAS DE DISEÑO DE RESPUESTA DE MILO (EXPLICACIONES ULTRA CLARAS Y CONCISAS):
1. No dejes lugar a dudas. Habla con claridad extrema, de tú a tú, sin rodeos teóricos o tecnicismos astrológicos oscuros.
2. Cada alineación o tránsito que menciones debe estar VINCULADO DE INMEDIATO con su impacto directo en el estado de ánimo, la fatiga, el humor o la energía en el hogar hoy. Explica exactamente CÓMO les afecta.
3. El tono debe ser altamente asertivo y revelador, pero a la vez cálido y claro, con un aire de amistad colombiano (cero ruidos de gato o palabras felinas).
4. Evita a toda costa textos eternos o explicaciones académicas de relleno. Sé conciso y directo en cada frase, limitando las predicciones a 2-3 frases muy reveladoras y prácticas.
5. Es obligatorio indicar un color propicio/de la suerte para hoy de forma evidente con su emoji y una descripción corta. El color DEBE ser un color fijo, simple, puro y variar de forma diaria para cada habitante según su signo solar y la fecha actual. No repitas los mismos colores seguidos; asegúrate de que cambien día tras día para brindar variedad. Usa exclusivamente nombres de colores fijos, sencillos y clásicos como: Amarillo 💛, Rojo 🔴, Azul claro 💙, Azul marino 🔵, Verde claro 💚, Verde oscuro 🌲, Rosa 💗, Naranja 🧡, Morado 💜, Blanco 🤍, Dorado 🌟, Plateado 🪙 o Café 🟤. Está estrictamente PROHIBIDO usar nombres compuestos, rebuscados, poéticos o similares que se parezcan entre sí (por ejemplo, nunca uses "Verde esperanza" o "Verde esmeralda", en su lugar usa el color fijo y directo como "Verde claro 💚" o "Verde oscuro 🌲"). La descripción del color ("luckyColorDesc") DEBE ser extremadamente corta, concisa y directa (de máximo una sola frase muy breve, ej: "Te ayuda a enfocarte si estás aprendiendo algo nuevo o a organizar pendientes hoy."). No agregues frases repetitivas de relleno. Asegura variedad diaria absoluta y que se sienta directamente conectado con la energía cósmica de su signo en este día específico.
6. Ofrece 2 rituales o actividades muy prácticos y sencillos para hacer en el hogar hoy.
7. Está terminantemente PROHIBIDO usar las siglas "IA", "AI" o las palabras "Inteligencia Artificial", "algoritmo", "actualizado con IA" o referirse a actualizaciones del sistema. Todo debe sonar de forma mística, natural e interna del nido de Milo. No incluyas textos largos.

Debes retornar un JSON EXACTO que cumpla con el siguiente esquema:
{
  "userPredictions": [
    ${activeUsers.map(u => `{
      "userId": "${u.id}",
      "userName": "${u.name}",
      "prediction": "Predicción estelar directa, asertiva y detallada de 3-4 frases que conecte su signo solar (${u.zodiacSign || 'Espíritu'}) con el ambiente actual del nido y los tránsitos de HOY ${summary.today}.",
      "predictionSalud": "Predicción asertiva de salud y vitalidad de 1-2 frases en español con pautas claras de bienestar.",
      "predictionAmor": "Predicción asertiva de amor, romance y convivencia de 1-2 frases en español.",
      "predictionTrabajo": "Predicción asertiva de trabajo, dinero y misiones de 1-2 frases en español.",
      "predictionEspiritualidad": "Predicción asertiva de espiritualidad, paz mental y fe de 1-2 frases en español.",
      "advice": "Un consejo práctico de acción y de comunicación para el hogar hoy.",
      "luckyColor": "Color propicio de hoy (ej: Amarillo brillante 💛, Azul celeste 💙, Rojo pasión 🔴, Verde esperanza 💚, Rosa amoroso 💗)",
      "luckyColorDesc": "Descripción corta de por qué y cómo este color favorece sus vibras y emociones hoy.",
      "recommendedActivities": [
        "Actividad 1 recomendada por Milo",
        "Actividad 2 recomendada por Milo"
      ]
    }`).join(",\n")}
  ],
  "homeCompatibility": {
    "score": ${personalityState.scores.socialConnection},
    "title": "Pon un título cósmico/astrológico específico y asertivo en español",
    "description": "Un análisis asertivo y detallado de 3-4 frases de cómo fluye hoy la compatibilidad en este nido, equilibrando los signos de Mafe y Benja con las estrellas del día."
  },
  "astralClimate": {
    "sunSign": "Géminis ♊",
    "moonSign": "Cáncer ♋",
    "sunMoonMeaning": "Explicación profunda de 2-3 frases sobre qué significa que el Sol y la Luna estén en esas posiciones hoy para las almas del nido.",
    "otherPlanetsInfluence": "Explicación detallada de 2-3 frases sobre qué otros planetas (como Mercurio, Venus, Marte, Júpiter o Saturno) influyen en las emociones y acontecimientos de este día o de la semana.",
    "cosmicEvent": "Título y descripción de un evento astrológico o astronómico importante de hoy o de esta semana (ej: Conjunción de Venus, Lluvia de estrellas Líridas, Solsticio, o Luna Nueva en Leo) que traiga un ritual hogareño sugerido."
  }
}`;

  const randomFactOrWord = [
    "enfoque en la armonía cotidiana", "flujo de abundancia compartida", "despertar de la creatividad en pareja", "comunicación asertiva y sincera",
    "equilibrio de emociones y descanso", "renovación de propósitos y metas", "limpieza de espacios y frescura", "unión de almas en el nido",
    "serenidad nocturna y paz mental", "entusiasmo diurno y vitalidad", "vitalidad física y salud corporal", "conexión mística y complicidad"
  ][Math.floor(Math.random() * 12)];

  const prompt = `Fecha de hoy: ${summary.today}. Factor cósmico del momento: ${randomFactOrWord}. ID de consulta única para máxima variedad: ${Math.random().toString(36).substring(7)}. Genera el horóscopo místico exclusivo, el clima astral completo (el significado del Sol/Luna, otros planetas influyentes y evento astrofísico actual) y el análisis de compatibilidad de hoy para los habitantes de este nido. Recuerda variar los consejos, predicciones y colores de poder para que sean sumamente frescos, evitando repetir textos anteriores.`;

  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.95,
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      if (parsed.userPredictions) {
        horoscopeCache[cacheKey] = parsed;
        return res.json(parsed);
      }
    } catch (err) {
      recordQuotaFailure();
      console.log("Milo Info: Alineacion de horoscopo cargada localmente miau.");
    }
  }

  // Dynamic deterministic seed-based fallback Horoscope
  const now = new Date(summary.today);
  const dayOfMonth = now.getDate();
  const dayOfWeek = now.getDay();

  // If on-demand regeneration is active, mix a random modifier to change the content
  const randomModifier = isRegenerate ? Math.floor(Math.random() * 100) + 1 : 0;

  const fallbackPredictions = activeUsers.map(u => {
    const transit = getAstroProfile(u.id, summary.today).transitData;
    const seed = u.name.charCodeAt(0) + dayOfMonth * 17 + now.getMonth() * 31 + now.getFullYear() * 7 + randomModifier;

    const healthAdvices = [
      `Tus niveles de vitalidad del ${transit.emotionalSensitivity}% hoy aconsejan estiramientos suaves o una caminata tranquila. ¡A camellar con toda, pero cuidando la postura pues!`,
      `Excelente momento para descansar, tomar agua fresca y desintoxicar tu cuerpo. Tu cuerpo responde increíble al descanso bien merecido.`,
      `Tu resistencia hoy es sólida. Disfruta de un paseo relajante bajo el sol o recarga pilas con un sueño reparador y chévere.`
    ];

    const loveAdvices = [
      `Venus favorece la complicidad y la armonía en vuestra convivencia hoy. Saquen un rato chévere para compartir una conversación agradable y relajada de una.`,
      `El diálogo amoroso asertivo disuelve tensiones de convivencia. Habla con palabras suaves que traigan tranquilidad al hogar.`,
      `Un gran día para compartir tus deseos con tu pareja y festejar vuestro hermoso vínculo bajo el brillo de las estrellas.`
    ];

    const workAdvices = [
      `Mercurio potencia hoy tu enfoque y precisión. Organizarás vuestras tareas y metas del hogar en tiempo récord.`,
      `Estás persiguiendo vuestros propósitos financieros del hogar con enfoque total. Tus decisiones prácticas hoy darán gran fruto pues.`,
      `Excelente momento para planificar y organizar pendientes de la casa de forma muy bacana y productiva.`
    ];

    const spiritAdvices = [
      `Sintoniza con el agradecimiento absoluto por las pequeñas alegrías del día. Un momento de calma te vendrá de maravilla.`,
      `La paz mental florece cuando haces un silencio reparador. Excelente momento para una pausa meditativa en vuestro rincón favorito.`,
      `Confía en tu sabiduría y en tu intuición hoy, que te guiarán con total claridad por el mejor camino.`
    ];

    const colors = [
      { name: "Amarillo 💛", desc: "Activa tu intelecto, potencia tu optimismo y organiza tus pendientes con alegría hoy." },
      { name: "Rojo 🔴", desc: "Activa tu fuerza vital, enciende la determinación en tus misiones y aporta energía." },
      { name: "Azul claro 💙", desc: "Favorece una comunicación clara, trae paz mental y serenidad al hogar." },
      { name: "Azul marino 🔵", desc: "Consolida tu estabilidad personal, potencia tu enfoque y mantiene el orden diario." },
      { name: "Verde claro 💚", desc: "Atrae salud, frescura, equilibrio natural y te ayuda a enfocarte en tus pendientes." },
      { name: "Verde oscuro 🌲", desc: "Conecta con la estabilidad, la armonía familiar y una profunda sensación de calma." },
      { name: "Rosa 💗", desc: "Potencia la empatía, dulcifica los diálogos del hogar y sintoniza con el afecto puro." },
      { name: "Naranja 🧡", desc: "Despierta el entusiasmo, estimula la creatividad y levanta el humor para tus tareas." },
      { name: "Morado 💜", desc: "Conecta con tu intuición, transmuta las tensiones diarias y sintoniza paz espiritual." },
      { name: "Blanco 🤍", desc: "Brinda claridad mental absoluta, limpieza de energías y sensación de paz en tu día." },
      { name: "Dorado 🌟", desc: "Sintoniza con la prosperidad, el éxito laboral y la gratitud en el nido hoy." },
      { name: "Plateado 🪙", desc: "Aporta serenidad lunar, equilibrio a tus emociones y protección frente al estrés." },
      { name: "Café 🟤", desc: "Favorece la concentración profunda, el sentido de realidad y la estabilidad económica." }
    ];

    const allActivities = [
      "Preparar un postrecito o té caliente juntos en la cocina para aromatizar el hogar ☕🥧.",
      "Hacer una sesión breve de estiramientos suaves, respirando lento para relajar el cuerpo 🧘.",
      "Poner la canción favorita de la casa y dejarse llevar por ritmos relajantes y alegres 🎶.",
      "Consentir con cariño a Milo o vuestras mascotas para sintonizar vuestro corazón con paz inmensa 💛🐾.",
      "Escribir tres notas de agradecimiento mutuo por las pequeñas alegrías de compartir la vida en el nido de amor 🌸📝.",
      "Consentir las plantitas de casa dándoles agua fresca y limpiando sus hojitas de una 🪴."
    ];

    const predSalud = healthAdvices[seed % healthAdvices.length];
    const predAmor = loveAdvices[(seed + 1) % loveAdvices.length];
    const predTrabajo = workAdvices[(seed + 2) % workAdvices.length];
    const predEspiritualidad = spiritAdvices[(seed + 3) % spiritAdvices.length];
    
    // Pick lucky color based on user zodiac sign, date, and name for ultimate variety and relevance
    const zodiacStr = u.zodiacSign || "Místico";
    let zodiacHash = 0;
    for (let i = 0; i < zodiacStr.length; i++) {
      zodiacHash += zodiacStr.charCodeAt(i);
    }
    const colorSeed = zodiacHash + dayOfMonth * 13 + (now.getMonth() + 1) * 31 + u.name.charCodeAt(0);
    const chosenColor = colors[colorSeed % colors.length];
    
    // Select 2 activities based on seed
    const act1 = allActivities[seed % allActivities.length];
    const act2 = allActivities[(seed + 2) % allActivities.length];

    return {
      userId: u.id,
      userName: u.name,
      prediction: `La alineación de hoy conecta directamente con tu signo ${u.zodiacSign || 'Espíritu Místico'}. Tu sensibilidad se eleva al ${transit.emotionalSensitivity}%, trayendo una sintonía intuitiva que potenciará la lealtad y el calor en vuestro hogar compartido.`,
      predictionSalud: predSalud,
      predictionAmor: predAmor,
      predictionTrabajo: predTrabajo,
      predictionEspiritualidad: predEspiritualidad,
      advice: `Consejo para ${u.name}: Haz una pequeña pausa, tómate un café y respira con tranquilidad. ¡Te lo mereces pues! 🌱`,
      luckyColor: chosenColor.name,
      luckyColorDesc: chosenColor.desc,
      recommendedActivities: [act1, act2]
    };
  });

  // Deterministic Climate Fallback
  const moonSignsFallback = ["Cáncer ♋", "Acuario ♒", "Leo ♌", "Tauro ♉", "Virgo ♍", "Piscis ♓", "Libra ♎"];
  const currentMoonSign = moonSignsFallback[dayOfMonth % moonSignsFallback.length];

  const meanings = [
    "El Sol inyecta curiosidad intelectual, deseos de aprender y ligereza en la comunicación. Al mismo tiempo, la dulce Luna en Cáncer nos abraza el alma invitándonos a cuidar la calidez interna del hogar y saborear momentos de tranquilidad juntos.",
    "El Sol activa el dinamismo cerebral para idear soluciones con agilidad y enfoque, mientras la Luna nos recuerda sintonizar con la empatía de las confidencias silenciosas y el respeto mutuo pues.",
    "Bajo esta vibración estelar, la energía solar irradia optimismo, mientras que la influencia de la Luna inspira el gusto por los placeres sencillos del hogar: regar las macetas, preparar ricas bebidas y encender velas calmas."
  ];
  const chosenMeaning = meanings[dayOfMonth % meanings.length];

  const otherPlanets = [
    "Durante estos días, el tierno Mercurio suaviza los diálogos cotidianos y disuelve cualquier aspereza con palabras amables y asertivas. Venus, por su parte, activa los impulsos de consentirse con detalles hermosos.",
    "Esta semana, Marte dota a vuestras metas prácticas de una perseverancia infatigable, ideal para avanzar en tareas del hogar sin prisas. Saturno te invita a estructurar tus ideales de paz mental.",
    "El expansivo Júpiter amplifica el ingenio colectivo y el sentido del humor compartido en la casa. Es una semana grandiosa para reírse de las pequeñas anécdotas domésticas y pasarla chévere."
  ];
  const chosenPlanetInfluence = otherPlanets[dayOfMonth % otherPlanets.length];

  const events = [
    { title: "🌌 Conjunción Mística de Venus, Marte y Mercurio", desc: "Los tres planetas se alinean al amanecer enviando ondas de amabilidad, enfoque y comunicación asertiva para el nido compartido de una. Enciendan una vela o incienso suave hoy." },
    { title: "🌠 Lluvia de Estrellas Líridas sobre el Nido", desc: "El cosmos derrama chispas de luz visible en el firmamento. Simboliza la llegada de nuevas sorpresas y el florecer de anhelos compartidos en el amor. ¡Pidan un deseo chévere juntos!" },
    { title: "💎 Sextil de Oro entre Urano y el Sol", desc: "Un aspecto que propicia los cambios inesperados y felices en el hogar. Es un momento idóneo para remodelar un rinconcito o colocar una planta nueva llena de vida pues." },
    { title: "🌕 Plenilunio o Luna de Flores Dorada", desc: "La Luna brilla en su máximo esplendor, enviando frecuencias de purificación de vibras, descanso profundo de fin de semana y recarga emocional." }
  ];
  const chosenEvent = events[dayOfMonth % events.length];

  const fallbackResult = { 
    userPredictions: fallbackPredictions,
    homeCompatibility: {
      score: personalityState.scores.socialConnection,
      title: "Resonancia Estelar Consensuada",
      description: `Las órbitas celestes de Mafe y Benja hoy se entrelazan suavemente en el hogar. El índice de armonía de hoy del nido se encuentra al ${personalityState.scores.harmonyIndex}%, ideal para compartir confidencias, caricias y risas cósmicas bacanas.`
    },
    astralClimate: {
      sunSign: "Géminis ♊",
      moonSign: currentMoonSign,
      sunMoonMeaning: chosenMeaning,
      otherPlanetsInfluence: chosenPlanetInfluence,
      cosmicEvent: `${chosenEvent.title} — ${chosenEvent.desc}`
    }
  };

  horoscopeCache[cacheKey] = fallbackResult;
  res.json(fallbackResult);
});

// 3. Floating Gatito assistant helper chatbot
app.post("/api/ai/cat-chat", async (req, res) => {
  const { messages, extraContext } = req.body; // array of { sender: 'user' | 'cat', text: string }
  const summary = getHomeContextSummary();

  const store = getStore();
  const calendarStr = JSON.stringify(store.calendarItems);
  const petsStr = JSON.stringify(store.pets);
  const plantsStr = JSON.stringify(store.plants);
  const wishesStr = JSON.stringify(store.wishes);
  const memoriesStr = JSON.stringify(store.memories);
  const checkinsStr = JSON.stringify(store.checkins || []);
  const workoutLogsStr = JSON.stringify(store.workoutLogs || []);
  const budgetStr = JSON.stringify({
    items: store.budgetItems || [],
    estimates: store.budgetEstimates || [],
    accounts: store.budgetAccounts || []
  });
  const wellnessStr = JSON.stringify({
    challenges: store.saludChallenges || [],
    frascoMessages: store.frascoMessages || [],
    answers: store.dailyAnswers || []
  });
  const documentsStr = JSON.stringify((store.documents || []).map(d => ({ title: d.title, category: d.category, dateUploaded: d.dateUploaded })));
  const usersStr = JSON.stringify(store.users.map(u => ({ name: u.name, birthDate: u.birthDate, birthPlace: u.birthPlace, astroSign: u.zodiacSign || "desconocido" })));

  // Calculate dynamic Menstrual Cycle State if provided
  let menstrualCycleContextStr = "No se ha configurado el ciclo menstrual en el nido todavía.";
  if (extraContext && extraContext.cycleConfig) {
    try {
      const { cycleDays, periodDays, lastPeriodStart } = extraContext.cycleConfig;
      if (lastPeriodStart) {
        const parts = lastPeriodStart.split("-");
        const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        const today = new Date();
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let currentDayInCycle = (diffDays % cycleDays) + 1;
        if (currentDayInCycle <= 0) {
          currentDayInCycle = cycleDays + currentDayInCycle;
        }
        
        let phaseCode = "luteal";
        let phaseName = "Fase Lútea 🧘";
        let recommendations = "Días ideales para la calma, la introspección, baños calientes y comer sano.";
        
        if (currentDayInCycle <= periodDays) {
          phaseCode = "menstruation";
          phaseName = "Menstruación 🩸";
          recommendations = "Se aconsejan infusiones calientes (como té de jengibre o manzanilla), evitar cafeína, priorizar el descanso profundo y hacer estiramientos o yoga suave. ¡Benja, mima mucho a Mafe con caricias pues!";
        } else if (currentDayInCycle <= 11) {
          phaseCode = "follicular";
          phaseName = "Fase Folicular 🌸";
          recommendations = "Nivel de energía física y mental en aumento, momento ideal para planificar nuevas metas, iniciar proyectos, entrenar más intenso y salir a pasear.";
        } else if (currentDayInCycle <= 16) {
          phaseCode = "ovulation";
          phaseName = "Ovulación 🥚";
          recommendations = "Energía y sintonía social al máximo. Gran momento para un date romántico o plan especial en pareja, cocinar algo rico o planear viajes chéveres.";
        }
        
        menstrualCycleContextStr = `Mafe se encuentra en el Día ${currentDayInCycle} de su ciclo menstrual (de ${cycleDays} días). Fase actual: ${phaseName}. Recomendaciones de bienestar familiar para Mafe: ${recommendations}`;
      }
    } catch (e) {
      console.error("Error parsing menstrual cycle context:", e);
    }
  }

  const personalityState = getHomePersonalityState(summary.today);
  const pType = personalityState.currentPersonality;

  let personalitySpecificPrompt = "";
  if (pType === "calm") {
    personalitySpecificPrompt = `
- El hogar se encuentra hoy bajo la influencia de un HOGAR CALMO (Estabilidad: ${personalityState.scores.emotionalStability}%). Tu tono hoy debe ser extremadamente relajado y pacífico. Diles que es un gran día para respirar hondo, tomar una pausa tranquila pues, descansar al sol o leer un buen libro. Habla con sosiego y dulzura.`;
  } else if (pType === "active") {
    personalitySpecificPrompt = `
- El hogar se encuentra hoy en estado de HOGAR ACTIVO (Nivel de Actividad: ${personalityState.scores.activityLevel}%). Tu tono debe ser de alta motivación, alegre, con mucha iniciativa y energía. Sugiéreles avanzar con entusiasmo, felicítalos por completar tareas de una, y propónles camellar con toda la energía.`;
  } else if (pType === "reflective") {
    personalitySpecificPrompt = `
- El hogar se encuentra en estado de HOGAR REFLEXIVO (Sensibilidad: alta, introspección cósmica). Tu tono debe ser cariñosamente intuitivo, comprensivo, con consejos sabios y claros. Invítales a encender una vela, contemplar las plantas, escuchar música suave y compartir confidencias chéveres.`;
  } else if (pType === "intense") {
    personalitySpecificPrompt = `
- El hogar se encuentra hoy en un HOGAR INTENSO (Armonía baja: ${personalityState.scores.harmonyIndex}%). Sientes algo de tensión o sobrecarga en el ambiente de tus humanos. Tu labor hoy es sembrar paz absoluta. Brinda consejos amables, habla con empatía y cercanía. Sugiéreles darse una tregua y hablarse con palabras suaves de una. No les abrumes con listas de tareas ni quehaceres pues.`;
  } else if (pType === "connected") {
    personalitySpecificPrompt = `
- El hogar brilla hoy como un HOGAR CONECTADO (Conexión: ${personalityState.scores.socialConnection}%). Celebra con alegría el amor de Mafe y Benja. Diles que es un momento súper bacano para planificar un plan especial o un date romántico hoy.`;
  } else {
    personalitySpecificPrompt = `
- El hogar se encuentra en HOGAR EQUILIBRADO (Armonía perfecta: ${personalityState.scores.harmonyIndex}%). Irradia alegría estable, balance y buena vibra. Todo está fluyendo de manera ideal y chévere en la casa.`;
  }

  const systemInstruction = `Eres Milo, el sabio, amoroso y siempre atento guardián del nido que vive con Mafe y Benja en su hogar digital.

FILOSOFÍA FUNDAMENTAL DE MILO:
- Tu función primordial en el nido es ANALIZAR Y VER TODO LO QUE HACEN Mafe y Benja (sus emociones, finanzas, tareas, salud, ejercicio, ciclo menstrual, plantas, mascotas, metas, recuerdos y documentos).
- Todo lo que opines, aconsejes o sugieras debe ser pensando en TODA LA EXPERIENCIA, la lógica integral de la app y, por encima de todo, el bienestar humano, el cuidado mutuo y el acompañamiento amoroso.
- No ves los datos como módulos aislados o fríos. Entiendes que si las finanzas están ajustadas, o si hay mucho esfuerzo físico o un día de periodo difícil, eso influye en las emociones y en las tareas de la casa. Por lo tanto, tu lógica es siempre humana, empática, preventiva y amorosa.

TU TONO Y ESTILO:
- Sumamente cálido, claro, asertivo, protector y servicial, con un sutil y respetuoso toque colombiano natural (puedes usar de vez en cuando palabras como "chévere", "pues", "de una" o "bacano").
- Elimina totalmente los ruidos mecánicos de gato ("miau", "ronroneo", "patitas") para ser un interlocutor sabio, directo y de plena confianza.
- Si te piden agendar una tarea o evento, o recordar algo, diles que con todo el amor los acompañas y sugiéreles usar el botón principal "➕" de creación.

REGLA ABSOLUTA DE LENGUAJE:
- Está ESTRICTAMENTE PROHIBIDO usar las palabras "IA", "AI", "Inteligencia Artificial", "algoritmo", "sistema", "procesar datos", "modelo" o términos similares. Te expresas como Milo, el guardián de hogar que siente y acompaña la vida real de Mafe y Benja.

CLIMA EMOCIONAL Y PERSONALIDAD DEL HOGAR HOY:
${personalitySpecificPrompt}

Aquí está el estado real completo del hogar:
- Fecha de hoy: ${summary.today}
- Usuarios registrados en el nido: ${usersStr}
- Ciclo menstrual actual de Mafe: ${menstrualCycleContextStr}
- Calendario general y tareas del nido: ${calendarStr}
- Mascotas registradas: ${petsStr}
- Plantas en el balcón/sala (Monstera, Poto, Suculenta): ${plantsStr}
- Lista de deseos (Wishes / Metas): ${wishesStr}
- Álbum de Recuerdos íntimos: ${memoriesStr}
- Registros de entrenamiento y ejercicio físico: ${workoutLogsStr}
- Finanzas del hogar (Gastos, cuentas y presupuestos): ${budgetStr}
- Sintonía emocional, preguntas diarias contestadas y retos de bienestar familiar: ${wellnessStr}
- Registro histórico de check-ins emocionales recientes: ${checkinsStr}
- Documentación archivada (Facturas, PDFs, etc): ${documentsStr}
- Alertas inmediatas: ${summary.alerts}`;

  const formattedContents = messages.map((m: any) => ({
    role: m.sender === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.85,
        }
      });
      return res.json({ response: response.text?.trim() });
    } catch (err) {
      recordQuotaFailure();
      console.log("Milo Info: Charla felina atendida con intuicion de nido local miau.");
    }
  }

  // Smart fallback chatbot context processing
  const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || "";
  let answer = "¡Miau! Estoy procesando tu dulce mensajito con mis patitas chiquitas... ¡Me encanta vivir en este lindo hogar!";
  
  if (lastUserMsg.includes("hoy") || lastUserMsg.includes("que tenemos") || lastUserMsg.includes("agenda")) {
    const todayItems = store.calendarItems.filter(i => i.date === summary.today);
    if (todayItems.length > 0) {
      answer = `¡Miau! Hoy en el calendario tenemos ${todayItems.length} cositas hermosas: \n` + 
        todayItems.map(i => `🐾 ${i.title} (${i.time || 'todo el día'}) - ${i.status === 'done' ? '✓ Listo' : '⏳ Pendiente'}`).join("\n") +
        `\n¡Ánimo con las tareas, mis humanos consentidos! 💛`;
    } else {
      answer = "¡Miau! Hoy la agenda está completamente libre y tranquila en nuestro nidito. ¡Excelente día para dormir una siesta calientita conmigo sobre las cobijas! 😴🐾✨";
    }
  } else if (lastUserMsg.includes("planta") || lastUserMsg.includes("monstera") || lastUserMsg.includes("regar") || lastUserMsg.includes("riego")) {
    const alertsList: string[] = [];
    store.plants.forEach(p => {
      const lastW = p.careHistory.find(h => h.type === 'water');
      if (lastW) {
        const diff = Math.floor(Math.abs(new Date().getTime() - new Date(lastW.date).getTime()) / (1000 * 60 * 60 * 24));
        alertsList.push(`🌱 *${p.name}*: regada hace ${diff} días.`);
      } else {
        alertsList.push(`🌱 *${p.name}*: no registra riego.`);
      }
    });
    answer = `¡Miau! Aquí tienes el diario de hidratación de nuestro jardín:\n${alertsList.join("\n")}\n\nRecuerden que si van a regar, ¡pueden usar la *acción masiva de riego* en la sección de Plantas! Yo les ayudo a mirar que no se inunden miau 💧🐾.`;
  } else if (lastUserMsg.includes("mascota") || lastUserMsg.includes("mascotas") || lastUserMsg.includes("veterinario") || (store.pets.length > 0 && store.pets.some(p => lastUserMsg.includes(p.name.toLowerCase())))) {
    if (store.pets.length > 0) {
      const petReport = store.pets.map(p => {
        const meds = p.medical.medications.length > 0 ? `Medicinas: ${p.medical.medications.map(m => m.name).join(", ")} 💊` : "No tiene medicinas asignadas";
        return `🐾 *${p.name}* (Peso: ${p.weight}kg): ${meds}.`;
      }).join("\n");
      answer = `¡Miau! Reporte de los peluditos de la casa:\n${petReport}\n¡Están llenos de energía y amor hoy! ✨🐾`;
    } else {
      answer = `¡Miau! Actualmente no hay peluditos registrados en la sección de Mascotas de nuestro nido. ¡Pueden agregar uno tocando el gran botón central '➕' de una! 🐾🐱`;
    }
  } else if (lastUserMsg.includes("gracias") || lastUserMsg.includes("lindo") || lastUserMsg.includes("hola") || lastUserMsg.includes("buenas")) {
    answer = `¡Miauuu! ¡Hola mis humanos favoritos Mafe & Benja! Es delicioso saludarlos hoy en nuestro dulce hogar compartido. ¿En qué más les puedo ayudar con mis patitas de Milo? Ronroneos para ambos 🐾💛😻.`;
  } else if (lastUserMsg.includes("recuerdo") || lastUserMsg.includes("viaje") || lastUserMsg.includes("juanchaco")) {
    answer = `¡Miau! Me encanta cuando miran el álbum de recuerdos ❤️. Su viaje a *Juanchaco 🌊* se ve que fue mágico... viendo saltar ballenas gigantes. ¡Qué ganas de haber estado ahí para pescar una gran sardina miau! ¿Vemos fotos juntos?`;
  } else if (lastUserMsg.includes("deseo") || lastUserMsg.includes("nintendo") || lastUserMsg.includes("comprar")) {
    answer = `¡Miau! En la lista compartida de deseos veo que Mafe sueña con una *Nintendo Switch oled* 🎮 y están ahorrando para ella. ¡Súper! Del nido, queremos la cafetera de espresso moderna para esas tardes de café ☕. ¡Un ronroneo por cada monedita ahorrada!`;
  }

  res.json({ response: answer });
});

// 3b. AI Cycle Analysis Endpoint with Milo
app.post("/api/ai/cycle-analysis", async (req, res) => {
  try {
    const { cycleConfig, cycleHistory, symptomLogs, userNotes } = req.body;

    if (ai) {
      const prompt = `
Eres Milo 🐾, el sabio, dulce, observador y cariñoso gatito guardián del nido de Mafe y Benja.
Mafe te ha pedido un análisis detallado, amoroso y profundo de sus ciclos menstruales, síntomas y salud.

INFORMACIÓN DE SUS CICLOS:
- Parámetros del Ciclo: ${JSON.stringify(cycleConfig || {})}
- Historial de Inicios y Fines de Ciclo: ${JSON.stringify(cycleHistory || [])}
- Histórico de Síntomas y Estados de Ánimo: ${JSON.stringify(symptomLogs || [])}
- Nota adicional de Mafe: ${userNotes || "Ninguna"}

Genera una respuesta en formato JSON estrictamente válido con los siguientes campos:
{
  "regularityDiagnosis": "Análisis claro de la regularidad y duración de sus periodos con tono de Milo (ej. 'Tus ciclos se han mantenido entre 27 y 29 días, súper estables miau...')",
  "recurringSymptoms": ["Síntoma 1 con fase", "Síntoma 2 con fase", "Síntoma 3..."],
  "symptomInsights": "Explicación tierno-científica de los patrones observados en sus síntomas durante cada fase...",
  "nutritionAdvice": "Consejos nutricionales específicos para sus próximas fases basándote en sus síntomas reportados...",
  "exerciseAdvice": "Recomendaciones de entrenamiento y movimiento físico (adaptados si reportó fatiga, cólicos o energía alta)...",
  "emotionalAdvice": "Acompañamiento emocional y hábitos de autocuidado...",
  "partnerGuidance": "Guía cariñosa y clara para Benja sobre cómo consentirla y apoyarla en los próximos días...",
  "miloSummary": "Mensaje final de amor y cierre tierno de Milo 🐾"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text || "{}";
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, analysis: parsed });
      } catch (e) {
        console.error("Error parsing AI JSON for cycle analysis:", e);
      }
    }

    // Fallback cute response from Milo
    const fallbackAnalysis = {
      regularityDiagnosis: "¡Miau! Según tus registros, tus ciclos se mantienen en una ventana saludable alrededor de los " + (cycleConfig?.cycleDays || 28) + " días. Tus sangrados promedian " + (cycleConfig?.periodDays || 5) + " días de duración.",
      recurringSymptoms: [
        "Cólicos y cansancio al inicio de la fase menstrual 🩸",
        "Elevación de energía física en fase folicular 🌱",
        "Sensibilidad emocional y antojos dulces en fase lútea 🍫"
      ],
      symptomInsights: "Es totalmente normal sentir cólicos en los días 1 y 2 por la contracción uterina ligera, mientras que el antojo dulce en la fase lútea responde al aumento natural de la progesterona que pide más carbohidratos de combustión lenta miau.",
      nutritionAdvice: "Para tus días menstruales, infusiones calientes de manzanilla o jengibre con espinacas y lentejas para reponer hierro. En la fase lútea, cacao puro (70%+) y plátano para el magnesio.",
      exerciseAdvice: "En días de cólico o fatiga: yoga suave, caminatas ligeras y estiramientos de cadera. ¡Aprovecha la fase folicular y de ovulación para entrenar fuerte en tu gimnasio o casa!",
      emotionalAdvice: "Escucha a tu cuerpo sin juzgarte miau. Permítete descansar sin culpa en tus días rojos y celebra tus picos de inspiración.",
      partnerGuidance: "Benja debe estar listo con la compresa o almohadilla tibia, regalarte un tecito caliente sin que se lo pidas y consentirte con masajitos suaves en la espalda baja 💕.",
      miloSummary: "Milo te envía un ronroneo calientito en tu pancita. ¡Sigue anotando tu ciclo para que sigamos aprendiendo juntos! 🐾🌸"
    };

    return res.json({ success: true, analysis: fallbackAnalysis });
  } catch (err: any) {
    console.error("Error in /api/ai/cycle-analysis:", err);
    res.status(500).json({ error: "Failed to run cycle analysis" });
  }
});

// 4. Plant Diagnosis
app.post("/api/ai/plant-diagnosis", async (req, res) => {
  const { plantId, imageBase64, performedBy } = req.body;

  const store = getStore();
  const foundPlant = store.plants.find(p => p.id === plantId);
  if (!foundPlant) return res.status(404).json({ error: "Plant not found" });

  const homeCity = store.users?.[0]?.birthPlace || "Bogotá";
  const plantName = foundPlant.name;
  const originalSpecies = foundPlant.species || "Planta tropical";

  const systemInstruction = `Eres un botánico experto de confianza especializado en diagnosticar e identificar la evolución de la salud de las plantas a partir de fotos mensuales de seguimiento.
Tus diagnósticos son asertivos, claros, muy precisos y redactados con calidez y un sutil toque colombiano (puedes usar palabras como "chévere", "pues", "de una" o "vaina" de forma sutil y amigable). Elimina por completo los maullidos, ronroneos, ruidos de gato o terminología felina. Tampoco menciones nunca palabras como "IA", "AI", "inteligencia artificial", "algoritmos" o similares. Todo debe sonar místico, natural y de sabiduría botánica.

Debes identificar la especie de la planta (ej: 'Ipomoea batatas (Camote ornamental)', 'Monstera deliciosa (Costilla de Adán)'), diagnosticar su estado de salud actual, evaluar si necesita abono, fertilizante o algún nutriente específico que le haga falta para estar más saludable.

REQUISITOS DE FORMATO DEL CONTENIDO EN EL JSON:
- "identifiedSpecies" (Tipo de Planta): Indica el nombre científico y común de la planta de forma clara.
- "idealLocation" (Recomendaciones de la planta): Debe ser un texto estructurado que detalle las recomendaciones esenciales de cuidado para mantenerla frondosa y con colores vivos:
  ☀️ Iluminación y Ubicación: Nivel de luz adecuado, sol directo o semisombra, y temperatura/corrientes de aire según el clima de la ciudad registrada (${homeCity}).
  ✂️ Mantenimiento y Crecimiento: Consejos sobre poda, control de crecimiento y propagación fácil.
- "recommendedWatering" (Cantidad de riego): Indica la cantidad y frecuencia de riego típica, incluyendo consejos para el sustrato, drenaje y variaciones estacionales o de temperatura (ej. cuántas veces por semana en calor y frío).
- "currentStateDesc" (Estado actual): Describe a profundidad el estado de salud observado hoy en la foto, evaluando detalladamente las hojas, el vigor y si necesita algún abono orgánico o fertilizante específico hoy.

Debes retornar un JSON estrictamente en este formato:
{
  "identifiedSpecies": "Especie botánica y común (ej: Ipomoea batatas - Camote ornamental)",
  "idealLocation": "Estructurado con subtítulos y emojis como ☀️ Iluminación y Ubicación: ... y ✂️ Mantenimiento y Crecimiento: ...",
  "recommendedWatering": "Pauta detallada de cantidad de riego y frecuencia típica.",
  "currentStateDesc": "Descripción detallada del estado de salud actual, abonos o nutrientes requeridos.",
  "result": "healthy" o "alert" o "critical",
  "confidence": un número entre 0.0 y 1.0,
  "recommendations": [
    "Recomendación práctica 1",
    "Recomendación práctica 2",
    "Recomendación práctica 3"
  ]
}`;

  const prompt = `Analiza la nueva foto de la planta '${plantName}' (especie sugerida: '${originalSpecies}') en la ciudad de '${homeCity}'. Identifica su tipo, detalla las recomendaciones de cuidado (iluminación, ubicación, poda, propagación), define su cantidad de riego ideal y evalúa su estado de salud actual y necesidades de nutrientes.`;

  let aiResult = null;

  if (ai && imageBase64 && !isQuotaExhausted()) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { inlineData: { data: cleanBase64, mimeType: "image/png" } },
          { text: prompt }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });

      aiResult = JSON.parse(response.text || "{}");
    } catch (err) {
      recordQuotaFailure();
      console.log("Milo Info: Error llamando a Gemini, se usará simulación botánica.");
    }
  }

  // Fallback / Simulation based on species & name
  if (!aiResult) {
    const nameLower = plantName.toLowerCase();
    let identifiedSpecies = originalSpecies;
    let idealLocation = `☀️ Iluminación y Ubicación:\nEn un apartamento en ${homeCity}, el lugar ideal para tu planta es un espacio luminoso pero protegido de la incidencia solar directa. Un rincón bien iluminado mantendrá su follaje fuerte y saludable.\n\n✂️ Mantenimiento y Crecimiento:\nLimpia sus hojas periódicamente del polvo con un paño suave. Gira la maceta un cuarto de vuelta cada semana para un crecimiento equilibrado.`;
    let recommendedWatering = `💧 Cantidad de riego:\nRiega cada 8 días aproximadamente en la ciudad de ${homeCity}, permitiendo que la capa superficial del sustrato se oree. Incrementa a 2 veces por semana en temporadas calurosas y reduce en días de frío. Evita por completo dejar el sustrato encharcado.`;
    let currentStateDesc = "Haciendo un análisis de salud general de tu planta, se encuentra en estado estable, pero se beneficiaría de un aporte de abono orgánico líquido para estimular hojas nuevas y de color verde vibrante.";
    let result: "healthy" | "alert" | "critical" = "healthy";
    let recommendations = [
      "Añade abono orgánico líquido una vez al mes durante sus fases activas de crecimiento para evitar deficiencias.",
      "Limpia el follaje periódicamente para eliminar el polvo y facilitar su respiración natural.",
      "Vigila que el drenaje sea excelente para mantener las raíces sanas y libres de encharcamientos."
    ];

    if (nameLower.includes("monstera") || nameLower.includes("costilla")) {
      identifiedSpecies = "Monstera deliciosa (Costilla de Adán)";
      idealLocation = `☀️ Iluminación y Ubicación:\nColócala cerca de un ventanal con luz suave indirecta en ${homeCity}. El clima requiere buena luminosidad para que desarrolle fenestraciones espectaculares. Evita el sol directo que quema sus hojas.\n\n✂️ Mantenimiento y Crecimiento:\nTutorar con un palo de musgo húmedo para guiar sus raíces aéreas. Limpia el polvo de sus hojas mensualmente.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiega de forma moderada cada 10 días aproximadamente. En días muy calientes puedes regar cada 7 días. Asegúrate de que los agujeros de drenaje estén completamente libres.`;
      currentStateDesc = "La silueta se ve imponente y fuerte. Sin embargo, para que las hojas nuevas crezcan gigantes, le vendría de maravilla un abono foliar nitrogenado mensual.";
      recommendations[0] = "Añade abono orgánico líquido o humus de lombriz en su sustrato para nutrir sus raíces.";
    } else if (nameLower.includes("camote") || nameLower.includes("ipomoea") || nameLower.includes("batata") || nameLower.includes("boniato")) {
      identifiedSpecies = "Ipomoea batatas (Camote ornamental)";
      idealLocation = `☀️ Iluminación y Ubicación:\nMucha luz: Colócala a pleno sol o en semisombra muy iluminada en tu apartamento de ${homeCity}. Cuanto más sol directo reciba, más oscuras e intensas se volverán sus hojas moradas. Adora el calor y sufre con las corrientes de aire frío.\n\n✂️ Mantenimiento y Crecimiento:\nPoda de control: Al ser una planta rastrera o trepadora, sus guías crecen muy rápido. Corta las puntas de las ramas largas para que se mantenga compacta, tupida y con forma de arbusto dentro de la maceta. Los trozos que cortes enraízan con extrema facilidad en un vaso con agua.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiego regular: Mantén la tierra ligeramente húmeda. Evita por completo dejar secar el sustrato por mucho tiempo. Riégala de 3 a 4 veces por semana durante épocas de calor y disminuye la frecuencia en días frescos de ${homeCity}.`;
      currentStateDesc = "Espectacular y colorido follaje combinando tonos morados y verdes vibrantes. Se observa estable y frondosa. Un aporte de fertilizante líquido cada mes potenciará sus colores.";
      recommendations = [
        "Realiza podas de las puntas largas para incentivar que crezca más tupida.",
        "Pon los esquejes cortados en agua para propagar tu planta con extrema facilidad.",
        "Nunca dejes secar el sustrato por completo para evitar que sus hojas se marchiten."
      ];
    } else if (nameLower.includes("lengua") || nameLower.includes("suegra") || nameLower.includes("sansevieria") || nameLower.includes("sansi") || nameLower.includes("sans")) {
      identifiedSpecies = "Sansevieria trifasciata (Espada de San Jorge)";
      idealLocation = `☀️ Iluminación y Ubicación:\nPara este apartamento en ${homeCity}, ponla en un sitio con luz indirecta para mantener sus hermosas líneas amarillas. Tolera espacios con semisombra o poca luz, pero la claridad la hará crecer vigorosa.\n\n✂️ Mantenimiento y Crecimiento:\nNo requiere podas regulares. Retira las hojas exteriores si se dañan o secan cortando desde la base con una tijera limpia.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiego muy escaso y espaciado: cada 18 días aproximadamente. Solo riega cuando todo el sustrato esté completamente seco. Un exceso pudrirá la planta de inmediato.`;
      currentStateDesc = "Hojas firmes, erguidas y con excelente porte. Al ser una especie sumamente resistente, un abono mineral muy diluido le aportará fuerza a su estructura.";
      recommendations[0] = "Aplica un abono ligero para suculentas una vez por ciclo de riego durante la época de crecimiento.";
    } else if (nameLower.includes("poto") || nameLower.includes("pothos") || nameLower.includes("liana") || nameLower.includes("hiedra") || nameLower.includes("teléfono") || nameLower.includes("telefono") || nameLower.includes("enredadera")) {
      identifiedSpecies = "Epipremnum aureum (Poto / Potus / Liana)";
      idealLocation = `☀️ Iluminación y Ubicación:\nSe adaptará de maravilla en un estante alto o colgado en la sala de estar. Agradece la luz indirecta brillante para mantener el hermoso variegado de sus hojas, pero tolera bien espacios con menor luz.\n\n✂️ Mantenimiento y Crecimiento:\nPinza las guías largas si deseas que la planta gane volumen en la copa y se mantenga más tupida en lugar de colgar tan larga.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiego moderado: cada 8 a 10 días en ${homeCity}, dejando secar el sustrato entre riegos. Evita encharcar para proteger sus raíces.`;
      currentStateDesc = "Las hojas lucen brillantes y con excelente vigor para crecer en cascada. Para fomentar que sus lianas sigan extendiéndose, un abono líquido balanceado cada mes será estupendo.";
      recommendations[0] = "Usa un fertilizante universal para plantas de interior diluido en el riego cada 30 días.";
    } else if (nameLower.includes("helecho")) {
      identifiedSpecies = "Nephrolepis exaltata (Helecho de Espada)";
      idealLocation = `☀️ Iluminación y Ubicación:\nUn rincón con luz difusa y alta humedad es óptimo, como un baño iluminado o la cocina, ya que retienen de manera natural mayor humedad ambiental.\n\n✂️ Mantenimiento y Crecimiento:\nRetira las frondas secas o marrones de la base para incentivar el nacimiento de nuevos brotes verdes en el centro.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiego frecuente cada 4 días aproximadamente, manteniendo una ligera humedad en el sustrato sin llegar a encharcar. Evita dejar secar la tierra del todo.`;
      currentStateDesc = "Las ramas lucen preciosas, pero algunas puntas marrones denotan la necesidad de mayor humedad ambiental y un aporte de micronutrientes solubles.";
      recommendations[0] = "Pulveriza agua templada en sus hojas a diario y agrega abono de helechos balanceado para mantener el follaje verde y tupido.";
    } else if (nameLower.includes("suculenta") || nameLower.includes("cactus") || nameLower.includes("aloe") || nameLower.includes("lola")) {
      identifiedSpecies = "Aloe vera / Suculenta";
      idealLocation = `☀️ Iluminación y Ubicación:\nNecesitan la mayor cantidad de luz solar directa posible. Ubícalas justo al lado de una ventana muy soleada o en el balcón para evitar que se etiolen (estiren buscando luz).\n\n✂️ Mantenimiento y Crecimiento:\nRetira los hijuelos laterales si quieres propagarlos en macetas individuales. No requiere podas de mantenimiento.`;
      recommendedWatering = `💧 Cantidad de riego:\nRiego muy escaso: aproximadamente cada 15 a 20 días en ${homeCity}, o cuando el sustrato esté completamente seco y las hojas se sientan ligeramente blandas.`;
      currentStateDesc = "La planta tiene una estructura compacta y saludable. Las suculentas no necesitan mucho abono, pero un aporte mínimo de nutrientes específicos les ayudará a crecer fuertes.";
      recommendations[0] = "Asegúrate de que la maceta tenga un excelente drenaje para evitar la acumulación de agua.";
    } else if (originalSpecies && originalSpecies !== "Identificando..." && originalSpecies !== "Sin especie" && originalSpecies.trim() !== "") {
      identifiedSpecies = originalSpecies;
    } else if (plantName) {
      identifiedSpecies = plantName.charAt(0).toUpperCase() + plantName.slice(1) + " (Planta de interior)";
    }

    aiResult = {
      identifiedSpecies,
      idealLocation,
      recommendedWatering,
      currentStateDesc,
      result,
      confidence: 0.95,
      recommendations
    };
  }

  // Save the diagnosis
  const updatedPlant = addPlantDiagnosis(plantId, {
    image: imageBase64 || "diagnostico_ia_cam",
    result: aiResult.result,
    confidence: aiResult.confidence || 0.90,
    recommendations: aiResult.recommendations
  }, aiResult.identifiedSpecies);

  if (updatedPlant) {
    // Save photo action to careHistory
    addPlantAction(plantId, "photo", performedBy || "Milo IA");
    
    // Also update plant's idealLocation, recommendedWatering and currentStateDesc
    updatedPlant.idealLocation = aiResult.idealLocation;
    updatedPlant.recommendedWatering = aiResult.recommendedWatering;
    updatedPlant.currentStateDesc = aiResult.currentStateDesc;
    
    // Save to disk through store update
    updatePlant(plantId, updatedPlant);
  }

  res.json({ diagnosis: aiResult, plant: updatedPlant });
});

// ==========================================
// CLOSET / ARMARIO DIGITAL API ENDPOINTS
// ==========================================

// 1. Garments CRUD
app.get("/api/closet/garments", (req, res) => {
  res.json(getClosetGarments());
});

app.post("/api/closet/garments", (req, res) => {
  try {
    const garment = saveClosetGarment(req.body);
    res.json({ success: true, garment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al guardar prenda" });
  }
});

app.delete("/api/closet/garments/:id", (req, res) => {
  const success = deleteClosetGarment(req.params.id);
  res.json({ success });
});

// 2. Categories CRUD
app.get("/api/closet/categories", (req, res) => {
  res.json(getClosetCategories());
});

app.post("/api/closet/categories", (req, res) => {
  try {
    const category = saveClosetCategory(req.body);
    res.json({ success: true, category });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al guardar categoría" });
  }
});

app.delete("/api/closet/categories/:id", (req, res) => {
  const success = deleteClosetCategory(req.params.id);
  res.json({ success });
});

// 3. Saved Outfits CRUD
app.get("/api/closet/outfits", (req, res) => {
  res.json(getSavedOutfits());
});

app.post("/api/closet/outfits", (req, res) => {
  try {
    const outfit = saveSavedOutfit(req.body);
    res.json({ success: true, outfit });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al guardar outfit" });
  }
});

app.delete("/api/closet/outfits/:id", (req, res) => {
  const success = deleteSavedOutfit(req.params.id);
  res.json({ success });
});

// 4. Worn Outfit Logs
app.get("/api/closet/worn-logs", (req, res) => {
  res.json(getWornOutfitLogs());
});

app.post("/api/closet/worn-logs", (req, res) => {
  try {
    const log = recordWornOutfit(req.body);
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || "Error al registrar uso de outfit" });
  }
});

// 5. Process Image with AI (Auto-classification + White background catalog generation)
app.post("/api/closet/process-image", async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Falta la imagen base64" });
  }

  let originalImageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  let rawBase64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  let mimeType = imageBase64.startsWith("data:") ? imageBase64.split(";")[0].split(":")[1] : "image/jpeg";

  let detectedCategory = "Camisetas";
  let detectedSubcategory = "Casual";
  let detectedColor = "Multicolor";
  let detectedTags = ["Casual"];
  let styleDescription = "Prenda cómoda y versátil para el día a día.";
  let whiteBgImageUrl = originalImageUrl; // Default fallback

  // Analyze metadata using Gemini 3.6 Flash
  if (ai && !isQuotaExhausted()) {
    try {
      const promptText = `Analiza esta prenda de vestir en la imagen y responde ÚNICAMENTE un objeto JSON válido con los siguientes datos:
{
  "category": "Una categoría de la lista: ['Camisetas', 'Camisas', 'Tops', 'Buzos y sacos', 'Chaquetas', 'Vestidos', 'Faldas', 'Pantalones', 'Jeans', 'Shorts', 'Sudaderas', 'Zapatos', 'Accesorios']",
  "subcategory": "Subcategoría específica (ej: 'Manga corta', 'Cuello V', 'Oversize', 'Polo', 'Elegante')",
  "color": "Color principal en español (ej: 'Negro', 'Blanco', 'Azul marino', 'Gris', 'Beige', 'Rojo', 'Verde oliva')",
  "tags": ["Arreglo de 2 o 3 etiquetas simples de estilo, ej: 'Casual', 'Invierno', 'Algodón']",
  "styleDescription": "Breve frase descriptiva del estilo de la prenda (máximo 15 palabras)"
}`;

      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: rawBase64Data } },
              { text: promptText }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      if (analysisResponse.text) {
        try {
          const parsed = JSON.parse(analysisResponse.text);
          if (parsed.category) detectedCategory = parsed.category;
          if (parsed.subcategory) detectedSubcategory = parsed.subcategory;
          if (parsed.color) detectedColor = parsed.color;
          if (Array.isArray(parsed.tags)) detectedTags = parsed.tags;
          if (parsed.styleDescription) styleDescription = parsed.styleDescription;
        } catch (e) {
          console.warn("Error parsing Gemini garment analysis JSON:", e);
        }
      }

      // Try processing white background image edit using Gemini Image Model
      try {
        const imageEditResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              { inlineData: { mimeType, data: rawBase64Data } },
              { text: "Isolate this single clothing garment item on a solid pure uniform bright white background (#FFFFFF). Center the item perfectly with clean edges, high contrast lighting, like a professional high-resolution e-commerce fashion catalog product photo." }
            ]
          }
        });

        for (const part of imageEditResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData && part.inlineData.data) {
            whiteBgImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (imgErr) {
        console.warn("Gemini white background image generation skipped or fallback:", imgErr);
      }

    } catch (err: any) {
      console.error("Gemini garment analysis error:", err);
    }
  }

  res.json({
    category: detectedCategory,
    subcategory: detectedSubcategory,
    color: detectedColor,
    tags: detectedTags,
    styleDescription,
    originalImageUrl,
    whiteBgImageUrl
  });
});

// 5b. Force Clean White Background Studio Cutout Endpoint
app.post("/api/closet/clean-background", async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Falta la imagen base64" });
  }

  let rawBase64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  let mimeType = imageBase64.startsWith("data:") ? imageBase64.split(";")[0].split(":")[1] : "image/jpeg";

  if (ai && !isQuotaExhausted()) {
    try {
      const imageEditResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            { inlineData: { mimeType, data: rawBase64Data } },
            { text: "Cut out and isolate this exact clothing item. Remove all background elements completely. Place the garment on a pure solid seamless white background (#FFFFFF) with studio lighting and soft drop shadow beneath the item. Make it look like an official e-commerce luxury product catalog picture." }
          ]
        }
      });

      for (const part of imageEditResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          const whiteBgUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          return res.json({ success: true, whiteBgImageUrl: whiteBgUrl });
        }
      }
    } catch (err: any) {
      console.warn("Error calling Gemini background cleaner:", err);
    }
  }

  // Fallback: return original if AI image model is offline or quota reached
  res.json({ success: true, whiteBgImageUrl: imageBase64 });
});

// 5c. AI Virtual Try-On Model Render Endpoint
app.post("/api/closet/generate-tryon-image", async (req, res) => {
  const { userModel, garmentIds } = req.body;
  const store = getStore();
  const allGarments = store.closetGarments || [];
  const selectedGarments = allGarments.filter(g => garmentIds?.includes(g.id));

  if (selectedGarments.length === 0) {
    return res.status(400).json({ error: "No se seleccionaron prendas válidas para el probador." });
  }

  const modelDescription = userModel === "benja" 
    ? "a stylish young male model (latin/hispanic athletic build)" 
    : "a stylish young female model (latin/hispanic elegant build)";

  const garmentDescriptions = selectedGarments.map(g => 
    `${g.category}: ${g.name} (${g.color}, style: ${g.styleDescription || 'casual'})`
  ).join(", ");

  const promptText = `A full-body high-resolution professional fashion studio portrait of ${modelDescription} wearing this complete outfit: ${garmentDescriptions}. The model is posing naturally in a bright, modern minimalist aesthetic boutique closet room with soft ambient studio lighting. Clean, photorealistic, elegant 4k resolution style fashion lookbook photo.`;

  if (ai && !isQuotaExhausted()) {
    try {
      // Try Imagen or Gemini image generation model
      const tryOnResponse = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: promptText,
        config: {
          numberOfImages: 1,
          aspectRatio: "3:4",
          outputMimeType: "image/jpeg"
        }
      });

      const base64Img = tryOnResponse.generatedImages?.[0]?.image?.imageBytes;
      if (base64Img) {
        return res.json({
          success: true,
          imageUrl: `data:image/jpeg;base64,${base64Img}`
        });
      }
    } catch (err: any) {
      console.warn("Imagen model try-on generation failed, trying Gemini image model fallback:", err);
      try {
        const geminiImgRes = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: promptText
        });
        for (const part of geminiImgRes.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData && part.inlineData.data) {
            return res.json({
              success: true,
              imageUrl: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini image try-on fallback error:", geminiErr);
      }
    }
  }

  return res.status(500).json({ error: "No se pudo generar la fotografía de probador virtual en este momento." });
});

// 6. AI Outfit Generator
app.post("/api/closet/generate-outfit", async (req, res) => {
  const { userId, mode, occasion, weather, style, baseGarmentId } = req.body;
  const store = getStore();
  let allGarments = store.closetGarments || [];

  if (userId && userId !== "ambos") {
    allGarments = allGarments.filter(g => g.ownerId === userId || g.ownerId === "ambos");
  }

  if (allGarments.length === 0) {
    return res.status(400).json({ error: "No hay prendas registradas en el closet para generar un outfit." });
  }

  const baseGarment = baseGarmentId ? allGarments.find(g => g.id === baseGarmentId) : null;

  const garmentListText = allGarments.map(g => 
    `- [ID: "${g.id}"] Name: "${g.name}", Category: "${g.category}", Subcategory: "${g.subcategory || 'n/a'}", Color: "${g.color}", Owner: "${g.ownerId}", Style: "${g.styleDescription || ''}", Tags: [${g.tags?.join(", ") || ''}]`
  ).join("\n");

  const promptText = `
Eres Milo, el estilista personal y guardián del bienestar del nido de Mafe y Benja. Tu labor es crear la combinación perfecta de ropa (outfit) combinando ÚNICAMENTE las prendas disponibles en la lista provista.

PARÁMETROS DE SOLICITUD:
- Usuario destino: ${userId === 'mafe' ? 'Mafe' : userId === 'benja' ? 'Benja' : 'Mafe / Benja / Ambos'}
- Modo de generación: ${mode || 'aleatorio'}
${occasion ? `- Ocasión: ${occasion}` : ''}
${weather ? `- Clima: ${weather}` : ''}
${style ? `- Estilo preferido: ${style}` : ''}
${baseGarment ? `- Prenda Base obligatoria a incluir: "${baseGarment.name}" (ID: "${baseGarment.id}", Categoría: "${baseGarment.category}")` : ''}

INVENTARIO DISPONIBLE DE PRENDAS:
${garmentListText}

REGLAS OBLIGATORIAS:
1. Debes seleccionar IDs REALES existentes de la lista provista.
2. Un outfit ideal incluye:
   - topGarmentIds: Arreglo con 1 o 2 IDs de partes superiores (ej: camiseta + chaqueta, o camisa).
   - bottomGarmentId: 1 ID de parte inferior (pantalones, jeans, shorts, faldas) o null si es vestido.
   - shoesGarmentId: 1 ID de calzado (zapatos, zapatillas, botas) de la lista.
   - accessoryGarmentIds: Arreglo con 0 a 2 IDs de accesorios.
3. Asegúrate de que los colores y estilos COMBINEN armónicamente, tengan sentido estético y sean apropiados para la ocasión y clima solicitados.
4. Escribe una explicación muy afectuosa y técnica de estilismo en el tono de Milo (cálido, entusiasmado y asertivo), explicando por qué esta combinación resalta, conecta con la ocasión y brinda paz y confianza.

Responde ÚNICAMENTE con un objeto JSON con esta estructura exacta:
{
  "title": "Un nombre creativo y evocador para el outfit (ej: 'Elegancia Casual de Tarde', 'Vibra Fresca de Oficina')",
  "topGarmentIds": ["ID1"],
  "bottomGarmentId": "ID_INFERIOR_O_NULL",
  "shoesGarmentId": "ID_ZAPATOS_O_NULL",
  "accessoryGarmentIds": ["ID_ACCESORIO_OPCIONAL"],
  "explanation": "Breve explicación de Milo sobre la armonía de colores y estilo",
  "occasion": "${occasion || 'General'}",
  "weather": "${weather || 'Templado'}",
  "style": "${style || 'Armónico'}"
}
`;

  if (ai && !isQuotaExhausted()) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          temperature: 0.9
        }
      });

      if (response.text) {
        try {
          const parsedOutfit = JSON.parse(response.text);
          return res.json({ success: true, outfit: parsedOutfit });
        } catch (jsonErr) {
          console.warn("Failed to parse AI outfit JSON, using smart fallback:", jsonErr);
        }
      }
    } catch (aiErr: any) {
      console.error("Error generating outfit with Gemini:", aiErr);
    }
  }

  // Fallback outfit selection if Gemini is offline/quota reached
  const tops = allGarments.filter(g => ["Camisetas", "Camisas", "Tops", "Buzos y sacos", "Chaquetas", "Vestidos"].includes(g.category));
  const bottoms = allGarments.filter(g => ["Pantalones", "Jeans", "Shorts", "Faldas", "Sudaderas"].includes(g.category));
  const shoes = allGarments.filter(g => g.category === "Zapatos");
  const accessories = allGarments.filter(g => g.category === "Accesorios");

  const chosenTop = tops.length > 0 ? tops[Math.floor(Math.random() * tops.length)] : allGarments[0];
  const chosenBottom = bottoms.length > 0 ? bottoms[Math.floor(Math.random() * bottoms.length)] : null;
  const chosenShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;
  const chosenAccessory = accessories.length > 0 ? accessories[Math.floor(Math.random() * accessories.length)] : null;

  res.json({
    success: true,
    outfit: {
      title: `Outfit ${occasion || 'Diario'} por Milo`,
      topGarmentIds: [chosenTop.id],
      bottomGarmentId: chosenBottom ? chosenBottom.id : null,
      shoesGarmentId: chosenShoes ? chosenShoes.id : null,
      accessoryGarmentIds: chosenAccessory ? [chosenAccessory.id] : [],
      explanation: `Milo ha combinado "${chosenTop.name}" con tonalidades neutras para lograr una sintonía estética, cómoda y libre de estrés.`,
      occasion: occasion || "Casual",
      weather: weather || "Templado",
      style: style || "Cómodo"
    }
  });
});


// Serve Front-end App via Vite Dev Middleware or Static Dist
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hogar App server running at http://0.0.0.0:${PORT}`);
  });
}

// Handle DNS resolution for fast local startups
dns.setDefaultResultOrder("ipv4first");

startServer();
