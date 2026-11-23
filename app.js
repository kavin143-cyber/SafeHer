import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { initGPS, currentLat, currentLng, playEmergencyAlarm, stopEmergencyAlarm } from './gps-alarm.js';

// உங்கள் Firebase Configuration விவரங்களை இங்கே மாற்றவும்
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ஆன்லைன் / ஆஃப்லைன் நிலை சரிபார்ப்பு
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

function updateNetworkStatus() {
  const statusEl = document.getElementById('network-status');
  if (navigator.onLine) {
    statusEl.innerText = "🟢 ஆன்லைன் (Online)";
    statusEl.className = "status-online";
  } else {
    statusEl.innerText = "🔴 ஆஃப்லைன் (Offline Mode - SMS மூலம் இயங்கும்)";
    statusEl.className = "status-offline";
  }
}

// ஆப் திறந்தவுடன் ஏற்கனவே லாகின் செய்திருந்தால் நேரடியாக உள்ளே செல்லும்
window.onload = () => {
  updateNetworkStatus();
  initGPS();
  const savedUser = JSON.parse(localStorage.getItem('kavalan_user'));
  if (savedUser) {
    loadDashboard(savedUser);
  }
};

// 1. லாகின் & ரிஜிஸ்டர் செய்தல்
document.getElementById('login-btn').addEventListener('click', async () => {
  const mode = document.querySelector('input[name="userMode"]:checked').value;
  const phone = document.getElementById('user-phone').value.trim();
  const pin = document.getElementById('user-pin').value.trim();
  const msgBox = document.getElementById('auth-msg');

  if (phone.length < 10 || pin.length < 4) {
    alert("சரியான 10 இலக்க மொபைல் எண் மற்றும் 4 இலக்க PIN உள்ளிடவும்.");
    return;
  }

  const userData = { phone, pin, mode };
  
  // ஆஃப்லைன் பயன்பாட்டிற்காக மொபைலிலேயே சேமித்தல்
  localStorage.setItem('kavalan_user', JSON.stringify(userData));

  if (navigator.onLine) {
    await set(ref(db, 'users/' + phone), {
      phone: phone,
      pin: pin,
      mode: mode,
      emergency: false
    });
  }

  msgBox.innerText = "✅ Registered Successfully! உள்ளே செல்கிறது...";
  setTimeout(() => loadDashboard(userData), 1000);
});

// Dashboard திறத்தல்
function loadDashboard(user) {
  document.getElementById('auth-section').classList.add('hidden');
  
  if (user.mode === 'child') {
    document.getElementById('child-section').classList.remove('hidden');
    loadSavedContacts();
  } else {
    document.getElementById('parent-section').classList.remove('hidden');
  }
}

// 2. குழந்தை எண்களைச் சேமித்தல்
document.getElementById('save-contacts-btn').addEventListener('click', async () => {
  const user = JSON.parse(localStorage.getItem('kavalan_user'));
  const contacts = {
    mom: document.getElementById('mom-phone').value.trim(),
    dad: document.getElementById('dad-phone').value.trim(),
    guardian: document.getElementById('guardian-phone').value.trim()
  };

  // Offline-க்காக LocalStorage-ல் சேமிப்பு
  localStorage.setItem('kavalan_contacts', JSON.stringify(contacts));

  if (navigator.onLine) {
    await update(ref(db, 'users/' + user.phone), { contacts });
  }
  alert("✅ அம்மா, அப்பா மற்றும் கார்டியன் எண்கள் பாதுகாப்பாகச் சேமிக்கப்பட்டன!");
});

function loadSavedContacts() {
  const contacts = JSON.parse(localStorage.getItem('kavalan_contacts'));
  if (contacts) {
    document.getElementById('mom-phone').value = contacts.mom || '';
    document.getElementById('dad-phone').value = contacts.dad || '';
    document.getElementById('guardian-phone').value = contacts.guardian || '';
  }
}

// 3. EMERGENCY SOS பட்டன் செயல்பாடு (Online + Offline)
document.getElementById('sos-btn').addEventListener('click', async () => {
  const user = JSON.parse(localStorage.getItem('kavalan_user'));
  const contacts = JSON.parse(localStorage.getItem('kavalan_contacts'));
  
  const lat = currentLat || 0;
  const lng = currentLng || 0;
  const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;

  // A. இன்டர்நெட் இருந்தால் -> நேரடியாக Firebase வழியாக பெற்றோர் ஆப்பிற்கு அலாரம் அனுப்பும்
  if (navigator.onLine) {
    await update(ref(db, 'users/' + user.phone), {
      emergency: true,
      lat: lat,
      lng: lng,
      timestamp: Date.now()
    });
    alert("🚨 அவசர அலர்ட் மற்றும் Live Location உங்கள் பெற்றோருக்கு அனுப்பப்பட்டுவிட்டது!");
  } 
  // B. இன்டர்நெட் இல்லையென்றால் (Offline) -> மொபைலின் SMS ஆப் வழியாக GPS லிங்க் அனுப்பும்
  else {
    if (contacts && (contacts.mom || contacts.dad)) {
      const targetPhone = contacts.mom || contacts.dad;
      const smsText = encodeURIComponent(`EMERGENCY! Naan aabathil ullen. Ennudaiya Live Location: ${mapUrl}`);
      window.location.href = `sms:+91${targetPhone}?body=${smsText}`;
    } else {
      alert("இன்டர்நெட் இல்லை! உடனடியாக 112-க்கு கால் செய்யவும்.");
      window.location.href = "tel:112";
    }
  }
});

// 4. பெற்றோர் குழந்தையைக் கண்காணித்தல் (Parent Mode Listener)
document.getElementById('link-child-btn').addEventListener('click', () => {
  const childPhone = document.getElementById('track-child-phone').value.trim();
  if (!childPhone) return alert("குழந்தையின் மொபைல் எண்ணை உள்ளிடவும்.");

  const childRef = ref(db, 'users/' + childPhone);
  
  // Database-ல் மாற்றம் நடந்தவுடன் உடனடியாக பெற்றோர் மொபைலில் அலாரம் அடிக்கும்
  onValue(childRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      alert("இந்த எண்ணில் குழந்தை கணக்கு இல்லை.");
      return;
    }

    if (data.emergency === true) {
      document.getElementById('child-safe-status').classList.add('hidden');
      document.getElementById('emergency-alert-box').classList.remove('hidden');
      document.getElementById('live-map-link').href = `https://maps.google.com/?q=${data.lat},${data.lng}`;
      
      // சைரன் சத்தம் ஒலிக்கும்
      playEmergencyAlarm();
    } else {
      document.getElementById('child-safe-status').classList.remove('hidden');
      document.getElementById('emergency-alert-box').classList.add('hidden');
      stopEmergencyAlarm();
    }
  });

  alert(`✅ ${childPhone} கண்காணிப்பில் இணைக்கப்பட்டது. ஆப்பை மூடாமல் வைத்திருக்கவும்.`);
});

// அலாரம் நிறுத்தும் பட்டன்
document.getElementById('stop-alarm-btn').addEventListener('click', async () => {
  stopEmergencyAlarm();
  const childPhone = document.getElementById('track-child-phone').value.trim();
  if (childPhone && navigator.onLine) {
    await update(ref(db, 'users/' + childPhone), { emergency: false });
  }
});

// வெளியேறு (Logout)
window.logout = function() {
  localStorage.removeItem('kavalan_user');
  location.reload();
};
