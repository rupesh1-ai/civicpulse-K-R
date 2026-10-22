(() => {
let dashboardMap, fullMap, detailMap, dashboardMarkers, fullMarkers, detailMarker;
function popup(issue) { return `<b>${window.CivicAuth.escapeHtml(issue.title)}</b><br>${window.CivicAuth.escapeHtml(issue.location)}<br><small>${window.CivicAuth.escapeHtml(issue.status)}</small>`; }
function addMarkers(map, issues, oldLayer) {
 if(oldLayer)oldLayer.remove();
 const layer=L.layerGroup();
 issues.forEach(i=>{
  if(!Number.isFinite(Number(i.lat))||!Number.isFinite(Number(i.lng)))return;
  L.marker([Number(i.lat),Number(i.lng)]).bindPopup(popup(i)).addTo(layer);
 });
 layer.addTo(map); return layer;
}
function setupMap(id, zoom) {
 if(!window.L || !document.getElementById(id))return null;
 const map=L.map(id,{scrollWheelZoom:false}).setView([31.3260,75.5762],zoom);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
 return map;
}
function update(issues) {
 if(!window.L)return;
 if(!dashboardMap)dashboardMap=setupMap("dashboardMap",13);
 if(dashboardMap)dashboardMarkers=addMarkers(dashboardMap,issues,dashboardMarkers);
 if(!fullMap && !document.getElementById("mapView").classList.contains("hidden"))fullMap=setupMap("fullMap",13);
 if(fullMap)fullMarkers=addMarkers(fullMap,issues,fullMarkers);
}
function invalidate() {
 if(!window.L)return;
 if(!fullMap)fullMap=setupMap("fullMap",13);
 setTimeout(()=>{dashboardMap?.invalidateSize();fullMap?.invalidateSize();},100);
}
function showDetailMap(issue) {
 if(!window.L)return;
 if(detailMap){detailMap.remove();detailMap=null;}
 detailMap=setupMap("detailMap",16);
 if(detailMap){
  detailMarker=L.marker([Number(issue.lat)||31.3260,Number(issue.lng)||75.5762]).addTo(detailMap).bindPopup(popup(issue)).openPopup();
 }
}
document.addEventListener("DOMContentLoaded",()=>{
 document.getElementById("locateBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){window.CivicPulse.toast("Geolocation is not supported by this browser.");return;}
  navigator.geolocation.getCurrentPosition(pos=>{
   const p=[pos.coords.latitude,pos.coords.longitude];
   if(!fullMap)fullMap=setupMap("fullMap",15);
   fullMap.setView(p,16);L.marker(p).addTo(fullMap).bindPopup("Your approximate current location").openPopup();
  },()=>window.CivicPulse.toast("Location permission denied or unavailable."),{enableHighAccuracy:false,timeout:8000});
 });
});
window.CivicMaps={update,invalidate,showDetailMap};
})();