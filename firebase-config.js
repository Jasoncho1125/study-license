// d:\workspace\studyLicense\studyLicense\firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWSckI_CyRmXxM-UJSmvECb6X2NK1FU4w",
    authDomain: "study-licnese.firebaseapp.com",
    databaseURL: "https://study-licnese-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "study-licnese",
    storageBucket: "study-licnese.appspot.com",
    messagingSenderId: "382526383688",
    appId: "1:382526383688:web:4b23bc787f6ffbc3aa1a7d",
    measurementId: "G-24Z44XL77C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth and db instances to be used in other scripts
export const auth = getAuth(app);
export const db = getDatabase(app);
