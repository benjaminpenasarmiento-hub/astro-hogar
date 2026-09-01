import fs from "node:fs";

const path = "src/components/SaludHogarWidget.tsx";
const source = fs.readFileSync(path, "utf8");

const oldBlock = `  // Submit message to frasco
  const handleFrascoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFrascoText.trim()) return;
    setSubmittingFrasco(true);
    try {
      await submitFrascoMessage(currentUser, newFrascoText.trim(), selectedEmoji);
      setNewFrascoText("");
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFrasco(false);
    }
  };`;

const newBlock = `  // Submit message to frasco with optimistic UI + persistence verification.
  const handleFrascoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newFrascoText.trim();
    if (!text) return;
    setSubmittingFrasco(true);
    setErrorText("");
    try {
      const result = await submitFrascoMessage(currentUser, text, selectedEmoji);
      setNewFrascoText("");

      // Keep the message visible immediately while the server finishes Firestore persistence.
      if (result?.message) {
        setSaludData(prev => prev ? {
          ...prev,
          frascoMessages: [
            ...(prev.frascoMessages || []).filter(m => m.id !== result.message.id),
            result.message
          ]
        } : prev);
      }

      // Give the serverless persistence queue time to commit before replacing local state.
      await new Promise(resolve => setTimeout(resolve, 1500));
      const updated = await fetchSaludHogarData(selectedDate, customReflexionToggle);
      const persisted = !!result?.message?.id && (updated?.frascoMessages || []).some(m => m.id === result.message.id);

      if (!persisted) {
        throw new Error("El mensaje fue recibido, pero todavía no aparece en Firestore. No se ocultará del formulario hasta confirmar la sincronización.");
      }

      setSaludData(updated);
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      console.error("Error guardando mensaje en el frasco:", err);
      setErrorText(err?.message || "No se pudo guardar el mensaje en el frasco. Inténtalo nuevamente.");
    } finally {
      setSubmittingFrasco(false);
    }
  };`;

if (!source.includes(oldBlock)) {
  throw new Error("No se encontró el bloque actual de handleFrascoSubmit; se evita modificar el archivo a ciegas.");
}

fs.writeFileSync(path, source.replace(oldBlock, newBlock), "utf8");
console.log("Frasco persistence patch applied.");
