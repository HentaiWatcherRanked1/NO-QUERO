const initialCenter = [42.3601, -71.0589];

const map = L.map("map", {
  zoomControl: false,
  attributionControl: false
}).setView(initialCenter, 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

let editMode = false;
let markerMode = "label";
let convoyActive = true;
let gpsWatch = null;
let routeEditing = false;
let pendingTapAction = null;

const members = [
  { id:"luis", name:"Luis", speed:42, lat:42.3601, lng:-71.0589, leader:true },
  { id:"mike", name:"Mike", speed:39, lat:42.3545, lng:-71.0615 },
  { id:"jay", name:"Jay", speed:45, lat:42.3485, lng:-71.0648 }
];

let spots = [
  { id:"meet-1", title:"Meet Spot", type:"meet", lat:42.3868, lng:-71.0765 },
  { id:"gas-1", title:"Fuel Stop", type:"gas", lat:42.4012, lng:-71.0850 }
];

let route = [
  [42.3601,-71.0589],
  [42.3706,-71.0677],
  [42.3868,-71.0765],
  [42.4012,-71.0850],
  [42.4189,-71.0914]
];

const memberMarkers = new Map();
const spotMarkers = new Map();
let routeLine = null;
let routeNodes = [];

function markerHTML(member) {
  if (markerMode === "icon") {
    return `
      <div class="car-marker">
        <div class="car-speed">${Math.max(0,Math.round(member.speed))} mph</div>
        <div>🚗</div>
        <div class="car-name">${member.leader ? "★ " : ""}${member.name}</div>
      </div>`;
  }

  return `
    <div class="member-marker">
      <div class="speed-pill">
        <span class="num">${Math.max(0,Math.round(member.speed))}</span>
        <span class="unit">mph</span>
      </div>
      <div class="name-pill ${member.leader ? "leader" : ""}">
        ${member.leader ? "★ " : ""}${member.name}
      </div>
      <div class="marker-arrow"></div>
    </div>`;
}

function memberIcon(member) {
  return L.divIcon({
    html: markerHTML(member),
    className:"",
    iconSize:[1,1],
    iconAnchor:[0,0]
  });
}

function spotIcon(spot) {
  return L.divIcon({
    html:`<div class="spot-pin">${spot.type === "gas" ? "⛽" : spot.type === "food" ? "🍔" : spot.type === "photo" ? "📸" : spot.type === "scenic" ? "🌄" : "📍"} ${spot.title}</div>`,
    className:"",
    iconSize:[1,1],
    iconAnchor:[0,0]
  });
}

function renderMembers() {
  members.forEach(member => {
    if (!convoyActive) return;

    if (!memberMarkers.has(member.id)) {
      const marker = L.marker([member.lat,member.lng], {
        icon: memberIcon(member),
        draggable: editMode
      }).addTo(map);

      marker.on("dragend", e => {
        const p = e.target.getLatLng();
        member.lat = p.lat; member.lng = p.lng;
        updateSpread();
      });

      marker.on("click", () => {
        if (editMode) openMemberEditor(member.id);
      });

      memberMarkers.set(member.id, marker);
    } else {
      const marker = memberMarkers.get(member.id);
      marker.setLatLng([member.lat,member.lng]);
      marker.setIcon(memberIcon(member));
      if (editMode) marker.dragging.enable(); else marker.dragging.disable();
    }
  });

  if (!convoyActive) {
    memberMarkers.forEach(marker => map.removeLayer(marker));
    memberMarkers.clear();
  }

  document.getElementById("carCount").textContent = `${members.length} cars`;
  updateSpread();
}

function renderSpots() {
  // Remove deleted spots.
  for (const [id, marker] of spotMarkers.entries()) {
    if (!spots.some(s => s.id === id)) {
      map.removeLayer(marker);
      spotMarkers.delete(id);
    }
  }

  spots.forEach(spot => {
    if (!spotMarkers.has(spot.id)) {
      const marker = L.marker([spot.lat,spot.lng], {
        icon: spotIcon(spot),
        draggable: editMode
      }).addTo(map);

      marker.on("dragend", e => {
        const p = e.target.getLatLng();
        spot.lat = p.lat; spot.lng = p.lng;
      });

      marker.on("click", () => {
        if (editMode) openSpotEditor(spot.id);
      });

      spotMarkers.set(spot.id, marker);
    } else {
      const marker = spotMarkers.get(spot.id);
      marker.setLatLng([spot.lat,spot.lng]);
      marker.setIcon(spotIcon(spot));
      if (editMode) marker.dragging.enable(); else marker.dragging.disable();
    }
  });
}

function renderRoute() {
  if (routeLine) map.removeLayer(routeLine);
  routeNodes.forEach(n => map.removeLayer(n));
  routeNodes = [];

  if (route.length > 1) {
    routeLine = L.polyline(route, { weight:6, opacity:.9 }).addTo(map);
  }

  if (routeEditing) {
    route.forEach((point, index) => {
      const marker = L.marker(point, {
        draggable:true,
        icon:L.divIcon({
          html:'<div class="route-node"></div>',
          className:"",
          iconSize:[16,16],
          iconAnchor:[8,8]
        })
      }).addTo(map);

      marker.on("dragend", e => {
        const p = e.target.getLatLng();
        route[index] = [p.lat,p.lng];
        renderRoute();
      });

      marker.on("click", () => {
        route.splice(index,1);
        renderRoute();
      });

      routeNodes.push(marker);
    });
  }
}

function updateSpread() {
  if (members.length < 2) return;
  let max = 0;
  for (let i=0;i<members.length;i++) {
    for (let j=i+1;j<members.length;j++) {
      const a=L.latLng(members[i].lat,members[i].lng);
      const b=L.latLng(members[j].lat,members[j].lng);
      max=Math.max(max,a.distanceTo(b));
    }
  }
  document.getElementById("spread").textContent = `${(max/1609.344).toFixed(1)} mi spread`;
}

function refreshAll() {
  renderMembers();
  renderSpots();
  renderRoute();
  refreshMapSize();
}

function setEditMode(on) {
  editMode = on;
  document.getElementById("editBtn").classList.toggle("active", on);
  document.getElementById("editBanner").classList.toggle("hidden", !on);
  refreshAll();
}

document.getElementById("editBtn").addEventListener("click", () => {
  setEditMode(!editMode);
});

document.getElementById("iconModeBtn").addEventListener("click", () => {
  markerMode = markerMode === "label" ? "icon" : "label";
  document.getElementById("iconModeBtn").textContent = markerMode === "icon" ? "🏷️" : "🚗";
  renderMembers();
});

document.getElementById("centerBtn").addEventListener("click", () => {
  const me = members.find(m=>m.id==="luis");
  map.flyTo([me.lat,me.lng],15);
});

map.on("click", e => {
  if (routeEditing) {
    route.push([e.latlng.lat,e.latlng.lng]);
    renderRoute();
    return;
  }

  if (!editMode) return;

  pendingTapAction = { lat:e.latlng.lat, lng:e.latlng.lng };
  showTapMenu();
});

function showTapMenu() {
  const sheet = document.getElementById("sheet");
  document.getElementById("sheetTitle").textContent = "Place on map";
  document.getElementById("sheetContent").innerHTML = `
    <div class="action-row">
      <button id="tapAddSpot" class="primary">ADD SPOT</button>
      <button id="tapMoveCrew">MOVE CREW</button>
    </div>
    <div class="hint">Tapped location: ${pendingTapAction.lat.toFixed(5)}, ${pendingTapAction.lng.toFixed(5)}</div>
  `;
  sheet.classList.remove("hidden");

  document.getElementById("tapAddSpot").addEventListener("click", () => openNewSpotForm(pendingTapAction));
  document.getElementById("tapMoveCrew").addEventListener("click", () => openMoveCrewForm(pendingTapAction));
}

function openNewSpotForm(coords) {
  document.getElementById("sheetTitle").textContent = "New spot";
  document.getElementById("sheetContent").innerHTML = `
    <div class="field"><label>Name</label><input id="spotName" value="New Spot"></div>
    <div class="field"><label>Type</label>
      <select id="spotType">
        <option value="meet">Meet</option>
        <option value="gas">Gas</option>
        <option value="food">Food</option>
        <option value="photo">Photo</option>
        <option value="scenic">Scenic</option>
      </select>
    </div>
    <div class="action-row"><button id="saveSpot" class="primary">SAVE SPOT</button></div>
  `;
  document.getElementById("saveSpot").addEventListener("click", () => {
    spots.push({
      id:"spot-"+Date.now(),
      title:document.getElementById("spotName").value.trim() || "Spot",
      type:document.getElementById("spotType").value,
      lat:coords.lat, lng:coords.lng
    });
    closeSheet();
    renderSpots();
  });
}

function openMoveCrewForm(coords) {
  document.getElementById("sheetTitle").textContent = "Move crew member";
  document.getElementById("sheetContent").innerHTML = `
    <div class="field"><label>Crew member</label>
      <select id="crewSelect">
        ${members.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}
      </select>
    </div>
    <div class="action-row"><button id="moveCrew" class="primary">MOVE HERE</button></div>
  `;
  document.getElementById("moveCrew").addEventListener("click", () => {
    const member=members.find(m=>m.id===document.getElementById("crewSelect").value);
    member.lat=coords.lat; member.lng=coords.lng;
    closeSheet();
    renderMembers();
  });
}

function openMemberEditor(id) {
  const m=members.find(x=>x.id===id);
  document.getElementById("sheetTitle").textContent = "Edit crew";
  document.getElementById("sheetContent").innerHTML = `
    <div class="field"><label>Name</label><input id="memberName" value="${m.name}"></div>
    <div class="field"><label>Manual speed (mph)</label><input id="memberSpeed" type="number" value="${Math.round(m.speed)}"></div>
    <div class="action-row">
      <button id="saveMember" class="primary">SAVE</button>
      ${m.id !== "luis" ? '<button id="deleteMember">REMOVE</button>' : ''}
    </div>
    <div class="hint">You can also drag this marker anywhere while Edit Mode is on.</div>
  `;
  document.getElementById("sheet").classList.remove("hidden");
  document.getElementById("saveMember").addEventListener("click", () => {
    m.name=document.getElementById("memberName").value.trim() || m.name;
    m.speed=Number(document.getElementById("memberSpeed").value) || 0;
    closeSheet(); renderMembers();
  });
  const del=document.getElementById("deleteMember");
  if (del) del.addEventListener("click", () => {
    const idx=members.findIndex(x=>x.id===id);
    members.splice(idx,1);
    const marker=memberMarkers.get(id);
    if(marker) map.removeLayer(marker);
    memberMarkers.delete(id);
    closeSheet(); renderMembers(); renderConvoyDrawer();
  });
}

function openSpotEditor(id) {
  const s=spots.find(x=>x.id===id);
  document.getElementById("sheetTitle").textContent = "Edit spot";
  document.getElementById("sheetContent").innerHTML = `
    <div class="field"><label>Name</label><input id="editSpotName" value="${s.title}"></div>
    <div class="field"><label>Type</label>
      <select id="editSpotType">
        ${["meet","gas","food","photo","scenic"].map(t=>`<option value="${t}" ${s.type===t?"selected":""}>${t}</option>`).join("")}
      </select>
    </div>
    <div class="action-row">
      <button id="saveSpotEdit" class="primary">SAVE</button>
      <button id="deleteSpot">DELETE</button>
    </div>
    <div class="hint">You can also drag this spot anywhere while Edit Mode is on.</div>
  `;
  document.getElementById("sheet").classList.remove("hidden");
  document.getElementById("saveSpotEdit").addEventListener("click", () => {
    s.title=document.getElementById("editSpotName").value.trim() || s.title;
    s.type=document.getElementById("editSpotType").value;
    closeSheet(); renderSpots(); renderSpotsDrawer();
  });
  document.getElementById("deleteSpot").addEventListener("click", () => {
    spots=spots.filter(x=>x.id!==id);
    closeSheet(); renderSpots(); renderSpotsDrawer();
  });
}

function closeSheet() {
  document.getElementById("sheet").classList.add("hidden");
}
document.getElementById("closeSheet").addEventListener("click", closeSheet);

function renderRoutesDrawer() {
  const drawer=document.getElementById("drawer");
  document.getElementById("drawerTitle").textContent="Routes";
  document.getElementById("drawerContent").innerHTML=`
    <div class="action-row">
      <button id="routeEditBtn" class="${routeEditing?"primary":""}">
        ${routeEditing?"FINISH ROUTE":"EDIT ROUTE"}
      </button>
      <button id="clearRouteBtn">CLEAR</button>
    </div>
    <div class="item"><div class="item-main"><strong>Night Run</strong><small>${route.length} points</small></div></div>
    <div class="hint">In route edit mode, tap the map to add route points. Drag a white/green point to move it. Tap a route point to delete it.</div>
  `;
  drawer.classList.remove("hidden");

  document.getElementById("routeEditBtn").addEventListener("click", () => {
    routeEditing=!routeEditing;
    setEditMode(routeEditing || editMode);
    renderRoute();
    renderRoutesDrawer();
    if(routeEditing) drawer.classList.add("hidden");
  });

  document.getElementById("clearRouteBtn").addEventListener("click", () => {
    route=[]; renderRoute(); renderRoutesDrawer();
  });
}

function renderSpotsDrawer() {
  const drawer=document.getElementById("drawer");
  document.getElementById("drawerTitle").textContent="Spots";
  document.getElementById("drawerContent").innerHTML=`
    <div class="action-row">
      <button id="addSpotCenter" class="primary">ADD AT MAP CENTER</button>
    </div>
    ${spots.map(s=>`
      <div class="item">
        <div class="item-main"><strong>${s.title}</strong><small>${s.type.toUpperCase()}</small></div>
        <button data-edit-spot="${s.id}">EDIT</button>
      </div>`).join("")}
    <div class="hint">Turn on Edit Mode to drag spots directly on the map.</div>
  `;
  drawer.classList.remove("hidden");
  document.getElementById("addSpotCenter").addEventListener("click", () => {
    const c=map.getCenter(); openNewSpotForm({lat:c.lat,lng:c.lng});
  });
  drawer.querySelectorAll("[data-edit-spot]").forEach(btn=>{
    btn.addEventListener("click",()=>openSpotEditor(btn.dataset.editSpot));
  });
}

function renderConvoyDrawer() {
  const drawer=document.getElementById("drawer");
  document.getElementById("drawerTitle").textContent="Convoy";
  document.getElementById("drawerContent").innerHTML=`
    <div class="action-row"><button id="addCrewBtn" class="primary">ADD CREW MEMBER</button></div>
    ${members.map(m=>`
      <div class="item">
        <div class="item-main"><strong>${m.leader?"★ ":""}${m.name}</strong><small>${Math.round(m.speed)} mph</small></div>
        <button data-edit-member="${m.id}">EDIT</button>
      </div>`).join("")}
    <div class="hint">Edit Mode lets you drag crew markers. Real phone-to-phone convoy tracking comes when the realtime backend is connected.</div>
  `;
  drawer.classList.remove("hidden");

  document.getElementById("addCrewBtn").addEventListener("click", () => {
    const c=map.getCenter();
    const newMember={id:"crew-"+Date.now(),name:"Friend",speed:0,lat:c.lat,lng:c.lng};
    members.push(newMember);
    renderMembers();
    openMemberEditor(newMember.id);
  });

  drawer.querySelectorAll("[data-edit-member]").forEach(btn=>{
    btn.addEventListener("click",()=>openMemberEditor(btn.dataset.editMember));
  });
}

document.querySelectorAll(".bottom-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab=btn.dataset.tab;

    if(tab==="map"){
      document.getElementById("drawer").classList.add("hidden");
      return;
    }
    if(tab==="routes") renderRoutesDrawer();
    if(tab==="spots") renderSpotsDrawer();
    if(tab==="convoy") renderConvoyDrawer();
  });
});
document.getElementById("closeDrawer").addEventListener("click",()=>document.getElementById("drawer").classList.add("hidden"));

document.getElementById("gpsBtn").addEventListener("click", () => {
  if(!navigator.geolocation){ alert("GPS is not available in this browser."); return; }
  const btn=document.getElementById("gpsBtn");
  btn.textContent="GPS ON"; btn.classList.add("success");
  if(gpsWatch!==null) return;

  gpsWatch=navigator.geolocation.watchPosition(pos=>{
    const me=members.find(m=>m.id==="luis");
    me.lat=pos.coords.latitude; me.lng=pos.coords.longitude;
    if(typeof pos.coords.speed==="number" && pos.coords.speed>=0){
      me.speed=pos.coords.speed*2.236936;
    }
    renderMembers(); refreshMapSize();
  },()=>{
    alert("Location permission is needed for your live marker.");
    btn.textContent="USE MY GPS"; btn.classList.remove("success");
  },{
    enableHighAccuracy:true, maximumAge:1000, timeout:10000
  });
});

document.getElementById("toggleBtn").addEventListener("click",()=>{
  convoyActive=!convoyActive;
  const btn=document.getElementById("toggleBtn");
  if(!convoyActive){
    btn.textContent="START"; btn.classList.add("success");
  }else{
    document.getElementById("inviteCode").textContent=Math.random().toString(36).slice(2,8).toUpperCase();
    btn.textContent="END"; btn.classList.remove("success");
  }
  renderMembers();
});

function refreshMapSize(){
  requestAnimationFrame(()=>map.invalidateSize({pan:false}));
  setTimeout(()=>map.invalidateSize({pan:false}),120);
  setTimeout(()=>map.invalidateSize({pan:false}),450);
}
window.addEventListener("load",refreshMapSize);
window.addEventListener("resize",refreshMapSize);
window.addEventListener("orientationchange",refreshMapSize);
window.addEventListener("pageshow",refreshMapSize);
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) refreshMapSize(); });
if(window.visualViewport){
  window.visualViewport.addEventListener("resize",refreshMapSize);
  window.visualViewport.addEventListener("scroll",refreshMapSize);
}


const drives = [
  { date:"June 5th", time:"9:18 PM – 11:44 PM", miles:"39.5 mi", duration:"2h 30m", top:84 },
  { date:"June 3rd", time:"5:11 AM – 7:52 AM", miles:"103.0 mi", duration:"1h 51m", top:81 },
  { date:"May 24th", time:"7:55 PM – 9:09 PM", miles:"29.8 mi", duration:"1h 36m", top:83 }
];

const hazardReports = [];
const hazardMarkers = new Map();

function renderDrivePanel(){
  const list=document.getElementById("driveList");
  if(!list) return;
  list.innerHTML=drives.map(d=>`
    <div class="drive-card">
      <div class="drive-line">〰️</div>
      <div class="drive-meta">
        <strong>${d.date}</strong>
        <small>${d.time}</small>
        <small>${d.miles} · ${d.duration}</small>
      </div>
      <div class="drive-speed">${d.top}<span>MPH</span></div>
    </div>`).join("");
}

function renderStatsPanel(){
  const el=document.getElementById("statsContent");
  if(!el) return;
  const rows=[
    ["< 30 mph",18,5],
    ["30–50 mph",31,9],
    ["50–70 mph",62,85],
    ["70–100 mph",48,31],
    ["> 100 mph",12,4]
  ];
  el.innerHTML=`
    <div class="stat-block">
      <div class="stat-heading"><span>Top Speed</span><span>84 mph</span></div>
      <div class="hint">You: 81 mph</div>
    </div>
    <div class="stat-block">
      <div class="stat-heading"><span>Speed distribution</span><span></span></div>
      ${rows.map(r=>`
      <div class="stat-row">
        <label>${r[0]}</label>
        <div>
          <div class="stat-track"><div class="stat-fill" style="width:${r[1]}%"></div></div>
          <div class="stat-track" style="margin-top:3px"><div class="stat-fill me" style="width:${r[2]}%"></div></div>
        </div>
      </div>`).join("")}
    </div>`;
}

function reportRoadHazard(type="Road issue", latlng=null){
  const c=latlng || map.getCenter();
  const id="haz-"+Date.now();
  hazardReports.push({id,type,lat:c.lat,lng:c.lng,created:Date.now()});

  const icon=L.divIcon({
    html:`<div class="hazard-marker">⚠️ ${type}</div>`,
    className:"",iconSize:[1,1],iconAnchor:[0,0]
  });
  const marker=L.marker([c.lat,c.lng],{icon}).addTo(map);
  hazardMarkers.set(id,marker);

  const toast=document.getElementById("hazardToast");
  document.getElementById("hazardTitle").textContent=type;
  document.getElementById("hazardSub").textContent="Reported ahead";
  toast.classList.remove("hidden");
  toast.classList.remove("persistent");

  setTimeout(()=>{
    toast.classList.add("persistent");
    document.getElementById("hazardSub").textContent="Marked for the rest of today";
  },5000);

  setTimeout(()=>toast.classList.add("hidden"),9000);
}

function openHazardMenu(){
  const c=map.getCenter();
  document.getElementById("sheetTitle").textContent="Report road issue";
  document.getElementById("sheetContent").innerHTML=`
    <div class="field"><label>Issue</label>
      <select id="hazardType">
        <option>Crash</option>
        <option>Stopped vehicle</option>
        <option>Debris</option>
        <option>Construction</option>
        <option>Road closure</option>
        <option>Emergency activity</option>
        <option>Other hazard</option>
      </select>
    </div>
    <div class="action-row"><button id="saveHazard" class="primary">REPORT HERE</button></div>
    <div class="hint">The first alert is temporary, then the marker remains highlighted for the rest of the day.</div>`;
  document.getElementById("sheet").classList.remove("hidden");
  document.getElementById("saveHazard").addEventListener("click",()=>{
    reportRoadHazard(document.getElementById("hazardType").value,c);
    closeSheet();
  });
}

renderMembers();
renderSpots();
renderRoute();
renderDrivePanel();
renderStatsPanel();
refreshMapSize();

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

document.querySelectorAll(".bottom-nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const tab=btn.dataset.tab;
    const drive=document.getElementById("drivePanel");
    const stats=document.getElementById("statsPanel");
    const drawer=document.getElementById("drawer");

    if(drive) drive.classList.add("hidden");
    if(stats) stats.classList.add("hidden");
    if(drawer) drawer.classList.add("hidden");

    if(tab==="drive"){
      renderDrivePanel();
      drive.classList.remove("hidden");
    } else if(tab==="crew"){
      renderConvoyDrawer();
    } else if(tab==="stats"){
      renderStatsPanel();
      stats.classList.remove("hidden");
    }
  });
});

if(document.getElementById("editBtn")){
  document.getElementById("editBtn").addEventListener("dblclick",openHazardMenu);
  document.getElementById("editBtn").title="Tap: edit map · double-tap: report road issue";
}

// Add a dedicated hazard button below icon mode.
const actions=document.querySelector(".map-actions");
if(actions){
  const h=document.createElement("button");
  h.id="hazardBtn";
  h.className="round-btn";
  h.textContent="⚠️";
  h.setAttribute("aria-label","Report road issue");
  h.addEventListener("click",openHazardMenu);
  actions.appendChild(h);
}

renderDrivePanel();
