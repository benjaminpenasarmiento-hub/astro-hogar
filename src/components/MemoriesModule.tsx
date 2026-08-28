import React, { useState } from "react";
import { Heart, FileImage, MapPin, Calendar, Trash2, Plus, Sparkles, AlertCircle, Quote, Edit3, Image as ImageIcon, X } from "lucide-react";
import { Memory, UserId } from "../types";
import { createMemory, updateMemory, deleteMemory } from "../api";

interface MemoriesModuleProps {
  memories: Memory[];
  onRefreshData: () => void;
  users?: any[];
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 700;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height >= width && height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function MemoriesModule({ memories, onRefreshData, users = [] }: MemoriesModuleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("trip");
  const [customCategory, setCustomCategory] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [people, setPeople] = useState<UserId[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [mediaList, setMediaList] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState("");
  const [highlightsList, setHighlightsList] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // State to track which photo index is active in cards with multiple photos
  const [activePhotoIdx, setActivePhotoIdx] = useState<{ [key: string]: number }>({});

  React.useEffect(() => {
    if (users.length > 0 && people.length === 0) {
      setPeople(users.map(u => u.id));
    }
  }, [users]);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle("");
    setType("trip");
    setCustomCategory("");
    setDate("");
    setLocation("");
    setDescription("");
    setPhotoUrl("");
    setMediaList([]);
    setHighlightsList([]);
    setIsModalOpen(true);
  };

  const openEditModal = (memory: Memory) => {
    setEditingId(memory.id);
    setTitle(memory.title);
    setType(memory.type || "trip");
    setCustomCategory(memory.customCategory || "");
    setDate(memory.date || "");
    setLocation(memory.location || "");
    setDescription(memory.description || "");
    setMediaList(memory.media && memory.media.length > 0 ? [...memory.media] : []);
    setHighlightsList(memory.highlights ? [...memory.highlights] : []);
    setPeople(memory.people || (users.map(u => u.id)));
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newImages.push(compressed);
      }
      setMediaList(prev => [...prev, ...newImages]);
    } catch (err) {
      console.error("Error comprimiendo imágenes del celular:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddUrlPhoto = () => {
    if (!photoUrl.trim()) return;
    setMediaList([...mediaList, photoUrl.trim()]);
    setPhotoUrl("");
  };

  const handleRemovePhoto = (idx: number) => {
    setMediaList(mediaList.filter((_, i) => i !== idx));
  };

  const handleAddHighlight = () => {
    if (!newHighlight.trim()) return;
    setHighlightsList([...highlightsList, newHighlight.trim()]);
    setNewHighlight("");
  };

  const handleRemoveHighlight = (idx: number) => {
    setHighlightsList(highlightsList.filter((_, i) => i !== idx));
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const finalMedia = mediaList.length > 0 
      ? mediaList 
      : ["https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"];

    if (editingId) {
      await updateMemory(editingId, {
        title,
        type,
        customCategory: type === "custom" ? customCategory : undefined,
        date,
        location: location || undefined,
        description: description || undefined,
        people,
        media: finalMedia,
        highlights: highlightsList
      });
    } else {
      await createMemory({
        title,
        type,
        customCategory: type === "custom" ? customCategory : undefined,
        date,
        location: location || undefined,
        description: description || undefined,
        people,
        media: finalMedia,
        highlights: highlightsList
      });
    }

    setIsModalOpen(false);
    onRefreshData();
  };

  const handleDelete = (id: string, title?: string) => {
    if (typeof window !== "undefined" && (window as any).requestDeleteWithConfirm) {
      (window as any).requestDeleteWithConfirm(
        "Eliminar Recuerdo 📸",
        "¿Estás seguro de que deseas eliminar este recuerdo de la galería del hogar?",
        async () => {
          await deleteMemory(id);
          onRefreshData();
        },
        title
      );
    } else {
      deleteMemory(id).then(() => onRefreshData());
    }
  };

  const getCategoryLabel = (memory: Memory) => {
    if (memory.type === "custom" && memory.customCategory) return memory.customCategory;
    switch (memory.type) {
      case "trip": return "Viaje ✈️";
      case "date": return "Cita romántica 🕯️";
      case "birthday": return "Cumpleaños / Fiesta 🎂";
      case "adventure": return "Aventura 🏔️";
      case "pet": return "Mascota 🐾";
      case "home": return "Hogar 🏡";
      case "milestone": return "Logro 🏆";
      case "custom": return "Especial 🌻";
      default: return "Recuerdo ✨";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      
      {/* Title Header bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border-4 border-[#F3EFE6] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 leading-none text-rose-600">
            ❤️
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-cute text-[#2C2723]">Álbum de Recuerdos Compartidos</h2>
            <p className="text-xs text-[#8A817C]">Sube todas las fotos de tu cel, crea categorías y edita cualquier recuerdo miau ✨</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> Registrar Recuerdo
        </button>
      </div>

      {/* Grid memories elements */}
      {memories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-4 border-[#F3EFE6] space-y-2">
          <span className="text-5xl inline-block animate-bounce">❤️</span>
          <p className="text-sm font-semibold text-[#8A817C]">El álbum de recuerdos está durmiendo.</p>
          <p className="text-xs text-gray-400">¡Registra un viaje, aniversario o caminata especial miau! ✨</p>
        </div>
      ) : (
        <div className="space-y-8">
          {memories.map((memory) => {
            const dateObj = new Date(memory.date + "T00:00:00");
            const formattedDate = dateObj.toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' });
            const currentIdx = activePhotoIdx[memory.id] || 0;
            const photos = memory.media && memory.media.length > 0 ? memory.media : ["https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&q=80&w=400"];
            const currentPhoto = photos[currentIdx] || photos[0];
            
            return (
              <div 
                key={memory.id}
                className="bg-white rounded-3xl border-4 border-[#F3EFE6] shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 hover:shadow-md transition-shadow group relative"
              >
                
                {/* Image panel left side with gallery thumbnails */}
                <div className="md:col-span-5 relative flex flex-col justify-between bg-stone-900/5 min-h-[260px]">
                  <div className="relative h-64 md:h-full w-full overflow-hidden">
                    <img 
                      src={currentPhoto} 
                      alt={memory.title} 
                      className="w-full h-full object-cover transition-all duration-300"
                    />
                    
                    {/* Category label overlay */}
                    <span className="absolute top-4 left-4 text-xs font-black px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl leading-none shadow-sm text-[#2C2723] flex items-center gap-1">
                      {getCategoryLabel(memory)}
                    </span>

                    {/* Photo count indicator */}
                    {photos.length > 1 && (
                      <span className="absolute top-4 right-4 text-[11px] font-black px-2.5 py-1 bg-black/65 text-white backdrop-blur-sm rounded-xl">
                        📸 {currentIdx + 1}/{photos.length}
                      </span>
                    )}
                  </div>

                  {/* Multiple photos thumbnail carousel bar */}
                  {photos.length > 1 && (
                    <div className="flex items-center gap-1.5 p-2 bg-black/80 backdrop-blur-md overflow-x-auto custom-scrollbar">
                      {photos.map((pUrl, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setActivePhotoIdx(prev => ({ ...prev, [memory.id]: pIdx }))}
                          className={`w-12 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            currentIdx === pIdx ? "border-rose-400 scale-105 opacity-100" : "border-transparent opacity-60 hover:opacity-90"
                          }`}
                        >
                          <img src={pUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info panel right side */}
                <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4 text-[#2C2723]">
                  <div className="space-y-3">
                    
                    {/* Header meta */}
                    <div className="flex flex-wrap items-center gap-y-2 justify-between">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#8A817C]">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} /> {formattedDate}
                        </span>
                        {memory.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={13} /> {memory.location}
                          </span>
                        )}
                      </div>

                      <div className="flex -space-x-1.5 items-center">
                        {memory.people?.map(pId => {
                          const u = users.find(usr => usr.id === pId);
                          if (!u) return null;
                          return (
                            <img 
                              key={pId}
                              src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(u.name)}`} 
                              className="w-6 h-6 rounded-full border border-white bg-white shadow-xs" 
                              alt={u.name} 
                              title={u.name} 
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-extrabold text-cute tracking-tight leading-snug">
                      {memory.title}
                    </h3>

                    {/* Paragraph */}
                    {memory.description && (
                      <p className="text-sm text-[#625B57] leading-relaxed relative pl-4 border-l-4 border-rose-200">
                        "{memory.description}"
                      </p>
                    )}

                    {/* Highlights array list */}
                    {memory.highlights && memory.highlights.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-extrabold text-cute text-rose-600 mb-1.5 flex items-center gap-1">
                          <Sparkles size={12} /> Hitos clave del viaje miau:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {memory.highlights.map((hi, i) => (
                            <span 
                              key={i} 
                              className="text-[11px] font-semibold bg-[#FFF0F3] border border-rose-100 text-rose-700 px-3 py-1 rounded-xl"
                            >
                              ✧ {hi}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Action row: EDIT and DELETE buttons (Always visible so everything is editable) */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
                    <button
                      type="button"
                      onClick={() => openEditModal(memory)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={13} /> Editar recuerdo
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(memory.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Borrar recuerdo"
                    >
                      <Trash2 size={13} /> Borrar
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MEMORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 transition-all animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] rounded-[28px] max-w-lg w-full p-6 sm:p-7 border-2 border-[#E8E2D2] space-y-4 shadow-2xl shadow-stone-900/15 relative overflow-hidden text-[#2C2723]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-[#E2D8C3] rounded-b-lg opacity-80" />

            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D2]">
              <h3 className="font-extrabold text-cute text-base text-[#2C2723] flex items-center gap-2">
                <span className="p-1 bg-rose-100/70 rounded-xl text-rose-800 text-sm">❤️</span>
                <span>{editingId ? "Editar recuerdo del nido" : "Registrar nuevo recuerdo en pareja"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-800 font-extrabold text-xs cursor-pointer rounded-full p-1.5 hover:bg-stone-200/50 transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSaveMemory} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Título del Recuerdo:</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej: Nuestra caminata de domingo miau miau"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Categoría / Tipo:</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs font-bold"
                  >
                    <option value="trip">Viaje ✈️</option>
                    <option value="date">Cita romántica 🕯️</option>
                    <option value="birthday">Cumpleaños o Fiesta 🎂</option>
                    <option value="adventure">Aventura 🏔️</option>
                    <option value="pet">Mascota 🐾</option>
                    <option value="home">Hogar 🏡</option>
                    <option value="milestone">Logro 🏆</option>
                    <option value="custom">Categoría personalizada ✨</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Fecha exacta:</label>
                  <input 
                    type="date" 
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] font-mono text-xs"
                  />
                </div>
              </div>

              {type === "custom" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#625B57]">Nombre de Categoría personalizada:</label>
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="ej: Noche de pelis 🍿, Rodada en bici 🚴‍♂️"
                    className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs font-bold"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Lugar / Destino:</label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ej: Desierto de la Tatacoa"
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Descripción / Sentimiento:</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escribe lo más lindo que pasó miau..."
                  className="w-full bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-2xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs leading-normal"
                />
              </div>

              {/* MULTI-PHOTO UPLOADER FROM CELL PHONE OR URL */}
              <div className="space-y-2 p-3 bg-white rounded-2xl border border-[#EAE5D9]">
                <label className="block text-xs font-extrabold text-[#2C2723] flex items-center justify-between">
                  <span>📸 Fotos del Recuerdo ({mediaList.length} agregadas)</span>
                  <span className="text-[10px] font-normal text-rose-600">¡Sube múltiples fotos del cel!</span>
                </label>

                {/* Direct cell phone multiple file input */}
                <div>
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black cursor-pointer transition-colors border border-rose-200 border-dashed">
                    <ImageIcon size={15} />
                    <span>{isUploading ? "Procesando fotos del celular..." : "+ Subir fotos desde tu celular"}</span>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* Optional URL input */}
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="O pegar URL de foto web..."
                    className="flex-1 bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-1.5 border border-[#EAE5D9] text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddUrlPhoto}
                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer shrink-0"
                  >
                    + URL
                  </button>
                </div>

                {/* Thumbnail grid of added photos */}
                {mediaList.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {mediaList.map((imgUrl, idx) => (
                      <div key={idx} className="relative group w-full h-16 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                        <img src={imgUrl} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-sm cursor-pointer"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlights inputs drawer */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#625B57]">Hitos clave del Recuerdo (miau):</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    placeholder="ej: Vimos estrellas fugaces"
                    className="flex-1 bg-[#FAF7F2] focus:ring-rose-200 focus:outline-none rounded-xl px-3 py-2 border border-[#EAE5D9] text-cute text-xs"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddHighlight}
                    className="px-3 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                {highlightsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {highlightsList.map((hi, i) => (
                      <span key={i} className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                        <span>{hi}</span>
                        <button type="button" onClick={() => handleRemoveHighlight(i)} className="text-red-500 font-extrabold text-[9px] hover:bg-red-100 rounded px-1">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#EAE5D9] rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 text-[#8A817C]">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-rose-500 text-white rounded-xl text-xs font-black cursor-pointer hover:bg-rose-600 shadow-sm disabled:opacity-50"
                >
                  {editingId ? "Guardar Cambios ✨" : "Registrar Aventura ❤️"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
