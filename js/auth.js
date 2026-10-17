(function () {
  const CLIENT_ID = "529390183847-jbcnnpkof69dagpe3lti8tj3k6s9jfji.apps.googleusercontent.com";
  // Despliegue de Apps Script que incluye seguridad.gs (acción leerHoja)
  const BACKEND_URL = "https://script.google.com/macros/s/AKfycbxOjE3Jq5rmOkkeZ67aSUQfeTuaVF3y6G8QTAl1M8_EckB86Ql36ZZ-eZLn6mZFzjRo/exec";
  window.KEEP_BACKEND_URL = BACKEND_URL; // los módulos la usan para hablar con el backend seguro
  const GVIZ = /docs\.google\.com\/spreadsheets\/d\/[^/]+\/gviz\/tq\?.*?sheet=([^&]+)/;

  const fetchOriginal = window.fetch.bind(window);
  let credencial = leerGuardada();
  let esperando = null;

  function leerGuardada() {
    try {
      const c = JSON.parse(localStorage.getItem("keep_cred") || "null");
      if (c && c.exp * 1000 > Date.now() + 60000) return c;
    } catch (e) {}
    return null;
  }
  function valida() { return credencial && credencial.exp * 1000 > Date.now() + 30000; }

  function decodificar(jwt) {
    const b64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  }

  function cargarGSI() {
    if (window.google && google.accounts) return Promise.resolve();
    return new Promise((ok, fallo) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.onload = ok; s.onerror = fallo;
      document.head.appendChild(s);
    });
  }

  // Pantalla de login; las peticiones esperan aquí hasta que inicies sesión
  function pedirSesion() {
    if (esperando) return esperando;
    esperando = new Promise((resolver) => {
      const capa = document.createElement("div");
      capa.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:system-ui,sans-serif;text-align:center;padding:24px";
      capa.innerHTML = '<h2 style="margin:0">KeepAPP</h2><p style="margin:0;color:#666;font-size:14px">Inicia sesión con tu cuenta de Google</p><div id="keep-gbtn"></div>';
      document.body.appendChild(capa);
      cargarGSI().then(() => {
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          auto_select: true,
          callback: (resp) => {
            const p = decodificar(resp.credential);
            credencial = { token: resp.credential, exp: p.exp, email: p.email };
            localStorage.setItem("keep_cred", JSON.stringify(credencial));
            capa.remove(); esperando = null; resolver();
          }
        });
        google.accounts.id.renderButton(document.getElementById("keep-gbtn"), { theme: "outline", size: "large" });
        google.accounts.id.prompt();
      });
    });
    return esperando;
  }

  async function token() {
    if (!valida()) { credencial = null; localStorage.removeItem("keep_cred"); await pedirSesion(); }
    return credencial.token;
  }

  async function leerHojaCSV(hoja, reintento) {
    const t = await token();
    const r = await fetchOriginal(BACKEND_URL + "?action=leerHoja&hoja=" + hoja + "&token=" + encodeURIComponent(t));
    const texto = await r.text();
    if (texto.startsWith('{"status":"auth"')) {
      if (reintento) throw new Error("Sin acceso: " + texto);
      credencial = null; localStorage.removeItem("keep_cred");
      return leerHojaCSV(hoja, true);
    }
    return texto;
  }

  // fetch: lecturas gviz -> backend con sesión; llamadas al Apps Script -> se les agrega el token
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : input.url;
    const m = url.match(GVIZ);
    if (m) return new Response(await leerHojaCSV(m[1]), { status: 200 });

    if (url.startsWith("https://script.google.com/macros/")) {
      const t = await token();
      if (((init && init.method) || "GET").toUpperCase() === "POST") {
        let cuerpo = {};
        try { cuerpo = JSON.parse(init.body); } catch (e) {}
        cuerpo.token = t;
        init = Object.assign({}, init, { body: JSON.stringify(cuerpo) });
      } else {
        input = url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(t);
      }
    }
    return fetchOriginal(input, init);
  };

  // PapaParse con download:true (BBM, Goals, Kato, etc.) -> misma lectura segura
  const parseOriginal = Papa.parse.bind(Papa);
  Papa.parse = function (entrada, config) {
    if (config && config.download && typeof entrada === "string" && GVIZ.test(entrada)) {
      window.fetch(entrada).then(r => r.text())
        .then(texto => parseOriginal(texto, Object.assign({}, config, { download: false })))
        .catch(err => config.error && config.error(err));
      return;
    }
    return parseOriginal(entrada, config);
  };

  token().catch(() => {});
})();
