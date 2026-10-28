// Conexión compartida a Firebase para las páginas nuevas del sitio.
// (pedido.html, admin.html y reporte.html mantienen su propia conexión, igual que antes.)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyB4fIq_u9YM_wrkgepR5BIjvNvzd9VQ2lI",
  authDomain: "menurestaurant-235f7.firebaseapp.com",
  databaseURL: "https://menurestaurant-235f7-default-rtdb.firebaseio.com",
  projectId: "menurestaurant-235f7",
  storageBucket: "menurestaurant-235f7.firebasestorage.app",
  messagingSenderId: "159171586731",
  appId: "1:159171586731:web:d6de4ef7c020ff9b4de5ee"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
