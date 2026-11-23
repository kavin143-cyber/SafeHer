// தற்போதைய GPS இருப்பிடத்தை எடுக்கும் பகுதி
export let currentLat = null;
export let currentLng = null;

export function initGPS() {
  const gpsStatus = document.getElementById('gps-status');
  
  if ("geolocation" in navigator) {
    // ஆப் திறந்தவுடன் Location அனுமதி கேட்கும்
    navigator.geolocation.watchPosition(
      (position) => {
        currentLat = position.coords.latitude;
        currentLng = position.coords.longitude;
        if (gpsStatus) {
          gpsStatus.innerText = `📍 GPS தயார் (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;
          gpsStatus.style.color = "#2b9348";
        }
      },
      (error) => {
        if (gpsStatus) {
          gpsStatus.innerText = "⚠️ தயவுசெய்து மொபைலில் Location (GPS)-ஐ ஆன் செய்யவும்!";
          gpsStatus.style.color = "#d90429";
        }
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  } else {
    alert("உங்கள் பிரவுசரில் GPS வசதி இல்லை.");
  }
}

// சைரன் அலாரம் சத்தம் இயக்கும் பகுதி
const sirenAudio = new Audio('siren.mp3');
sirenAudio.loop = true; // நிறுத்தும் வரை தொடர்ந்து ஒலிக்கும்

export function playEmergencyAlarm() {
  sirenAudio.play().catch(err => {
    console.log("பிரவுசர் கட்டுப்பாட்டால் ஆடியோ தானாக இயங்கவில்லை. திரையைத் தொடவும்.", err);
  });
  // மொபைல் வைப்ரேஷன் (Vibration)
  if ("vibrate" in navigator) {
    navigator.vibrate([1000, 500, 1000, 500, 1000]);
  }
}

export function stopEmergencyAlarm() {
  sirenAudio.pause();
  sirenAudio.currentTime = 0;
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
}
