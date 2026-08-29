import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { doc, collection, query, where, onSnapshot, getDocs, getDoc, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import Sidebar from "./components/Sidebar";
import GatitoAiChat from "./components/GatitoAiChat";
import OnboardingWizard from "./components/OnboardingWizardV2";
import AstroProfileModal from "./components/AstroProfileModal";