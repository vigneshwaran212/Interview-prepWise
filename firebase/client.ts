// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyDNpt6A5jvAoRPBz24jynb-2v5dsK4J55Q",
  authDomain: "prepwise-90636.firebaseapp.com",
  projectId: "prepwise-90636",
  storageBucket: "prepwise-90636.firebasestorage.app",
  messagingSenderId: "9870915079",
  appId: "1:9870915079:web:dea314754696170ee99ca2",
  measurementId: "G-0LDV1GS80F"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);