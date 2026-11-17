// Hermes (the phone's JavaScript engine) lacks some Intl APIs the app uses:
// plural rules for every translated sentence, "yesterday"-style dates and
// locale parsing. Each polyfill installs itself only where the API is missing,
// so browsers and future Hermes versions use their own.
import "@formatjs/intl-getcanonicallocales/polyfill.js";
import "@formatjs/intl-locale/polyfill.js";
import "@formatjs/intl-pluralrules/polyfill.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/es.js";
import "@formatjs/intl-pluralrules/locale-data/pt.js";
import "@formatjs/intl-pluralrules/locale-data/fr.js";
import "@formatjs/intl-pluralrules/locale-data/de.js";
import "@formatjs/intl-pluralrules/locale-data/hi.js";
import "@formatjs/intl-pluralrules/locale-data/ur.js";
import "@formatjs/intl-pluralrules/locale-data/ar.js";
import "@formatjs/intl-relativetimeformat/polyfill.js";
import "@formatjs/intl-relativetimeformat/locale-data/en.js";
import "@formatjs/intl-relativetimeformat/locale-data/es.js";
import "@formatjs/intl-relativetimeformat/locale-data/pt.js";
import "@formatjs/intl-relativetimeformat/locale-data/fr.js";
import "@formatjs/intl-relativetimeformat/locale-data/de.js";
import "@formatjs/intl-relativetimeformat/locale-data/hi.js";
import "@formatjs/intl-relativetimeformat/locale-data/ur.js";
import "@formatjs/intl-relativetimeformat/locale-data/ar.js";
