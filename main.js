/* global Vue mapboxgl */

import seen from "./seen.js";

mapboxgl.accessToken =
  "pk.eyJ1IjoiY2FyZGVybmUiLCJhIjoiY2puMXN5cnBtNG53NDN2bnhlZ3h4b3RqcCJ9.eNjrtezXwvM7Ho1VSxo06w";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [-1.238, 51.741],
  zoom: 13,
  minZoom:13,
  maxZoom: 17,
  //hash: "loc",
});

const h3Level = 10;
const chosen = seen;

const getHexes = () => {
  const {_sw, _ne} = map.getBounds();
  const win = [
    [_sw.lng, _sw.lat],
    [_sw.lng, _ne.lat],
    [_ne.lng, _ne.lat],
    [_ne.lng, _sw.lat],
  ];

  const hexs = h3.polyfill(win, h3Level, true);
  const fc = {
    type: "FeatureCollection",
    features: hexs.map((h, i) => (
      {
        type: "Feature",
        id: i,
        properties: {index: h},
        geometry: {
          type: "Polygon",
          coordinates: [h3.h3ToGeoBoundary(h, true)],
        }
      }
    ))
  };
  return fc;
};

const hoverColor = "hsla(300, 50%, 50%, 0.6)";
const chosenColor = "hsla(0, 50%, 50%, 0.3)";

const hexColor = (c) => (
  [
    "case",
    [
      "in",
      ["get", "index"],
      ["literal", c]
    ],
    [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      hoverColor,
      chosenColor,
    ],
    [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      hoverColor,
      "hsla(0, 0%, 0%, 0)"
    ]
  ]
);

map.on("load", () => {
  map.addSource("hex", {
    type: "geojson",
    data: getHexes(),
  });

  map.addLayer({
    id: "hex",
    type: "fill",
    source: "hex",
    paint: {
      'fill-color': hexColor(chosen),
      'fill-outline-color': 'rgba(0,0,0,0)',
    }
  });

  let hoveredStateId = null;
  map.on('mousemove', 'hex', (e) => {
    if (e.features.length > 0) {
      if (hoveredStateId !== null) {
        map.setFeatureState(
          { source: 'hex', id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = e.features[0].id;
      map.setFeatureState(
        { source: 'hex', id: hoveredStateId },
        { hover: true }
      );
    }
  });

  map.on("mouseenter", "hex", () => map.getCanvas().style.cursor = "pointer");

  map.on('mouseleave', 'hex', () => {
    map.getCanvas().style.cursor = "";
    if (hoveredStateId !== null) {
      map.setFeatureState(
        { source: 'hex', id: hoveredStateId },
        { hover: false }
      );
    }
    hoveredStateId = null;
  });

  map.on("click", "hex", (e) => {
    chosen.push(e.features[0].properties.index);
    map.setPaintProperty("hex", "fill-color", hexColor(chosen));
  });

  map.on("moveend", () => {
    map.getSource("hex").setData(getHexes());
  });
});
