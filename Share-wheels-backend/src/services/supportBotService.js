const {
  buildFullUserSnapshot,
  searchUserAndPlatformData,
} = require("./supportDataRepository");

const INTENTS = {
  GREETING: "greeting",
  SUMMARY: "summary",
  UPCOMING: "upcoming",
  HISTORY: "history",
  SEARCH: "search",
  ROUTE: "route",
  PLATFORM: "platform",
  CREATE_RIDE: "create_ride",
  PASSENGER: "passenger",
  COURIER: "courier",
  CANCEL: "cancel",
  PAYMENT: "payment",
  DRIVER: "driver",
  VEHICLE: "vehicle",
  OTP: "otp",
  ACCOUNT: "account",
  REQUESTS: "requests",
  DRIVER_INBOX: "driver_inbox",
  HELP: "help",
};

const plain = (s) => String(s).replace(/\*\*/g, "");

const detectIntent = (text = "") => {
  const t = text.toLowerCase();
  if (/^(hi|hello|hey)\b/.test(t)) return INTENTS.GREETING;
  if (/summary|overview|everything|my data|account status|full report|all my/.test(t))
    return INTENTS.SUMMARY;
  if (/upcoming|my ride|scheduled|today.*ride/.test(t)) return INTENTS.UPCOMING;
  if (/history|past|completed|previous/.test(t)) return INTENTS.HISTORY;
  if (/platform|how many ride|rides available|open ride|today.*available/.test(t))
    return INTENTS.PLATFORM;
  if (/search|find ride|book ride|available ride/.test(t)) return INTENTS.SEARCH;
  if (/offer|create ride|host|publish ride|drive/.test(t)) return INTENTS.CREATE_RIDE;
  if (/passenger request|need a ride|post request/.test(t)) return INTENTS.PASSENGER;
  if (/passenger|seat|join ride|request seat/.test(t)) return INTENTS.PASSENGER;
  if (/courier|parcel|deliver|package/.test(t)) return INTENTS.COURIER;
  if (/cancel/.test(t)) return INTENTS.CANCEL;
  if (/payment|pay|money|refund|amount|₹|rs/.test(t)) return INTENTS.PAYMENT;
  if (/driver|not responding|late|pickup/.test(t)) return INTENTS.DRIVER;
  if (/passenger.*request|someone request|pending.*passenger|accept passenger/.test(t))
    return INTENTS.DRIVER_INBOX;
  if (/vehicle|car|license|registration/.test(t)) return INTENTS.VEHICLE;
  if (/otp|code|verify|login/.test(t)) return INTENTS.OTP;
  if (/account|profile|terms|name|email|phone/.test(t)) return INTENTS.ACCOUNT;
  if (/my request|pending request|status/.test(t)) return INTENTS.REQUESTS;
  if (/\b(hyderabad|vijayawada|warangal|bangalore|chennai|guntur|visakhapatnam|tirupati)\b/.test(t))
    return INTENTS.ROUTE;
  return INTENTS.HELP;
};

const formatRideLine = (r) =>
  `• ${r.from} → ${r.to} (${r.role}) — ${r.status}, ${r.startTime || "—"}, ₹${r.amount || 0}`;

const defaultSuggestions = (snap) => {
  const chips = ["Full account summary", "My upcoming rides", "My requests"];
  if (!snap.profile.hasVehicle) chips.push("Add vehicle");
  else chips.push("Offer a ride");
  chips.push("Rides available today", "Courier help");
  return chips.slice(0, 6);
};

const buildSummaryReply = (snap) => {
  const c = snap.counts;
  let text = `Account summary for ${snap.profile.name}:\n`;
  text += `\nProfile: ${snap.profile.mobile} | Terms: ${snap.profile.termsAccepted ? "accepted" : "pending"} | Vehicle: ${snap.profile.hasVehicle ? "yes" : "no"}`;
  text += `\n\nRides: ${c.ridesAsDriver} as driver, ${c.ridesAsPassenger} as passenger, ${c.ridesAsCourier} as courier`;
  text += `\nActive: ${c.upcomingRides} upcoming | ${c.historyRides} completed/cancelled`;
  text += `\nRequests: ${c.passengerRequestsOpen} passenger + ${c.courierRequestsOpen} courier open`;
  if (snap.profile.hasVehicle) {
    text += `\nDriver inbox: ${c.pendingPassengerOnMyDrives} passenger seat requests, ${c.pendingCourierOnMyDrives} courier requests on your rides`;
  }
  text += `\nYour bookings: ${c.myPendingSeatRequests} pending seat requests on others' rides`;
  text += `\n\nPlatform today: ${snap.platform.openRidesToday} open rides, ${snap.platform.openPassengerRequests} passenger requests, ${snap.platform.openCourierRequests} courier jobs`;
  return text;
};

const replyForIntent = (intent, message, snap) => {
  const c = snap.counts;
  const p = snap.profile;

  switch (intent) {
    case INTENTS.GREETING:
      return {
        reply: plain(
          `Hi ${p.name}! I've loaded your full Share Wheels data: ${c.upcomingRides} upcoming ride(s), ${c.passengerRequestsOpen + c.courierRequestsOpen} open request(s), and ${snap.platform.openRidesToday} rides available on the platform today.`
        ),
        suggestions: defaultSuggestions(snap),
      };

    case INTENTS.SUMMARY:
      return {
        reply: plain(buildSummaryReply(snap)),
        suggestions: ["My upcoming rides", "Driver inbox", "Platform stats"],
      };

    case INTENTS.PLATFORM: {
      let text = `Platform snapshot:\n• ${snap.platform.openRidesToday} rides open today\n• ${snap.platform.totalPendingRides} active rides total\n• ${snap.platform.openPassengerRequests} passenger requests waiting\n• ${snap.platform.openCourierRequests} courier jobs open\n• ${snap.platform.verifiedUsers} verified users`;
      if (snap.platform.popularRoutesToday.length) {
        text += "\n\nPopular routes today:";
        snap.platform.popularRoutesToday.forEach((r) => {
          text += `\n• ${r.from} → ${r.to} (${r.count} ride(s))`;
        });
      }
      return {
        reply: plain(text),
        suggestions: ["Find a ride", "My upcoming rides", "Need a ride"],
      };
    }

    case INTENTS.UPCOMING:
      if (!snap.upcoming.length) {
        return {
          reply: "No upcoming rides in your database records. Search on Dashboard or create a passenger/courier request.",
          suggestions: ["Find a ride", "Platform stats", "Full account summary"],
        };
      }
      return {
        reply: plain(
          `Upcoming (${snap.upcoming.length}):\n${snap.upcoming.map(formatRideLine).join("\n")}`
        ),
        suggestions: ["Ride cancelled?", "Payment question", "Full account summary"],
      };

    case INTENTS.HISTORY:
      if (!snap.history.length) {
        return {
          reply: "No completed or cancelled rides found in your history yet.",
          suggestions: ["My upcoming rides", "Find a ride"],
        };
      }
      return {
        reply: plain(
          `Recent history (${snap.history.length} shown):\n${snap.history.map(formatRideLine).join("\n")}`
        ),
        suggestions: ["My upcoming rides", "Payment question"],
      };

    case INTENTS.ROUTE: {
      const matches = searchUserAndPlatformData(snap, message);
      if (!matches.length) {
        return {
          reply: `No rides or requests matching "${message}" in your data or today's platform routes. Try Search on Dashboard with that city.`,
          suggestions: ["Platform stats", "Find a ride"],
        };
      }
      let text = `Found ${matches.length} match(es) for your query:\n`;
      matches.forEach((m) => {
        if (m.type === "ride") text += `\n• Ride: ${m.from} → ${m.to} (${m.status}, ${m.role})`;
        else if (m.type === "passengerRequest") text += `\n• Passenger request: ${m.from} → ${m.to} (${m.status})`;
        else if (m.type === "courierRequest") text += `\n• Courier: ${m.from} → ${m.to} (${m.status})`;
        else text += `\n• Platform route: ${m.from} → ${m.to} (${m.count} today)`;
      });
      return { reply: plain(text), suggestions: ["Find a ride", "My upcoming rides"] };
    }

    case INTENTS.REQUESTS: {
      const total = c.passengerRequestsOpen + c.courierRequestsOpen;
      if (!total) {
        return {
          reply: "No open passenger or courier requests in your records.",
          suggestions: ["Need a ride", "Send courier", "Find a ride"],
        };
      }
      let text = `Open requests — Passenger: ${c.passengerRequestsOpen}, Courier: ${c.courierRequestsOpen}\n`;
      snap.passengerRequests
        .filter((x) => x.status === "pending" || x.status === "aisgned_passenger")
        .slice(0, 5)
        .forEach((x) => {
          text += `\n🧳 ${x.from} → ${x.to} | ${x.seats} seats | ${x.status}`;
        });
      snap.courierRequests
        .filter((x) => ["pending", "request_to_driver", "driver_assigned"].includes(x.status))
        .slice(0, 5)
        .forEach((x) => {
          text += `\n📦 ${x.from} → ${x.to} | ${x.parcel} | ${x.status}`;
        });
      return { reply: plain(text), suggestions: ["Full account summary", "Find a ride"] };
    }

    case INTENTS.DRIVER_INBOX:
      if (!p.hasVehicle) {
        return {
          reply: "Add a vehicle in Profile to receive passenger and courier requests on your rides.",
          suggestions: ["Add vehicle", "Find a ride"],
        };
      }
      if (!c.pendingPassengerOnMyDrives && !c.pendingCourierOnMyDrives) {
        return {
          reply: "No pending passenger or courier requests on your hosted rides right now.",
          suggestions: ["My upcoming rides", "Offer a ride"],
        };
      }
      let text = `On your drives:\n`;
      snap.pendingPassengerOnMyRides.forEach((x) => {
        text += `\n🧳 ${x.route} — ${x.seats} seat(s), ₹${x.amount || 0}`;
      });
      snap.pendingCourierOnMyRides.forEach((x) => {
        text += `\n📦 ${x.route} — ${x.parcel}, ₹${x.amount || 0}`;
      });
      return {
        reply: plain(text),
        suggestions: ["My upcoming rides", "Start ride"],
      };

    case INTENTS.SEARCH:
      return {
        reply: plain(
          `Search Dashboard with From/To/Date. Right now there are ${snap.platform.openRidesToday} rides open today. ${snap.platform.popularRoutesToday[0] ? `Top route: ${snap.platform.popularRoutesToday[0].from} → ${snap.platform.popularRoutesToday[0].to}.` : ""}`
        ),
        suggestions: ["My upcoming rides", "Platform stats"],
      };

    case INTENTS.CREATE_RIDE:
      if (!p.hasVehicle) {
        return {
          reply: "Add vehicle in Profile first (company, model, license, car number), then Create Ride.",
          suggestions: ["Add vehicle", "Full account summary"],
        };
      }
      return {
        reply: `You have ${c.ridesAsDriver} ride(s) as driver in the system. Create Ride to add another — set route, date, time, seats, and price.`,
        suggestions: ["Driver inbox", "My upcoming rides"],
      };

    case INTENTS.PASSENGER:
      return {
        reply: plain(
          `Passenger data: ${c.ridesAsPassenger} ride(s) joined, ${c.passengerRequestsOpen} open request(s), ${c.myPendingSeatRequests} pending seat request(s) on others' rides. Search rides or post Need a Ride.`
        ),
        suggestions: ["Find a ride", "My requests", "Full account summary"],
      };

    case INTENTS.COURIER:
      return {
        reply: plain(
          `Courier data: ${c.ridesAsCourier} delivery ride(s), ${c.courierRequestsOpen} open courier job(s). Standalone courier needs receiver details + parcel photo.`
        ),
        suggestions: ["My courier requests", "Find a ride"],
      };

    case INTENTS.CANCEL:
      return {
        reply: "Drivers cancel at least 1 hour before start. Your cancelled rides appear in history.",
        suggestions: c.upcomingRides ? ["My upcoming rides"] : ["Find a ride"],
        escalate: true,
      };

    case INTENTS.PAYMENT:
      return {
        reply: plain(
          `Payments: seat price × seats on rides. Your records show ${c.upcomingRides} upcoming with amounts in ride details. Pay driver directly as arranged.`
        ),
        suggestions: ["My upcoming rides", "Full account summary"],
        escalate: true,
      };

    case INTENTS.DRIVER:
      return {
        reply: "Check Upcoming for ride status. If driver unresponsive, search same route or check my pending seat requests.",
        suggestions: ["My upcoming rides", "Full account summary"],
        escalate: true,
      };

    case INTENTS.VEHICLE:
      return {
        reply: p.hasVehicle
          ? plain(
              `Vehicle on file: ${p.vehicle.company} ${p.vehicle.model} (${p.vehicle.carNo}). ${c.ridesAsDriver} rides hosted.`
            )
          : "No vehicle in database. Add under Profile before offering rides.",
        suggestions: p.hasVehicle ? ["Offer a ride", "Driver inbox"] : ["Add vehicle"],
      };

    case INTENTS.OTP:
      return {
        reply: "OTP is 6 digits, expires in 5 minutes. Re-login to request a new code.",
        suggestions: ["Account help"],
      };

    case INTENTS.ACCOUNT:
      return {
        reply: plain(
          `Account: ${p.name}, ${p.email}, +91 ${p.mobile}. Verified: ${p.verified ? "yes" : "no"}. Terms: ${p.termsAccepted ? "accepted" : "not accepted"}. Member since ${new Date(p.memberSince).toLocaleDateString()}.`
        ),
        suggestions: ["Full account summary", "Vehicle info"],
      };

    default: {
      const matches = searchUserAndPlatformData(snap, message);
      if (matches.length) {
        return replyForIntent(INTENTS.ROUTE, message, snap);
      }
      return {
        reply: plain(
          `I searched your full database profile (${c.ridesAsDriver + c.ridesAsPassenger + c.ridesAsCourier} total ride links) and couldn't match "${message.slice(0, 60)}". Try "full account summary" or a city name.`
        ),
        suggestions: defaultSuggestions(snap),
      };
    }
  }
};

const getContext = async (user) => {
  const snap = await buildFullUserSnapshot(user._id);
  if (!snap) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  return {
    status: 200,
    body: {
      success: true,
      greeting: plain(
        `Hi ${snap.profile.name}! Loaded your complete data: ${snap.counts.upcomingRides} upcoming, ${snap.counts.passengerRequestsOpen + snap.counts.courierRequestsOpen} open requests, ${snap.platform.openRidesToday} rides on platform today.`
      ),
      suggestions: defaultSuggestions(snap),
      context: {
        ...snap.counts,
        hasVehicle: snap.profile.hasVehicle,
        platformOpenToday: snap.platform.openRidesToday,
      },
    },
  };
};

const chat = async (user, { message, history = [] }) => {
  if (!message || !String(message).trim()) {
    return { status: 400, body: { success: false, message: "message is required" } };
  }

  const snap = await buildFullUserSnapshot(user._id);
  if (!snap) {
    return { status: 404, body: { success: false, message: "User not found" } };
  }

  let intent = detectIntent(message);

  const lastUserMsgs = history.filter((h) => h.role === "user").slice(-2);
  if (lastUserMsgs.length && intent === INTENTS.HELP) {
    const combined = `${lastUserMsgs.map((m) => m.text).join(" ")} ${message}`.toLowerCase();
    const retry = detectIntent(combined);
    if (retry !== INTENTS.HELP) intent = retry;
  }

  const response = replyForIntent(intent, message, snap);

  return {
    status: 200,
    body: {
      success: true,
      intent,
      reply: plain(response.reply),
      suggestions: response.suggestions || defaultSuggestions(snap),
      escalate: response.escalate || false,
      dataLoaded: snap.counts,
      timestamp: new Date().toISOString(),
    },
  };
};

module.exports = { getContext, chat, detectIntent };
