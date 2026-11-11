// main.js — Fuwari (Hugo port) client bundle.
// Translation of src/layouts/Layout.astro scripts, src/components/Navbar.astro
// scripts, and the Svelte components (Search, LightDarkSwitch, DisplaySettings,
// ArchivePanel) plus the TOC / WidgetLayout custom elements and the Markdown
// copy-button handler — all as vanilla JS, using the same libraries the
// original uses (Swup, OverlayScrollbars, PhotoSwipe, Pagefind, KaTeX).

import params from "@params";
import { OverlayScrollbars } from "overlayscrollbars";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import Swup from "swup";

// ---- config (injected by Hugo at build time) ----
const BANNER_HEIGHT = 35;
const BANNER_HEIGHT_HOME = 65;
const BANNER_HEIGHT_EXTEND = 30;
const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 3.5;
const LIGHT_MODE = "light";
const DARK_MODE = "dark";
const AUTO_MODE = "auto";
const DEFAULT_THEME = AUTO_MODE;
const bannerEnabled = params.bannerEnable === true;
// Site sub-path ("" at the domain root, "/fuwari" on GitHub Pages project
// sites). Root-absolute client URLs (Pagefind, archive links, search
// results) are prefixed with this so the site works under a sub-path.
const BASE_PATH = params.basePath || "";

// ---- setting utils (src/utils/setting-utils.ts) ----
function getDefaultHue() {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}
function getHue() {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}
function setHue(hue) {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root");
	if (r) r.style.setProperty("--hue", String(hue));
}
function applyThemeToDocument(theme) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}
	document.documentElement.setAttribute("data-theme", "github-dark");
}
function setTheme(theme) {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}
function getStoredTheme() {
	return localStorage.getItem("theme") || DEFAULT_THEME;
}

// ---- url utils (src/utils/url-utils.ts) ----
function pathsEqual(path1, path2) {
	const n1 = path1.replace(/^\/|\/$/g, "").toLowerCase();
	const n2 = path2.replace(/^\/|\/$/g, "").toLowerCase();
	return n1 === n2;
}
function url(path) {
	return path.startsWith("/") ? path : `/${path}`;
}

// ---- click-outside-to-close (Layout.astro) ----
function setClickOutsideToClose(panel, ignores) {
	document.addEventListener("click", (event) => {
		const panelDom = document.getElementById(panel);
		const tDom = event.target;
		if (!(tDom instanceof Node)) return;
		for (const ig of ignores) {
			const ie = document.getElementById(ig);
			if (ie === tDom || ie?.contains(tDom)) return;
		}
		panelDom?.classList.add("float-panel-closed");
	});
}
setClickOutsideToClose("display-setting", [
	"display-setting",
	"display-settings-switch",
]);
setClickOutsideToClose("nav-menu-panel", ["nav-menu-panel", "nav-menu-switch"]);
setClickOutsideToClose("search-panel", [
	"search-panel",
	"search-bar",
	"search-switch",
]);

// ---- theme / hue / scrollbar / banner (Layout.astro) ----
function loadTheme() {
	setTheme(getStoredTheme());
}
function loadHue() {
	setHue(getHue());
}
function initCustomScrollbar() {
	const bodyElement = document.querySelector("body");
	if (!bodyElement) return;
	OverlayScrollbars(
		{ target: bodyElement, cancel: { nativeScrollbarsOverlaid: true } },
		{
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto py-1",
				autoHide: "move",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		},
	);

	const katexElements = document.querySelectorAll(".katex-display");
	const katexObserverOptions = {
		root: null,
		rootMargin: "100px",
		threshold: 0.1,
	};
	const processKatexElement = (element) => {
		if (!element.parentNode) return;
		if (element.hasAttribute("data-scrollbar-initialized")) return;
		const container = document.createElement("div");
		container.className = "katex-display-container";
		container.setAttribute("aria-label", "scrollable container for formulas");
		element.parentNode.insertBefore(container, element);
		container.appendChild(element);
		OverlayScrollbars(container, {
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto",
				autoHide: "leave",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		});
		element.setAttribute("data-scrollbar-initialized", "true");
	};
	const katexObserver = new IntersectionObserver((entries, observer) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				processKatexElement(entry.target);
				observer.unobserve(entry.target);
			}
		});
	}, katexObserverOptions);
	katexElements.forEach((element) => {
		katexObserver.observe(element);
	});
}
function showBanner() {
	if (!bannerEnabled) return;
	const banner = document.getElementById("banner");
	if (!banner) return;
	banner.classList.remove("opacity-0", "scale-105");
}
function init() {
	loadTheme();
	loadHue();
	initCustomScrollbar();
	showBanner();
}
init();

// ---- Swup (astro.config.mjs swup({...})) ----
const swup = new Swup({
	animationClass: "transition-swup-",
	containers: ["main", "#toc"],
	smoothScrolling: true,
	cache: true,
	preload: true,
	accessibility: true,
	updateHead: true,
	updateBodyClass: false,
	globalInstance: true,
});
window.swup = swup;

function setupSwupHooks() {
	window.swup.hooks.on("link:click", () => {
		document.documentElement.style.setProperty("--content-delay", "0ms");
		const threshold = (window.innerHeight * BANNER_HEIGHT) / 100 - 72 - 16;
		const navbar = document.getElementById("navbar-wrapper");
		if (!navbar || !document.body.classList.contains("lg:is-home")) return;
		if (
			document.body.scrollTop >= threshold ||
			document.documentElement.scrollTop >= threshold
		) {
			navbar.classList.add("navbar-hidden");
		}
	});
	window.swup.hooks.on("content:replace", initCustomScrollbar);
	window.swup.hooks.on("visit:start", (visit) => {
		const bodyElement = document.querySelector("body");
		if (pathsEqual(visit.to.url, url("/"))) {
			bodyElement?.classList.add("lg:is-home");
		} else {
			bodyElement?.classList.remove("lg:is-home");
		}
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) heightExtend.classList.remove("hidden");
		const toc = document.getElementById("toc-wrapper");
		if (toc) toc.classList.add("toc-not-ready");
	});
	window.swup.hooks.on("page:view", () => {
		const heightExtend = document.getElementById("page-height-extend");
		if (heightExtend) heightExtend.classList.remove("hidden");
		renderMath();
		initArchivePanel();
	});
	window.swup.hooks.on("visit:end", () => {
		setTimeout(() => {
			const heightExtend = document.getElementById("page-height-extend");
			if (heightExtend) heightExtend.classList.add("hidden");
			const toc = document.getElementById("toc-wrapper");
			if (toc) toc.classList.remove("toc-not-ready");
		}, 200);
	});
}
if (window?.swup?.hooks) {
	setupSwupHooks();
} else {
	document.addEventListener("swup:enable", setupSwupHooks);
}

// ---- scroll / resize (Layout.astro) ----
// Navbar hide/show works with or without the banner. With the banner off
// there is no banner height, so the regular banner height (35vh) sets the
// threshold on every page instead of the taller home banner height.
const backToTopBtn = document.getElementById("back-to-top-btn");
const tocWrapper = document.getElementById("toc-wrapper");
const navbarEl = document.getElementById("navbar-wrapper");
function updateNavbarHidden() {
	if (!navbarEl) return;
	const NAVBAR_HEIGHT = 72;
	const MAIN_PANEL_EXCESS_HEIGHT = MAIN_PANEL_OVERLAPS_BANNER_HEIGHT * 16;
	let bannerHeightVh = BANNER_HEIGHT;
	if (
		bannerEnabled &&
		document.body.classList.contains("lg:is-home") &&
		window.innerWidth >= 1024
	) {
		bannerHeightVh = BANNER_HEIGHT_HOME;
	}
	const threshold =
		(window.innerHeight * bannerHeightVh) / 100 -
		NAVBAR_HEIGHT -
		MAIN_PANEL_EXCESS_HEIGHT -
		16;
	if (
		document.body.scrollTop >= threshold ||
		document.documentElement.scrollTop >= threshold
	) {
		navbarEl.classList.add("navbar-hidden");
	} else {
		navbarEl.classList.remove("navbar-hidden");
	}
}
function scrollFunction() {
	const bannerHeight = (window.innerHeight * BANNER_HEIGHT) / 100;
	if (backToTopBtn) {
		if (
			document.body.scrollTop > bannerHeight ||
			document.documentElement.scrollTop > bannerHeight
		) {
			backToTopBtn.classList.remove("hide");
		} else {
			backToTopBtn.classList.add("hide");
		}
	}
	if (bannerEnabled && tocWrapper) {
		if (
			document.body.scrollTop > bannerHeight ||
			document.documentElement.scrollTop > bannerHeight
		) {
			tocWrapper.classList.remove("toc-hide");
		} else {
			tocWrapper.classList.add("toc-hide");
		}
	}
	updateNavbarHidden();
}
window.onscroll = scrollFunction;
window.onresize = () => {
	let offset = Math.floor((window.innerHeight * BANNER_HEIGHT_EXTEND) / 100);
	offset = offset - (offset % 4);
	document.documentElement.style.setProperty(
		"--banner-height-extend",
		`${offset}px`,
	);
};

// ---- PhotoSwipe (Layout.astro second script) ----
let lightbox;
const pswpImport = import("photoswipe");
function createPhotoSwipe() {
	lightbox = new PhotoSwipeLightbox({
		gallery: ".custom-md img, #post-cover img",
		pswpModule: () => pswpImport,
		closeSVG:
			'<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M480-424 284-228q-11 11-28 11t-28-11q-11-11-11-28t11-28l196-196-196-196q-11-11-11-28t11-28q11-11 28-11t28 11l196 196 196-196q11-11 28-11t28 11q11 11 28 28L536-480l196 196q11 11 11 28t-11 28q-11 11-28 11t-28-11L480-424Z"/></svg>',
		zoomSVG:
			'<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M340-540h-40q-17 0-28.5-11.5T260-580q0-17 11.5-28.5T300-620h40v-40q0-17 11.5-28.5T380-700q17 0 28.5 11.5T420-660v40h40q17 0 28.5 11.5T500-580q0 17-11.5 28.5T460-540h-40v40q0 17-11.5 28.5T380-460q-17 0-28.5-11.5T340-500v-40Zm40 220q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l224 224q11 11 11 28t-11 28q-11 11-28 11t-28-11L532-372q-30 24-69 38t-83 14Zm0-80q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>',
		padding: { top: 20, bottom: 20, left: 20, right: 20 },
		wheelToZoom: true,
		arrowPrev: false,
		arrowNext: false,
		imageClickAction: "close",
		tapAction: "close",
		doubleTapAction: "zoom",
	});
	lightbox.addFilter("domItemData", (itemData, element) => {
		if (element instanceof HTMLImageElement) {
			itemData.src = element.src;
			itemData.w = Number(element.naturalWidth || window.innerWidth);
			itemData.h = Number(element.naturalHeight || window.innerHeight);
			itemData.msrc = element.src;
		}
		return itemData;
	});
	lightbox.init();
}
function setupPhotoSwipe() {
	if (!lightbox) createPhotoSwipe();
	window.swup.hooks.on("page:view", () => {
		createPhotoSwipe();
	});
	window.swup.hooks.on(
		"content:replace",
		() => {
			lightbox?.destroy?.();
		},
		{ before: true },
	);
}
if (window.swup) {
	setupPhotoSwipe();
} else {
	document.addEventListener("swup:enable", setupPhotoSwipe);
}

// ---- Navbar buttons (Navbar.astro loadButtonScript) ----
function switchTheme() {
	if (localStorage.theme === "dark") {
		document.documentElement.classList.remove("dark");
		localStorage.theme = "light";
	} else {
		document.documentElement.classList.add("dark");
		localStorage.theme = "dark";
	}
}
function loadButtonScript() {
	const switchBtn = document.getElementById("scheme-switch");
	if (switchBtn) {
		switchBtn.onclick = () => {
			switchTheme();
		};
	}
	const settingBtn = document.getElementById("display-settings-switch");
	if (settingBtn) {
		settingBtn.onclick = () => {
			const settingPanel = document.getElementById("display-setting");
			if (settingPanel) settingPanel.classList.toggle("float-panel-closed");
		};
	}
	const menuBtn = document.getElementById("nav-menu-switch");
	if (menuBtn) {
		menuBtn.onclick = () => {
			const menuPanel = document.getElementById("nav-menu-panel");
			if (menuPanel) menuPanel.classList.toggle("float-panel-closed");
		};
	}
}
loadButtonScript();

// ---- Pagefind loader (Navbar.astro, PROD only) ----
async function loadPagefind() {
	const scriptUrl = `${BASE_PATH}/pagefind/pagefind.js`;
	try {
		const response = await fetch(scriptUrl, { method: "HEAD" });
		if (!response.ok)
			throw new Error(`Pagefind script not found: ${response.status}`);
		const pagefind = await import(scriptUrl);
		await pagefind.options({ excerptLength: 20 });
		window.pagefind = pagefind;
		document.dispatchEvent(new CustomEvent("pagefindready"));
	} catch (error) {
		console.error("Failed to load Pagefind:", error);
		window.pagefind = {
			search: () => Promise.resolve({ results: [] }),
			options: () => Promise.resolve(),
		};
		document.dispatchEvent(new CustomEvent("pagefindloaderror"));
	}
}
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", loadPagefind);
} else {
	loadPagefind();
}

// ---- backToTop (BackToTop.astro) ----
window.backToTop = () => {
	window.scroll({ top: 0, behavior: "smooth" });
};

// ---- Markdown copy button (Markdown.astro) ----
document.addEventListener("click", (e) => {
	const target = e.target;
	if (target?.classList.contains("copy-btn")) {
		const preEle = target.closest("pre");
		const codeEle = preEle?.querySelector("code");
		const code = Array.from(
			codeEle?.querySelectorAll(".code:not(summary *)") ?? [],
		)
			.map((el) => el.textContent)
			.map((t) => (t === "\n" ? "" : t))
			.join("\n");
		navigator.clipboard.writeText(code);
		const timeoutId = target.getAttribute("data-timeout-id");
		if (timeoutId) clearTimeout(Number.parseInt(timeoutId, 10));
		target.classList.add("success");
		const newTimeoutId = setTimeout(() => {
			target.classList.remove("success");
		}, 1000);
		target.setAttribute("data-timeout-id", newTimeoutId.toString());
	}
});

// ---- WidgetLayout custom element (WidgetLayout.astro) ----
class WidgetLayout extends HTMLElement {
	constructor() {
		super();
		if (this.dataset.isCollapsed !== "true") return;
		const id = this.dataset.id;
		const btn = this.querySelector(".expand-btn");
		const wrapper = this.querySelector(`#${id}`);
		btn?.addEventListener("click", () => {
			wrapper?.classList.remove("collapsed");
			btn?.classList.add("hidden");
		});
	}
}
if (!customElements.get("widget-layout")) {
	customElements.define("widget-layout", WidgetLayout);
}

// ---- TOC custom element (TOC.astro) ----
class TableOfContents extends HTMLElement {
	constructor() {
		super();
		this.tocEl = null;
		this.visibleClass = "visible";
		this.observer = new IntersectionObserver(this.markVisibleSection, {
			threshold: 0,
		});
		this.anchorNavTarget = null;
		this.headingIdxMap = new Map();
		this.headings = [];
		this.sections = [];
		this.tocEntries = [];
		this.active = [];
		this.activeIndicator = null;
	}
	markVisibleSection = (entries) => {
		entries.forEach((entry) => {
			const id = entry.target.children[0]?.getAttribute("id");
			const idx = id ? this.headingIdxMap.get(id) : undefined;
			if (idx !== undefined) this.active[idx] = entry.isIntersecting;
			if (
				entry.isIntersecting &&
				this.anchorNavTarget === entry.target.firstChild
			)
				this.anchorNavTarget = null;
		});
		if (!this.active.includes(true)) this.fallback();
		this.update();
	};
	toggleActiveHeading = () => {
		let i = this.active.length - 1;
		let min = this.active.length - 1;
		let max = -1;
		while (i >= 0 && !this.active[i]) {
			this.tocEntries[i].classList.remove(this.visibleClass);
			i--;
		}
		while (i >= 0 && this.active[i]) {
			this.tocEntries[i].classList.add(this.visibleClass);
			min = Math.min(min, i);
			max = Math.max(max, i);
			i--;
		}
		while (i >= 0) {
			this.tocEntries[i].classList.remove(this.visibleClass);
			i--;
		}
		if (min > max) {
			this.activeIndicator?.setAttribute("style", "opacity: 0");
		} else {
			const parentOffset = this.tocEl?.getBoundingClientRect().top || 0;
			const scrollOffset = this.tocEl?.scrollTop || 0;
			const top =
				this.tocEntries[min].getBoundingClientRect().top -
				parentOffset +
				scrollOffset;
			const bottom =
				this.tocEntries[max].getBoundingClientRect().bottom -
				parentOffset +
				scrollOffset;
			this.activeIndicator?.setAttribute(
				"style",
				`top: ${top}px; height: ${bottom - top}px`,
			);
		}
	};
	scrollToActiveHeading = () => {
		if (this.anchorNavTarget || !this.tocEl) return;
		const activeHeading = document.querySelectorAll(
			`#toc .${this.visibleClass}`,
		);
		if (!activeHeading.length) return;
		const topmost = activeHeading[0];
		const bottommost = activeHeading[activeHeading.length - 1];
		const tocHeight = this.tocEl.clientHeight;
		let top;
		if (
			bottommost.getBoundingClientRect().bottom -
				topmost.getBoundingClientRect().top <
			0.9 * tocHeight
		)
			top = topmost.offsetTop - 32;
		else top = bottommost.offsetTop - tocHeight * 0.8;
		this.tocEl.scrollTo({ top, left: 0, behavior: "smooth" });
	};
	update = () => {
		requestAnimationFrame(() => {
			this.toggleActiveHeading();
			this.scrollToActiveHeading();
		});
	};
	fallback = () => {
		if (!this.sections.length) return;
		for (let i = 0; i < this.sections.length; i++) {
			const offsetTop = this.sections[i].getBoundingClientRect().top;
			const offsetBottom = this.sections[i].getBoundingClientRect().bottom;
			if (
				this.isInRange(offsetTop, 0, window.innerHeight) ||
				this.isInRange(offsetBottom, 0, window.innerHeight) ||
				(offsetTop < 0 && offsetBottom > window.innerHeight)
			) {
				this.markActiveHeading(i);
			} else if (offsetTop > window.innerHeight) break;
		}
	};
	markActiveHeading = (idx) => {
		this.active[idx] = true;
	};
	handleAnchorClick = (event) => {
		const anchor = event
			.composedPath()
			.find((element) => element instanceof HTMLAnchorElement);
		if (anchor) {
			const id = decodeURIComponent(anchor.hash?.substring(1));
			const idx = this.headingIdxMap.get(id);
			if (idx !== undefined) {
				this.anchorNavTarget = this.headings[idx];
			} else {
				this.anchorNavTarget = null;
			}
		}
	};
	isInRange(value, min, max) {
		return min < value && value < max;
	}
	connectedCallback() {
		const element = document.querySelector(".prose");
		if (element) {
			element.addEventListener(
				"animationend",
				() => {
					this.init();
				},
				{ once: true },
			);
		}
	}
	init() {
		this.tocEl = document.getElementById("toc-inner-wrapper");
		if (!this.tocEl) return;
		this.tocEl.addEventListener("click", this.handleAnchorClick, {
			capture: true,
		});
		this.activeIndicator = document.getElementById("active-indicator");
		this.tocEntries = Array.from(
			document.querySelectorAll("#toc a[href^='#']"),
		);
		if (this.tocEntries.length === 0) return;
		this.sections = new Array(this.tocEntries.length);
		this.headings = new Array(this.tocEntries.length);
		for (let i = 0; i < this.tocEntries.length; i++) {
			const id = decodeURIComponent(this.tocEntries[i].hash?.substring(1));
			const heading = document.getElementById(id);
			const section = heading?.parentElement;
			if (heading instanceof HTMLElement && section instanceof HTMLElement) {
				this.headings[i] = heading;
				this.sections[i] = section;
				this.headingIdxMap.set(id, i);
			}
		}
		this.active = new Array(this.tocEntries.length).fill(false);
		this.sections.forEach((section) => {
			this.observer.observe(section);
		});
		this.fallback();
		this.update();
	}
	disconnectedCallback() {
		this.sections.forEach((section) => {
			this.observer.unobserve(section);
		});
		this.observer.disconnect();
		this.tocEl?.removeEventListener("click", this.handleAnchorClick);
	}
}
if (!customElements.get("table-of-contents")) {
	customElements.define("table-of-contents", TableOfContents);
}

// ---- Search (Search.svelte, vanilla reimplementation) ----
let searchKeywordDesktop = "";
let searchKeywordMobile = "";
let searchResult = [];
let searchPagefindLoaded = false;
let searchInitialized = false;

function toggleSearchPanel() {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
}
function setSearchPanelVisibility(show, isDesktop) {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;
	if (show) panel.classList.remove("float-panel-closed");
	else panel.classList.add("float-panel-closed");
}
function renderSearchResults() {
	const panel = document.getElementById("search-panel");
	if (!panel) return;
	// Remove previous result links (keep the search bar inside the panel).
	panel.querySelectorAll("a[data-search-result]").forEach((el) => {
		el.remove();
	});
	for (const item of searchResult) {
		const a = document.createElement("a");
		a.href = `${BASE_PATH}${item.url}`;
		a.dataset.searchResult = "";
		a.className =
			"transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]";
		const titleDiv = document.createElement("div");
		titleDiv.className =
			"transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]";
		titleDiv.textContent = item.meta.title;
		const chev = document.createElement("span");
		chev.className =
			"transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]";
		chev.innerHTML =
			'<svg width="1em" height="1em" viewBox="0 0 320 512" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]" data-icon="fa6-solid:chevron-right"><path fill="currentColor" d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256L73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>';
		titleDiv.appendChild(chev);
		const excerptDiv = document.createElement("div");
		excerptDiv.className = "transition text-sm text-50";
		excerptDiv.innerHTML = item.excerpt;
		a.appendChild(titleDiv);
		a.appendChild(excerptDiv);
		panel.appendChild(a);
	}
}
async function doSearch(keyword, isDesktop) {
	if (!keyword) {
		setSearchPanelVisibility(false, isDesktop);
		searchResult = [];
		renderSearchResults();
		return;
	}
	if (!searchInitialized) return;
	try {
		let searchResults = [];
		if (searchPagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}
		searchResult = searchResults;
		renderSearchResults();
		setSearchPanelVisibility(searchResult.length > 0, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		searchResult = [];
		renderSearchResults();
		setSearchPanelVisibility(false, isDesktop);
	}
}
function initSearch() {
	const desktopInput = document.querySelector("#search-bar input");
	const mobileInput = document.querySelector("#search-bar-inside input");
	const searchSwitch = document.getElementById("search-switch");
	if (searchSwitch) searchSwitch.addEventListener("click", toggleSearchPanel);
	if (desktopInput) {
		desktopInput.addEventListener("input", () => {
			searchKeywordDesktop = desktopInput.value;
			if (searchInitialized && searchKeywordDesktop)
				doSearch(searchKeywordDesktop, true);
			else if (!searchKeywordDesktop) doSearch("", true);
		});
		desktopInput.addEventListener("focus", () =>
			doSearch(searchKeywordDesktop, true),
		);
	}
	if (mobileInput) {
		mobileInput.addEventListener("input", () => {
			searchKeywordMobile = mobileInput.value;
			if (searchInitialized && searchKeywordMobile)
				doSearch(searchKeywordMobile, false);
			else if (!searchKeywordMobile) doSearch("", false);
		});
	}
	const initializeSearch = () => {
		searchInitialized = true;
		searchPagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		if (searchKeywordDesktop) doSearch(searchKeywordDesktop, true);
		if (searchKeywordMobile) doSearch(searchKeywordMobile, false);
	};
	document.addEventListener("pagefindready", () => {
		initializeSearch();
	});
	document.addEventListener("pagefindloaderror", () => {
		initializeSearch();
	});
	setTimeout(() => {
		if (!searchInitialized) initializeSearch();
	}, 2000);
}
initSearch();

// ---- LightDarkSwitch (LightDarkSwitch.svelte, vanilla reimplementation) ----
const themeSeq = [LIGHT_MODE, DARK_MODE, AUTO_MODE];
let currentMode = AUTO_MODE;
function updateThemeUI() {
	// Show the icon matching the current mode; highlight the matching panel button.
	document.querySelectorAll("#scheme-switch [data-mode-icon]").forEach((el) => {
		el.classList.toggle("opacity-0", el.dataset.modeIcon !== currentMode);
	});
	document
		.querySelectorAll("#light-dark-panel [data-theme-btn]")
		.forEach((btn) => {
			btn.classList.toggle(
				"current-theme-btn",
				btn.dataset.themeBtn === currentMode,
			);
		});
}
function switchScheme(newMode) {
	currentMode = newMode;
	setTheme(newMode);
	updateThemeUI();
}
function toggleScheme() {
	let i = 0;
	for (; i < themeSeq.length; i++) {
		if (themeSeq[i] === currentMode) break;
	}
	switchScheme(themeSeq[(i + 1) % themeSeq.length]);
}
function initLightDarkSwitch() {
	currentMode = getStoredTheme();
	updateThemeUI();
	const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)");
	darkModePreference.addEventListener("change", () => {
		applyThemeToDocument(currentMode);
	});
	const switchBtn = document.getElementById("scheme-switch");
	if (switchBtn) {
		switchBtn.addEventListener("click", toggleScheme);
		switchBtn.addEventListener("mouseenter", () => {
			document
				.querySelector("#light-dark-panel")
				?.classList.remove("float-panel-closed");
		});
	}
	const container = document.querySelector("#light-dark-switch");
	if (container) {
		container.addEventListener("mouseleave", () => {
			document
				.querySelector("#light-dark-panel")
				?.classList.add("float-panel-closed");
		});
	}
	document
		.querySelectorAll("#light-dark-panel [data-theme-btn]")
		.forEach((btn) => {
			btn.addEventListener("click", () => switchScheme(btn.dataset.themeBtn));
		});
}
initLightDarkSwitch();

// ---- DisplaySettings (DisplaySettings.svelte, vanilla reimplementation) ----
function initDisplaySettings() {
	const slider = document.getElementById("colorSlider");
	const hueValue = document.getElementById("hueValue");
	const resetBtn = document.getElementById("hue-reset-btn");
	if (!slider) return;
	let hue = getHue();
	const defaultHue = getDefaultHue();
	const applyHue = () => {
		setHue(hue);
		if (hueValue) hueValue.textContent = String(hue);
		if (slider) slider.value = String(hue);
		if (resetBtn) {
			resetBtn.classList.toggle("opacity-0", hue === defaultHue);
			resetBtn.classList.toggle("pointer-events-none", hue === defaultHue);
		}
	};
	slider.addEventListener("input", () => {
		hue = Number.parseInt(slider.value, 10);
		applyHue();
	});
	if (resetBtn) {
		resetBtn.addEventListener("click", () => {
			hue = getDefaultHue();
			applyHue();
		});
	}
	applyHue();
}
initDisplaySettings();

// ---- ArchivePanel (ArchivePanel.svelte, vanilla reimplementation) ----
function formatArchiveDate(iso) {
	const date = new Date(iso);
	const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
	const day = date.getUTCDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}
function formatArchiveTag(tagList) {
	return tagList.map((t) => `#${t}`).join(" ");
}
function initArchivePanel() {
	const container = document.getElementById("archive-groups");
	const dataEl = document.getElementById("archive-data");
	if (!container || !dataEl) return;
	// Only render once per page (Swup replaces #archive-groups content on navigation).
	if (container.dataset.rendered) return;
	container.dataset.rendered = "true";
	let posts;
	try {
		posts = JSON.parse(dataEl.textContent);
	} catch {
		return;
	}
	const paramsUrl = new URLSearchParams(window.location.search);
	const tags = paramsUrl.has("tag") ? paramsUrl.getAll("tag") : [];
	const categories = paramsUrl.has("category")
		? paramsUrl.getAll("category")
		: [];
	const uncategorized = paramsUrl.get("uncategorized");
	let filtered = posts;
	if (tags.length > 0) {
		filtered = filtered.filter(
			(post) =>
				Array.isArray(post.tags) && post.tags.some((tag) => tags.includes(tag)),
		);
	}
	if (categories.length > 0) {
		filtered = filtered.filter(
			(post) => post.category && categories.includes(post.category),
		);
	}
	if (uncategorized) {
		filtered = filtered.filter((post) => !post.category);
	}
	const grouped = {};
	for (const post of filtered) {
		const year = new Date(post.published).getUTCFullYear();
		if (!grouped[year]) grouped[year] = [];
		grouped[year].push(post);
	}
	const groups = Object.keys(grouped)
		.map((y) => ({ year: Number.parseInt(y, 10), posts: grouped[y] }))
		.sort((a, b) => b.year - a.year);
	const postCountLabel = (n) =>
		n === 1 ? params.i18nPostCount : params.i18nPostsCount;
	for (const group of groups) {
		const groupDiv = document.createElement("div");
		groupDiv.innerHTML = `
      <div class="flex flex-row w-full items-center h-[3.75rem]">
        <div class="w-[15%] md:w-[10%] transition text-2xl font-bold text-right text-75">${group.year}</div>
        <div class="w-[15%] md:w-[10%]"><div class="h-3 w-3 bg-none rounded-full outline outline-[var(--primary)] mx-auto -outline-offset-[2px] z-50 outline-3"></div></div>
        <div class="w-[70%] md:w-[80%] transition text-left text-50">${group.posts.length} ${postCountLabel(group.posts.length)}</div>
      </div>`;
		for (const post of group.posts) {
			const a = document.createElement("a");
			a.href = `${BASE_PATH}/posts/${post.slug}/`;
			a.setAttribute("aria-label", post.title);
			a.className =
				"group btn-plain !block h-10 w-full rounded-lg hover:text-[initial]";
			a.innerHTML = `
        <div class="flex flex-row justify-start items-center h-full">
          <div class="w-[15%] md:w-[10%] transition text-sm text-right text-50">${formatArchiveDate(post.published)}</div>
          <div class="w-[15%] md:w-[10%] relative dash-line h-full flex items-center">
            <div class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5 bg-[oklch(0.5_0.05_var(--hue))] group-hover:bg-[var(--primary)] outline outline-4 z-50 outline-[var(--card-bg)] group-hover:outline-[var(--btn-plain-bg-hover)] group-active:outline-[var(--btn-plain-bg-active)]"></div>
          </div>
          <div class="w-[70%] md:max-w-[65%] md:w-[65%] text-left font-bold group-hover:translate-x-1 transition-all group-hover:text-[var(--primary)] text-75 pr-8 whitespace-nowrap overflow-ellipsis overflow-hidden">${post.title}</div>
          <div class="hidden md:block md:w-[15%] text-left text-sm transition whitespace-nowrap overflow-ellipsis overflow-hidden text-30">${formatArchiveTag(post.tags || [])}</div>
        </div>`;
			groupDiv.appendChild(a);
		}
		container.appendChild(groupDiv);
	}
}
initArchivePanel();

// ---- KaTeX math (rehype-katex replacement: client-side auto-render) ----
function renderMath() {
	if (typeof window.renderMathInElement === "undefined") return;
	const targets = document.querySelectorAll(".custom-md");
	targets.forEach((el) => {
		window.renderMathInElement(el, {
			delimiters: [
				{ left: "$$", right: "$$", display: true },
				{ left: "$", right: "$", display: false },
			],
			throwOnError: false,
		});
	});
}
renderMath();
