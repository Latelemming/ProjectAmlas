var map = L.map('map').setView([7.349, -2.342], 18);

var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
});

var topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
});

osmLayer.addTo(map);

map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });

var userIcon = L.icon({
  iconUrl: 'logo.png',
  iconSize: [48, 30],
  iconAnchor: [20, 20]
});

var userMarker;
var accuracyCircle;
var routeLine;
var destinationMarker;
var selectedCampusName = null;
var currentLayer = 'osm';

function handleLocationFound(e) {
  var radius = e.accuracy;
  var latlng = e.latlng;

  if (userMarker) {
    map.removeLayer(userMarker);
  }
  if (accuracyCircle) {
    map.removeLayer(accuracyCircle);
  }

  userMarker = L.marker(latlng, { icon: userIcon }).addTo(map);
  accuracyCircle = L.circle(latlng, {
    radius: radius / 2,
    color: '#1d4ed8',
    fillColor: '#bfdbfe',
    fillOpacity: 0.2
  }).addTo(map);

  userMarker.bindPopup('You are within ' + radius.toFixed(0) + ' meters.').openPopup();
}

function handleLocationError(e) {
  alert(e.message);
}

map.on('locationfound', handleLocationFound);
map.on('locationerror', handleLocationError);

function locateMe() {
  map.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
}

function fetchRouteGeoJSON(origin, destination) {
  var url = 'https://router.project-osrm.org/route/v1/walking/' + origin.lng + ',' + origin.lat + ';' + destination.lng + ',' + destination.lat + '?overview=full&geometries=geojson&alternatives=true&annotations=distance';
  return fetch(url)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Routing service unavailable');
      }
      return response.json();
    })
    .then(function(data) {
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
      }

      // Choose the shortest route by total distance
      var shortest = data.routes[0];
      for (var i = 1; i < data.routes.length; i++) {
        if (data.routes[i].distance < shortest.distance) {
          shortest = data.routes[i];
        }
      }
      return shortest.geometry;
    });
}

function drawRoute(geojson, destination, label) {
  if (routeLine) {
    map.removeLayer(routeLine);
  }
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }

  destinationMarker = L.marker(destination).addTo(map).bindPopup(label).openPopup();
  routeLine = L.geoJSON(geojson, {
    style: {
      color: '#2563eb',
      weight: 5,
      opacity: 0.9
    }
  }).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [80, 80] });
}

function toggleLayer() {
  if (currentLayer === 'osm') {
    map.removeLayer(osmLayer);
    topoLayer.addTo(map);
    currentLayer = 'topo';
  } else {
    map.removeLayer(topoLayer);
    osmLayer.addTo(map);
    currentLayer = 'osm';
  }
}

var campusLocations = {
  'Library': { coords: [7.3481867776530025, -2.342579924182432], label: 'Library' },
  'Administration': { coords: [7.347962086593319, -2.3421284873502195], label: 'Administration' },
  'Clinic': { coords: [7.348941468435795, -2.3430606740138558], label: 'Clinic' },
  'AppLab': { coords: [7.34948754157491, -2.3403006869084315], label: 'AppLab' },
  'Cafeteria': { coords: [7.349683297445659, -2.3422315416872834], label: 'Cafeteria' },
  'Old Auditorium': { coords: [7.3494425925653335, -2.3427726407394096], label: 'Old Auditorium' },
  'Hall One': { coords: [7.352887598648217, -2.3438245377177602], label: 'Hall One' },
  'Hall Two': { coords: [7.35420868756675, -2.3449557871357487], label: 'Hall Two' },
  'LT Block': { coords: [7.351217194759221, -2.3416951104680175], label: 'LT Block' },
  'LTS Block': { coords: [7.350688637715893, -2.3402968665494113], label: 'LTS Block' },
  'Hospital': { coords: [7.348941468435795, -2.3430606740138558], label: 'Hospital' },
  'Dean of Students Office': { coords: [7.351006308791247, -2.343209298582192], label: 'Dean of Students Office' },
  'RCEES': { coords: [7.351698871147423, -2.340584645233033], label: 'RCEES' }
};

var locationsList = document.getElementById('locations-list');
var locationsPanel = document.getElementById('locations-panel');
var locationsToggleBtn = document.getElementById('locations-panel-toggle');

function setActiveLocation(name) {
  var items = document.querySelectorAll('.location-list-item');
  items.forEach(function(item) {
    item.classList.toggle('active', item.dataset.name === name);
  });
}

function renderLocationList() {
  Object.keys(campusLocations).forEach(function(name) {
    var item = document.createElement('button');
    item.type = 'button';
    item.className = 'location-list-item';
    item.dataset.name = name;
    item.textContent = name;

    item.addEventListener('click', function() {
      selectedCampusName = name;
      searchInput.value = name;
      setActiveLocation(name);
      routeToCampusLocation(name);
      if (userMarker) {
        showDirections();
      }
    });

    locationsList.appendChild(item);
  });
}

function routeToCampusLocation(name) {
  var location = campusLocations[name];
  if (!location) {
    alert('Location not found: ' + name);
    return;
  }

  selectedCampusName = name;
  map.setView(location.coords, 18);
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
  }
  destinationMarker = L.marker(location.coords, { icon: campusIcon }).addTo(map).bindPopup(location.label).openPopup();
}

function showDirections() {
  if (!userMarker) {
    alert('Waiting for your current location...');
    return;
  }

  if (!selectedCampusName) {
    alert('Please select a campus location first.');
    return;
  }

  var location = campusLocations[selectedCampusName];
  var origin = userMarker.getLatLng();
  var destination = L.latLng(location.coords);

  fetchRouteGeoJSON(origin, destination)
    .then(function(geojson) {
      drawRoute(geojson, destination, location.label);
    })
    .catch(function(error) {
      alert('Could not generate a route: ' + error.message);
    });
}

var btnLocation = document.getElementById('btn-location');
var btnDirections = document.getElementById('btn-directions');
var searchInput = document.getElementById('search-input');
var quickButtons = document.querySelectorAll('.quick-btn');

renderLocationList();

locationsToggleBtn.addEventListener('click', function() {
  var isCollapsed = locationsPanel.classList.toggle('collapsed');
  locationsToggleBtn.setAttribute('aria-expanded', String(!isCollapsed));
  locationsToggleBtn.textContent = isCollapsed ? '+' : '−';
});

btnLocation.addEventListener('click', locateMe);
btnDirections.addEventListener('click', showDirections);

quickButtons.forEach(function(button) {
  button.addEventListener('click', function() {
    var name = button.textContent.trim();
    if (campusLocations[name]) {
      selectedCampusName = name;
      setActiveLocation(name);
      routeToCampusLocation(name);
      if (userMarker) {
        showDirections();
      }
    }
  });
});

searchInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    var query = searchInput.value.trim();
    if (query.length === 0) {
      return;
    }
    if (campusLocations[query]) {
      selectedCampusName = query;
      setActiveLocation(query);
      routeToCampusLocation(query);
      if (userMarker) {
        showDirections();
      }
    } else {
      alert('Campus location not found. Try: Library, Administration, Clinic, AppLab, Cafeteria, Old Auditorium, Hall One, Hall Two, LT Block, LTS Block, Hospital.');
    }
  }
});

// initial campus marker
var campusIcon = L.icon({
    iconUrl: 'logo.png',
    iconSize: [48, 30],
    iconAnchor: [22, 30],
    popupAnchor: [0, -30]
});

for (var loc in campusLocations) {
  (function(name) {
    var marker = L.marker(campusLocations[name].coords, { icon: campusIcon }).addTo(map).bindPopup(campusLocations[name].label);
    marker.on('click', function() {
      selectedCampusName = name;
      searchInput.value = name;
      setActiveLocation(name);
      routeToCampusLocation(name);
    });
  })(loc);
}