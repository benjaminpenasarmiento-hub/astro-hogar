import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Smartphone, QrCode, Share2, PlusSquare, MoreVertical, Info, Download, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface MobileInstallModalProps {
  onClose: () => void;
  homeName?: string;
}

export default function MobileInstallModal({ onClose, homeName = "Mi AstroHogar" }: MobileInstallModalProps) {
  const [activeDeviceTab, setActiveDeviceTab] = useState<"ios" | "android">("ios");
  const [copiedLink, setCopiedLink] = useState(false);

  // Get current web app URL to embed in the QR code
  const currentUrl = window.location.href;

  // Use qrserver.com API to generate a high quality QR Code dynamically
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}&color=2c2723&bgcolor=faf7f2`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E1B18]/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 border-4 border-[#F3EFE6] shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-900 font-extrabold text-xs cursor-pointer rounded-full p-2 hover:bg-[#FAF7F2] transition-colors"
          title="Cerrar ventana miau"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="relative w-18 h-18 mx-auto rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md animate-pulse">
            <img 
              src="/icon-192.jpg" 
              alt="Icono Astro Hogar" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h3 className="font-extrabold text-cute text-xl text-[#2C2723] flex items-center justify-center gap-2 pt-1">
            Instalar {homeName} en el Celular
          </h3>
          <p className="text-xs text-[#8A817C] max-w-sm mx-auto font-medium leading-relaxed">
            Lleva tu nido de amor en la pantalla de inicio de tu móvil con este hermoso icono cósmico. ¡Rápido, privado, y sin intermediarios miau! 🐾
          </p>
        </div>

        {/* QR Code and link block */}
        <div className="bg-[#FAF7F2] border-2 border-[#E7E2D5] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
          <div className="bg-white p-2.5 rounded-xl border border-[#E7E2D5] shadow-inner shrink-0 relative group">
            <img 
              src={qrCodeUrl} 
              alt="Escanear para instalar en celular"
              className="w-40 h-40 object-contain rounded"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-2 opacity-0 hover:opacity-100 transition-opacity duration-200 text-center rounded-xl cursor-default">
              <QrCode className="w-8 h-8 text-amber-600 animate-pulse" />
              <span className="text-[10px] font-bold text-[#2C2723] mt-1 px-2">¡Apunta la cámara de tu celular aquí miau! 📸</span>
            </div>
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center justify-center sm:justify-start gap-1">
                <QrCode className="w-3.5 h-3.5" /> Opción 1: Escanear QR
              </h4>
              <p className="text-[11px] text-[#625B57] font-medium leading-normal mt-1">
                Abre la cámara de tu iPhone o Android y enfoca el código para abrir este nido de amor directamente en tu teléfono.
              </p>
            </div>

            <div className="pt-2 border-t border-[#EAE5D9]/70">
              <h4 className="text-xs font-black uppercase text-indigo-800 tracking-wider flex items-center justify-center sm:justify-start gap-1">
                <Share2 className="w-3.5 h-3.5" /> Opción 2: Enlace directo
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold mb-1.5">
                Copia y envíate este enlace por WhatsApp/Telegram:
              </p>
              <div className="flex gap-1.5">
                <input 
                  type="text" 
                  readOnly 
                  value={currentUrl} 
                  className="bg-white border border-[#EAE5D9] rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-[#2C2723] select-all flex-1 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    copiedLink 
                      ? "bg-green-600 text-white" 
                      : "bg-indigo-100 hover:bg-indigo-200 text-indigo-900"
                  }`}
                >
                  {copiedLink ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Operating System Selection Tabs */}
        <div className="space-y-4">
          <div className="flex bg-[#FAF7F2] p-1 rounded-2xl border-2 border-[#E7E2D5] gap-1">
            <button
              onClick={() => setActiveDeviceTab("ios")}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-cute text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeDeviceTab === "ios"
                  ? "bg-white text-[#2C2723] shadow-xs border border-[#E7E2D5]"
                  : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              🍎 Para iPhone / iOS (Safari)
            </button>
            <button
              onClick={() => setActiveDeviceTab("android")}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-cute text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeDeviceTab === "android"
                  ? "bg-white text-[#2C2723] shadow-xs border border-[#E7E2D5]"
                  : "text-[#8A817C] hover:text-[#2C2723]"
              }`}
            >
              🤖 Para Android (Chrome)
            </button>
          </div>

          {/* Guide list steps block */}
          <div className="bg-white rounded-2xl border-2 border-[#FAF7F2] p-4 space-y-3.5">
            {activeDeviceTab === "ios" ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed">
                    Escanea el código QR de arriba o abre el nido en el navegador de <strong className="text-[#2C2723]">Safari</strong> en tu iPhone.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Busca y toca el botón de <strong className="text-[#2C2723] flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10.5px]"><Share2 className="w-3.5 h-3.5" /> Compartir</strong> (el cuadrado con la flecha hacia arriba) en la barra inferior de Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Desplázate hacia abajo en el menú y selecciona <strong className="text-[#2C2723] flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10.5px]"><PlusSquare className="w-3.5 h-3.5" /> Agregar a pantalla de inicio</strong> (Add to Home Screen).
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed">
                    Escribe un nombre bonito (ej: <strong className="text-[#2C2723] font-black">"{homeName}"</strong>) y presiona <strong className="text-[#2C2723] font-bold text-indigo-700">"Agregar"</strong> en la parte superior derecha. ¡Miau, listo! 🎉
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed">
                    Escanea el código QR de arriba o abre el nido en el navegador de <strong className="text-[#2C2723]">Google Chrome</strong> en tu celular Android.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Toca el menú de los <strong className="text-[#2C2723] flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10.5px]"><MoreVertical className="w-3.5 h-3.5" /> tres puntos</strong> en la esquina superior derecha del navegador Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Selecciona <strong className="text-[#2C2723] flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10.5px]"><Download className="w-3.5 h-3.5" /> Instalar Aplicación</strong> o <strong className="text-[#2C2723]">"Agregar a la pantalla principal"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 flex items-center justify-center text-[10px] font-black font-mono shrink-0 mt-0.5">
                    4
                  </div>
                  <div className="text-xs font-semibold text-[#5C5552] leading-relaxed">
                    Confirma presionando <strong className="text-amber-850 font-bold">"Instalar"</strong>. ¡Listo! El icono aparecerá en tu escritorio como una app nativa miau🐾.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sync security banner */}
        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200/80 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-950 font-medium leading-relaxed">
            <strong className="font-extrabold text-emerald-900 block">Sincronización en tiempo real miau 💫</strong>
            Una vez instalada en el celular, la aplicación carga de forma instantánea y mantiene todos tus datos, presupuestos, recuerdos y notas sincronizados entre Mafe y Benja con el servidor al instante.
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-center pt-2">
          <button
            onClick={onClose}
            className="bg-[#2C2723] hover:bg-black text-white text-xs font-black px-6 py-2.5 rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            Entendido, ¡lo haré! 👍🐾
          </button>
        </div>
      </motion.div>
    </div>
  );
}
