function parseCookies(rawCookie, domain = ".facebook.com") {
  return rawCookie
    .split(";")
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .map(cookie => {
      const [name, ...rest] = cookie.split("=");
      return {
        name: name.trim(),
        value: rest.join("=").trim(),
        domain,
      };
    });
}

module.exports = { parseCookies };