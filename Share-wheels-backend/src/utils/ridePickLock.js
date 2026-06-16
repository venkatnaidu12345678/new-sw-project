/** Serialize enroute pick operations per ride so picks never overlap. */
const ridePickChains = new Map();

const withRidePickLock = async (rideId, fn) => {
  const key = String(rideId || "").trim();
  if (!key) return fn();

  const previous = ridePickQueuesGet(key);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const chain = previous.then(() => gate);
  ridePickChains.set(key, chain);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (ridePickChains.get(key) === chain) {
      ridePickChains.delete(key);
    }
  }
};

function ridePickQueuesGet(key) {
  return ridePickChains.get(key) || Promise.resolve();
}

module.exports = { withRidePickLock };
