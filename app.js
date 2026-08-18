const initialCenter = [42.3601, -71.0589];

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false
}).setView(initialCenter, 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

const route = [
  [42.3601, -71.0589],
  [42.3706, -71.0677],
  [42.3868, -71.0765],
  [42.4012, -71.0850],
  [42.4189, -71.0914]
];

L.polyline(route, {
  weight: 6,
  opacity: 0.9
}).addTo(map);

const spots = [
  { title: "Meet Spot", type: "meet", lat: 42.3868, lng: -71.0765 },
  { title: "Fuel Stop", type: "gas", lat: 42.4012, lng: -71.0850 }
];

spots.forEach(spot => {
  L.marker([spot.lat, spot.lng])
    .addTo(map)
    .bindTooltip(`<div class="spot-label">${spot.title}</div>`, {
      permanent: false,
      direction: "top",
      className: ""
    });
});

let convoyActive = true;
let gpsWatch = null;
let inviteCode = "GTI629";

const members = [
  {
    id: "luis",
    name: "Luis",
    speed: 42,
    lat: 42.3601,
    lng: -71.0589,
    leader: true
  },
  {
    id: "mike",
    name: "Mike",
    speed: 39,
    lat: 42.3545,
    lng: -71.0615
  },
  {
    id: "jay",
    name: "Jay",
    speed: 45,
    lat: 42.3485,
    lng: -71.0648
  }
];

const memberMarkers = new Map();

function markerHTML(member) {
  return `
    <div class="member-marker">
      <div class="speed-pill">
        <span class="num">${Math.max(0, Math.round(member.speed))}</span>
        <span class="unit">mph</span>
      </div>
      <div class="name-pill ${member.leader ? "leader" : ""}">
        ${member.leader ? "★ " : ""}${member.name}
      </div>
      <div class="marker-arrow"></div>
    </div>
  `;
}

function renderMembers() {
  members.forEach(member => {
    const icon = L.divIcon({
      html: markerHTML(member),
      className: "",
      iconSize: [1, 1],
      iconAnchor: [0, 0]
    });

    if (!memberMarkers.has(member.id)) {
      const marker = L.marker([member.lat, member.lng], { icon }).addTo(map);
      memberMarkers.set(member.id, marker);
    } else {
      const marker = memberMarkers.get(member.id);
      marker.setLatLng([member.lat, member.lng]);
      marker.setIcon(icon);
    }
  });

  document.getElementById("carCount").textContent = `${members.length} cars`;
  updateSpread();
}

function updateSpread() {
  if (members.length < 2) {
    document.getElementById("spread").textContent = "0.0 mi spread";
    return;
  }

  const a = L.latLng(members[0].lat, members[0].lng);
  const b = L.latLng(members[members.length - 1].lat, members[members.length - 1].lng);
  const miles = a.distanceTo(b) / 1609.344;
  document.getElementById("spread").textContent = `${miles.toFixed(1)} mi spread`;
}

renderMembers();

setInterval(() => {
  if (!convoyActive) return;

  members.forEach((member, i) => {
    if (member.id === "luis") return;
    member.speed = Math.max(0, member.speed + (Math.random() * 6 - 3));
    member.lat += 0.00005 * (i + 1);
    member.lng += 0.00003 * (i + 1);
  });

  renderMembers();
}, 2200);

document.getElementById("gpsBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("GPS is not available in this browser.");
    return;
  }

  const gpsBtn = document.getElementById("gpsBtn");
  gpsBtn.textContent = "GPS ON";
  gpsBtn.classList.add("success");

  if (gpsWatch !== null) return;

  gpsWatch = navigator.geolocation.watchPosition(
    position => {
      const me = members.find(m => m.id === "luis");
      me.lat = position.coords.latitude;
      me.lng = position.coords.longitude;

      if (typeof position.coords.speed === "number" && position.coords.speed >= 0) {
        me.speed = position.coords.speed * 2.236936;
      }

      renderMembers();
      refreshMapSize();
    },
    error => {
      alert("Location permission is needed for your live marker.");
      gpsBtn.textContent = "USE MY GPS";
      gpsBtn.classList.remove("success");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1500,
      timeout: 10000
    }
  );
});

document.getElementById("toggleBtn").addEventListener("click", () => {
  convoyActive = !convoyActive;
  const btn = document.getElementById("toggleBtn");

  if (!convoyActive) {
    btn.textContent = "START";
    btn.classList.add("success");
    memberMarkers.forEach(marker => map.removeLayer(marker));
    memberMarkers.clear();
  } else {
    inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
    document.getElementById("inviteCode").textContent = inviteCode;
    btn.textContent = "END";
    btn.classList.remove("success");
    renderMembers();
  }
});

document.getElementById("centerBtn").addEventListener("click", () => {
  const me = members.find(m => m.id === "luis");
  map.flyTo([me.lat, me.lng], 15);
});

const drawer = document.getElementById("drawer");
const drawerTitle = document.getElementById("drawerTitle");
const drawerContent = document.getElementById("drawerContent");

document.querySelectorAll(".bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tab = btn.dataset.tab;

    if (tab === "convoy" || tab === "map") {
      drawer.classList.add("hidden");
      return;
    }

    drawer.classList.remove("hidden");

    if (tab === "routes") {
      drawerTitle.textContent = "Saved Routes";
      drawerContent.innerHTML = `
        <div class="item">
          <strong>Night Run</strong>
          <small>5 route points • active demo route</small>
        </div>
        <div class="item">
          <strong>+ Create Route</strong>
          <small>Route builder comes in the next version.</small>
        </div>
      `;
    }

    if (tab === "spots") {
      drawerTitle.textContent = "Saved Spots";
      drawerContent.innerHTML = spots.map(spot => `
        <div class="item">
          <strong>${spot.title}</strong>
          <small>${spot.type.toUpperCase()}</small>
        </div>
      `).join("");
    }
  });
});

document.getElementById("closeDrawer").addEventListener("click", () => {
  drawer.classList.add("hidden");
});



// iPhone / PWA map viewport repair.
function refreshMapSize() {
  requestAnimationFrame(() => {
    map.invalidateSize({ pan: false, debounceMoveend: true });
  });

  setTimeout(() => map.invalidateSize({ pan: false }), 120);
  setTimeout(() => map.invalidateSize({ pan: false }), 450);
}

window.addEventListener("load", refreshMapSize);
window.addEventListener("resize", refreshMapSize);
window.addEventListener("orientationchange", refreshMapSize);
window.addEventListener("pageshow", refreshMapSize);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshMapSize();
});

// PWA/Safari's visual viewport can change independently of window.innerHeight.
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", refreshMapSize);
  window.visualViewport.addEventListener("scroll", refreshMapSize);
}

// Run once after Leaflet and the UI have fully settled.
refreshMapSize();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
