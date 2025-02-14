// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDFY8QxH_Wqm5EOBBmK_9QiOvH31-sWEOA",
  authDomain: "talos-app.firebaseapp.com",
  projectId: "talos-app",
  storageBucket: "talos-app.firebasestorage.app",
  messagingSenderId: "44317420781",
  appId: "1:44317420781:web:99b51c5bc68a28cfc4b0e4",
  measurementId: "G-33T6VT1CWN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };