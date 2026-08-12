(function () {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;

  const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

  function register(url) {
    navigator.serviceWorker.register(url, { updateViaCache: "none" }).catch(() => {});
  }

  function registerLatest() {
    fetch(`version.json?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("version"))))
      .then((payload) => {
        if (payload && VERSION_PATTERN.test(payload.version)) {
          register(`sw.js?v=${encodeURIComponent(payload.version)}`);
        } else {
          register("sw.js");
        }
      })
      .catch(() => register("sw.js"));
  }

  setTimeout(() => {
    navigator.serviceWorker.getRegistration()
      .then((registration) => {
        if (!registration) registerLatest();
      })
      .catch(registerLatest);
  }, 2000);
})();
