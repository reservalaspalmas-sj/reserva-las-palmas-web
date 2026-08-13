(function () {
  "use strict";

  // Reserve boundary polygon, extracted from Media/RLP.kmz (outerBoundaryIs > LinearRing > coordinates).
  var RESERVE_BOUNDARY = [
    [4.513857, -73.644968], [4.515477, -73.645823], [4.514898, -73.648922],
    [4.512060, -73.647889], [4.510046, -73.648270], [4.509729, -73.648311],
    [4.509433, -73.648120], [4.508958, -73.648297], [4.508228, -73.647888],
    [4.507795, -73.647936], [4.506754, -73.648092], [4.506592, -73.647448],
    [4.506160, -73.646511], [4.506699, -73.646377], [4.507103, -73.646403],
    [4.507644, -73.646184], [4.508304, -73.645496], [4.508828, -73.645111],
    [4.509380, -73.645099], [4.509496, -73.645133], [4.509871, -73.645131],
    [4.510297, -73.645111], [4.510594, -73.645106], [4.510699, -73.644916],
    [4.511183, -73.644630], [4.511224, -73.644610], [4.512040, -73.644076],
    [4.513671, -73.644949], [4.513857, -73.644968]
  ];

  function initReserveMap() {
    var el = document.getElementById("reserve-map");
    if (!el || typeof L === "undefined") return;

    var map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: true
    });

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      }
    ).addTo(map);

    var polygon = L.polygon(RESERVE_BOUNDARY, {
      color: "#E7AC3B",
      weight: 3,
      fillColor: "#E7AC3B",
      fillOpacity: 0.18
    }).addTo(map);

    var lang = document.documentElement.getAttribute("lang") === "en" ? "en" : "es";
    var label = lang === "en" ? "Reserva Las Palmas boundary" : "Límite de Reserva Las Palmas";
    polygon.bindTooltip(label, { sticky: true });

    map.fitBounds(polygon.getBounds(), { padding: [24, 24] });

    // Scroll-wheel zoom is disabled by default so page-scroll isn't hijacked;
    // re-enable it once the visitor deliberately interacts with the map.
    map.on("focus", function () { map.scrollWheelZoom.enable(); });
    map.on("blur", function () { map.scrollWheelZoom.disable(); });
    el.addEventListener("click", function () { map.scrollWheelZoom.enable(); });

    initOverlayLayers(map);
  }

  // ---------------------------------------------------------------------
  // Optional overlays: management-plan zoning, access route, PNN Chingaza.
  // Each is fetched on first toggle-on (kept off the initial map/network
  // load) and cached afterward. The base map, boundary polygon and pin
  // marker above are untouched by any of this.
  // ---------------------------------------------------------------------

  var ZONE_STYLES = {
    "Conservacion":   { color: "#33a02c", es: "Área de Conservación", en: "Conservation Area", ha: 17.2 },
    "Restauracion":   { color: "#b2df8a", es: "Área de Restauración", en: "Restoration Area", ha: 6.8 },
    "Amortiguacion":  { color: "#a6cee3", es: "Amortiguación", en: "Buffer Zone", ha: 3.7 },
    "Agrosistema":    { color: "#ffff99", es: "Agrosistemas", en: "Agrosystems", ha: 3.7 },
    "No reserva":     { color: "#fb9a99", es: "No Reserva", en: "Non-reserve", ha: 0.9 },
    "Infraestructura":{ color: "#e31a1c", es: "Infraestructura", en: "Infrastructure", ha: 0.2 }
  };

  function currentLang() {
    return document.documentElement.getAttribute("lang") === "en" ? "en" : "es";
  }

  function fetchGeoJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  // Fetches every url in `urls` and merges their features into one
  // FeatureCollection, so a single overlay (e.g. "ruta") can be built
  // from more than one source file.
  function fetchMergedGeoJSON(urls) {
    return Promise.all(urls.map(fetchGeoJSON)).then(function (collections) {
      var features = [];
      collections.forEach(function (fc) {
        features = features.concat(fc.features || []);
      });
      return { type: "FeatureCollection", features: features };
    });
  }

  function buildPlanManejoLayer(data) {
    return L.geoJSON(data, {
      style: function (feature) {
        var zone = ZONE_STYLES[feature.properties.Zonifica];
        var color = zone ? zone.color : "#cccccc";
        return { color: color, weight: 1, fillColor: color, fillOpacity: 0.55 };
      },
      onEachFeature: function (feature, layer) {
        var zone = ZONE_STYLES[feature.properties.Zonifica];
        if (!zone) return;
        layer.bindTooltip(function () {
          var lang = currentLang();
          return (lang === "en" ? zone.en : zone.es) + " — " + zone.ha.toLocaleString(lang === "en" ? "en-US" : "es-CO") + " ha";
        }, { sticky: true });
        layer.bindPopup(function () {
          var lang = currentLang();
          return (lang === "en" ? zone.en : zone.es) + " — " + zone.ha.toLocaleString(lang === "en" ? "en-US" : "es-CO") + " ha";
        });
      }
    });
  }

  // Ruta de acceso, sourced from Ruta_Sj-LasPalmas3.json — a single file
  // whose "Descript" property distinguishes two categories, both #ff7f00:
  // "Carretera" (road) = solid; "Camino" (trail) = dotted.
  var ROUTE_STYLES = {
    "Carretera": { dashArray: null,   lineWeight: 4, es: "Carretera", en: "Road" },
    "Camino":    { dashArray: "1 10", lineWeight: 6, es: "Camino", en: "Trail" }
  };

  function buildRutaLayer(data) {
    return L.geoJSON(data, {
      style: function (feature) {
        var route = ROUTE_STYLES[feature.properties.Descript];
        return {
          color: "#ff7f00",
          weight: route ? route.lineWeight : 4,
          opacity: 0.95,
          dashArray: route ? route.dashArray : null,
          lineCap: "round"
        };
      },
      onEachFeature: function (feature, layer) {
        var route = ROUTE_STYLES[feature.properties.Descript];
        layer.bindTooltip(function () {
          var lang = currentLang();
          var label = route ? (lang === "en" ? route.en : route.es) : (feature.properties.Descript || "");
          return lang === "en" ? "Access route (" + label + "): San Juanito → Reserva Las Palmas" : "Ruta de acceso (" + label + "): San Juanito → Reserva Las Palmas";
        }, { sticky: true });
        layer.bindPopup(function () {
          var lang = currentLang();
          var label = route ? (lang === "en" ? route.en : route.es) : (feature.properties.Descript || "");
          return lang === "en" ? "Access route (" + label + "): San Juanito → Reserva Las Palmas" : "Ruta de acceso (" + label + "): San Juanito → Reserva Las Palmas";
        });
      }
    });
  }

  function buildChingazaLayer(data) {
    return L.geoJSON(data, {
      style: {
        color: "#5c8a2e",
        weight: 2,
        fillColor: "#a6d854",
        fillOpacity: 0.4
      },
      onEachFeature: function (feature, layer) {
        layer.bindTooltip(function () {
          return currentLang() === "en" ? "Chingaza National Natural Park" : "Parque Nacional Natural Chingaza";
        }, { sticky: true });
        layer.bindPopup(function () {
          return currentLang() === "en" ? "Chingaza National Natural Park" : "Parque Nacional Natural Chingaza";
        });
      }
    });
  }

  var OVERLAY_DEFS = [
    { id: "plan", urls: ["assets/data/plan-manejo.geojson"], build: buildPlanManejoLayer, es: "Plan de manejo", en: "Management plan" },
    { id: "ruta", urls: ["assets/data/ruta-carretera.geojson"], build: buildRutaLayer, es: "Ruta de acceso", en: "Access route" },
    { id: "chingaza", urls: ["assets/data/pnn-chingaza.geojson"], build: buildChingazaLayer, es: "PNN Chingaza", en: "Chingaza Nat. Park" }
  ];

  var ZONE_ORDER = ["Conservacion", "Restauracion", "Amortiguacion", "Agrosistema", "No reserva", "Infraestructura"];
  var ROUTE_ORDER = ["Carretera", "Camino"];

  // Generic bottom-left legend control. `items` is an array of
  // { swatch: "<html>", es, en }. Several of these can be added — Leaflet
  // stacks same-position controls automatically, so the plan and route
  // legends never overlap even when both are visible at once.
  function buildLegendControl(titleEs, titleEn, items) {
    var legendEl = document.createElement("div");
    legendEl.className = "map-legend";
    legendEl.hidden = true;

    var title = document.createElement("div");
    title.className = "map-legend-title";
    title.innerHTML = '<span data-lang="es">' + titleEs + '</span><span data-lang="en" hidden>' + titleEn + "</span>";
    legendEl.appendChild(title);

    var list = document.createElement("ul");
    list.className = "map-legend-list";
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.innerHTML =
        item.swatch +
        '<span><span data-lang="es">' + item.es + '</span><span data-lang="en" hidden>' + item.en + "</span></span>";
      list.appendChild(li);
    });
    legendEl.appendChild(list);

    var control = L.control({ position: "bottomleft" });
    control.onAdd = function () {
      L.DomEvent.disableClickPropagation(legendEl);
      L.DomEvent.disableScrollPropagation(legendEl);
      return legendEl;
    };

    return { control: control, el: legendEl };
  }

  function buildPlanLegend() {
    var items = ZONE_ORDER.map(function (key) {
      var zone = ZONE_STYLES[key];
      return { swatch: '<i class="map-legend-swatch" style="background:' + zone.color + '"></i>', es: zone.es, en: zone.en };
    });
    return buildLegendControl("Plan de manejo", "Management plan", items);
  }

  function buildRutaLegend() {
    var items = ROUTE_ORDER.map(function (key) {
      var route = ROUTE_STYLES[key];
      var lineClass = route.dashArray ? "map-legend-line-dotted" : "map-legend-line-solid";
      return { swatch: '<i class="map-legend-line ' + lineClass + '"></i>', es: route.es, en: route.en };
    });
    return buildLegendControl("Ruta de acceso", "Access route", items);
  }

  function initOverlayLayers(map) {
    var legends = { plan: buildPlanLegend(), ruta: buildRutaLegend() };
    legends.plan.control.addTo(map);
    legends.ruta.control.addTo(map);

    var panelEl = document.createElement("div");
    panelEl.className = "map-layers";
    panelEl.innerHTML =
      '<button type="button" class="map-layers-toggle" aria-expanded="false">' +
        '<span data-lang="es">Capas</span><span data-lang="en" hidden>Layers</span>' +
      "</button>" +
      '<div class="map-layers-panel" hidden></div>';

    var panelList = panelEl.querySelector(".map-layers-panel");

    OVERLAY_DEFS.forEach(function (def) {
      var row = document.createElement("label");
      row.className = "map-layers-row";
      row.innerHTML =
        '<input type="checkbox" data-layer-id="' + def.id + '">' +
        '<span class="map-layers-row-text"><span data-lang="es">' + def.es + "</span><span data-lang=\"en\" hidden>" + def.en + "</span></span>" +
        '<span class="map-layers-row-status"></span>';
      panelList.appendChild(row);

      var checkbox = row.querySelector("input");
      var statusEl = row.querySelector(".map-layers-row-status");
      var layer = null;

      var legend = legends[def.id];

      checkbox.addEventListener("change", function () {
        if (!checkbox.checked) {
          if (layer) map.removeLayer(layer);
          if (legend) legend.el.hidden = true;
          return;
        }
        if (layer) {
          map.addLayer(layer);
          if (legend) legend.el.hidden = false;
          return;
        }
        checkbox.disabled = true;
        statusEl.textContent = currentLang() === "en" ? "Loading…" : "Cargando…";
        fetchMergedGeoJSON(def.urls)
          .then(function (data) {
            layer = def.build(data);
            layer.addTo(map);
            checkbox.disabled = false;
            statusEl.textContent = "";
            if (legend) legend.el.hidden = false;
          })
          .catch(function (err) {
            checkbox.disabled = false;
            checkbox.checked = false;
            statusEl.textContent = currentLang() === "en" ? "Failed to load" : "No se pudo cargar";
            console.error("Failed to load overlay " + def.id, err);
          });
      });
    });

    var toggleBtn = panelEl.querySelector(".map-layers-toggle");
    toggleBtn.addEventListener("click", function () {
      var isOpen = panelList.hasAttribute("hidden") === false;
      if (isOpen) {
        panelList.setAttribute("hidden", "");
        toggleBtn.setAttribute("aria-expanded", "false");
      } else {
        panelList.removeAttribute("hidden");
        toggleBtn.setAttribute("aria-expanded", "true");
      }
    });

    var control = L.control({ position: "topright" });
    control.onAdd = function () {
      L.DomEvent.disableClickPropagation(panelEl);
      L.DomEvent.disableScrollPropagation(panelEl);
      return panelEl;
    };
    control.addTo(map);
  }

  document.addEventListener("DOMContentLoaded", initReserveMap);
})();
