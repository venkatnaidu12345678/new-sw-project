/**
 * Online images via Pexels CDN (hotlink-friendly).
 * Each ID verified to match its use (vehicle type, map/GPS, delivery, etc.).
 * Logo only: /public/logo-mark.png
 */
const pex = (id, w = 1200) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&dpr=1`;

export const IMAGES = {
  /* Cars */
  heroCar: pex(170811, 1400), // blue sedan
  whiteCar: pex(116675, 800), // white SUV
  carInterior: pex(1149137, 1000), // person driving, cabin view
  steeringWheel: pex(10881293, 900), // auto-rickshaw driver with phone
  trafficAerial: pex(109581, 1200), // aerial highway traffic
  highway: pex(1878922, 1200),
  electricCar: pex(13696383, 1000),
  urbanCommute: pex(1719648, 1200),
  heroCity: pex(32725133, 1400), // city at night, traffic lights

  /* Bike & auto */
  bikeRide: pex(27856093, 1200), // motorcycle on road
  autoRide: pex(24778732, 1200), // green auto-rickshaw, India
  scooterRide: pex(4393240, 1200), // scooter rider with phone nav
  streetMixed: pex(35317059, 1400), // street with motorcycles & rickshaws

  /* Live tracking / GPS / maps */
  mapLiveWide: pex(30403062, 1800), // hand holding phone with GPS map
  mapPhone: pex(30403062, 1200),
  mapNavigation: pex(13015904, 1400), // map on bike handlebar mount
  mapRoute: pex(35317059, 1400), // mixed traffic route scene
  mapCityNight: pex(32725133, 1600), // aerial night city traffic
  mapTracking: pex(30403062, 1400),
  mapApp: pex(4393240, 1200), // scooter + phone navigation
  mapAerial: pex(109581, 1600),
  mapPins: pex(30403062, 900),
  navigation: pex(30403062, 900),

  /* Courier & app */
  smartphone: pex(3183150, 800),
  delivery: pex(686333, 900), // cardboard delivery boxes
  packages: pex(6373474, 900), // parcel / package stack

  /* People & community */
  community: pex(3184291, 900),
  friendsRide: pex(1118448, 900),
  avatar1: pex(774909, 200),
  avatar2: pex(1222271, 200),
  avatar3: pex(1239291, 200),
  avatar4: pex(1681010, 200),
  driverPortrait: pex(1222271, 600),
  passengerHappy: pex(774909, 800),
  nightDrive: pex(36828821, 1200), // night highway light trails
};

/** Matches app vehicle types: bike, auto, car */
export const VEHICLE_TYPES = [
  {
    id: "car",
    label: "Car",
    tagline: "Carpool & shared rides",
    desc: "Publish your daily commute with 2–4 seats. Passengers book by segment and track you live on the map.",
    image: IMAGES.heroCar,
    seats: "Up to 4 seats",
    accent: "from-blue-500 to-indigo-600",
    border: "border-blue-400/30",
  },
  {
    id: "auto",
    label: "Auto",
    tagline: "Shared auto-rickshaw",
    desc: "Auto drivers list routes with open seats. Ideal for short city hops — same live GPS and split fares.",
    image: IMAGES.autoRide,
    seats: "Up to 3 seats",
    accent: "from-amber-500 to-orange-600",
    border: "border-amber-400/30",
  },
  {
    id: "bike",
    label: "Bike",
    tagline: "Solo or pillion",
    desc: "Motorcycle and scooter rides for one passenger. Quick Reserve or request a seat on your route.",
    image: IMAGES.bikeRide,
    seats: "1 passenger",
    accent: "from-emerald-500 to-teal-600",
    border: "border-emerald-400/30",
  },
];

export const MAP_GALLERY = [
  { src: IMAGES.mapLiveWide, title: "Live GPS map", caption: "Track car, auto, or bike rides in real time" },
  { src: IMAGES.mapNavigation, title: "Navigation on bike", caption: "Map mounted on handlebars while riding" },
  { src: IMAGES.mapApp, title: "Scooter navigation", caption: "Drivers use phone GPS on every vehicle type" },
  { src: IMAGES.mapRoute, title: "City routes", caption: "Cars, autos, and bikes on shared roads" },
];

export const GALLERY = [
  { src: IMAGES.heroCar, title: "Car rides", caption: "Carpool with split fares on daily routes" },
  { src: IMAGES.autoRide, title: "Auto rides", caption: "Shared auto-rickshaw trips across the city" },
  { src: IMAGES.bikeRide, title: "Bike rides", caption: "Motorcycle & scooter seats for quick hops" },
  { src: IMAGES.mapLiveWide, title: "Live tracking", caption: "GPS map from pickup to drop — any vehicle" },
  { src: IMAGES.delivery, title: "Courier rides", caption: "Parcels on shared trips" },
  { src: IMAGES.streetMixed, title: "Mixed traffic", caption: "Car, auto & bike on the same routes" },
];

export const TRACKING_FEATURES = [
  { title: "Real-time driver GPS", desc: "Location refreshes for car, auto, and bike rides while the trip is active." },
  { title: "ETA & route line", desc: "See estimated arrival and the path from pickup to your drop point." },
  { title: "Shared for all roles", desc: "Drivers, passengers, and courier senders view the same live map." },
  { title: "Status updates", desc: "Started, en route, dropped, and delivered — synced instantly." },
];
