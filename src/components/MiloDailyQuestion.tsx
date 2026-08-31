import React from "react";

const QUESTIONS = [
  "¿Qué pequeño detalle te hace sentir en casa?",
  "¿Qué quieres que Milo recuerde especialmente de ti?",
  "¿Qué te ayuda a recuperar energía cuando has tenido un día pesado?",
  "¿Qué momento del día disfrutas más en casa?",
  "¿Hay algo que te gustaría que Milo te recordara sin que tengas que pedirlo?",
  "¿Qué actividad te gustaría convertir en una tradición del nido?",
  "¿Qué comida o bebida te hace sentir inmediatamente en modo hogar?",
  "¿Qué meta personal te gustaría que Milo te ayudara a cuidar?"
];

export default function MiloDailyQuestion() {
  const index = (new Date().getDate() + new Date().getMonth() * 3) % QUESTIONS.length;
  return (
    <div className="mt-3 rounded-2xl border border-violet-200/70 bg-violet-50/70 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-violet-700">💬 Conozcámonos con Milo</p>
      <p className="text-xs font-bold text-[#3E3747] mt-1">{QUESTIONS[index]}</p>
      <p className="text-[10px] text-violet-700/80 mt-1">Tu respuesta ayuda a Milo a entender mejor tus preferencias, hábitos y forma de vivir el hogar.</p>
    </div>
  );
}
