(() => {
  "use strict";

  const header = document.querySelector("#site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  const main = document.querySelector("main");
  const footer = document.querySelector(".site-footer");

  const mobileViewport = window.matchMedia("(max-width: 900px)");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let menuIsOpen = false;
  let focusBeforeMenu = null;
  let previousBodyOverflow = "";

  const inertStates = new Map();

  /* ======================================================================
     01 / MOBILE NAVIGATION
     ====================================================================== */

  const getNavigationLinks = () => {
    if (!navigation) return [];

    return [...navigation.querySelectorAll("a[href]")];
  };

  const lockBackground = () => {
    [main, footer].forEach((element) => {
      if (!element) return;

      inertStates.set(element, element.hasAttribute("inert"));
      element.setAttribute("inert", "");
    });
  };

  const unlockBackground = () => {
    inertStates.forEach((wasInert, element) => {
      if (wasInert) {
        element.setAttribute("inert", "");
      } else {
        element.removeAttribute("inert");
      }
    });

    inertStates.clear();
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!menuToggle || !navigation) return;

    const wasOpen = menuIsOpen;

    menuIsOpen = false;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");

    document.body.classList.remove("menu-open");

    if (wasOpen) {
      document.body.style.overflow = previousBodyOverflow;
    }

    unlockBackground();

    navigation.hidden = mobileViewport.matches;

    if (restoreFocus && wasOpen) {
      const focusTarget =
        focusBeforeMenu instanceof HTMLElement &&
        focusBeforeMenu.isConnected &&
        focusBeforeMenu.getClientRects().length
          ? focusBeforeMenu
          : menuToggle;

      focusTarget.focus({ preventScroll: true });
    }
  };

  const openMenu = () => {
    if (
      !menuToggle ||
      !navigation ||
      !mobileViewport.matches ||
      menuIsOpen
    ) {
      return;
    }

    focusBeforeMenu = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;

    menuIsOpen = true;
    navigation.hidden = false;

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");

    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";

    lockBackground();

    getNavigationLinks()[0]?.focus({ preventScroll: true });
  };

  const synchronizeNavigation = () => {
    if (!menuToggle || !navigation) return;

    const activeElement = document.activeElement;
    const focusWasInNavigation = navigation.contains(activeElement);
    const focusWasOnToggle = activeElement === menuToggle;

    closeMenu();

    menuToggle.hidden = !mobileViewport.matches;
    navigation.hidden = mobileViewport.matches;

    if (mobileViewport.matches && focusWasInNavigation) {
      menuToggle.focus({ preventScroll: true });
    } else if (!mobileViewport.matches && focusWasOnToggle) {
      getNavigationLinks()[0]?.focus({ preventScroll: true });
    }
  };

  if (header && menuToggle && navigation) {
    header.classList.add("nav-ready");

    synchronizeNavigation();

    menuToggle.addEventListener("click", () => {
      if (menuIsOpen) {
        closeMenu({ restoreFocus: true });
      } else {
        openMenu();
      }
    });

    mobileViewport.addEventListener("change", synchronizeNavigation);

    document.addEventListener("keydown", (event) => {
      if (!menuIsOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = [
        menuToggle,
        ...getNavigationLinks()
      ];

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      } else if (!focusableElements.includes(activeElement)) {
        event.preventDefault();
        firstElement?.focus();
      }
    });

    document.addEventListener("focusin", (event) => {
      if (!menuIsOpen) return;

      const focusIsInsideMenu =
        navigation.contains(event.target) ||
        menuToggle.contains(event.target);

      if (!focusIsInsideMenu) {
        menuToggle.focus({ preventScroll: true });
      }
    });
  }

  /* ======================================================================
     02 / SAME-PAGE NAVIGATION
     Keep native scrolling, browser history, and reduced-motion behavior.
     ====================================================================== */

  const focusSection = (section) => {
    const hadTabIndex = section.hasAttribute("tabindex");

    if (!hadTabIndex) {
      section.setAttribute("tabindex", "-1");
    }

    section.focus({ preventScroll: true });

    if (!hadTabIndex) {
      section.addEventListener(
        "blur",
        () => section.removeAttribute("tabindex"),
        { once: true }
      );
    }
  };

  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const link = event.target.closest?.('a[href^="#"]');

    if (!link || link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;

    const href = link.getAttribute("href");

    if (!href || href === "#") return;

    let targetId;

    try {
      targetId = decodeURIComponent(href.slice(1));
    } catch {
      return;
    }

    const target = document.getElementById(targetId);

    if (!target) return;

    if (menuIsOpen) {
      closeMenu();
    }

    revealTarget(target);
    focusSection(target);

    // Do not preventDefault: the anchor retains native URL and scroll behavior.
  });

  /* ======================================================================
     03 / HEADER SCROLL STATE
     The stylesheet keeps the header in normal flow when it becomes sticky.
     ====================================================================== */

  let headerUpdatePending = false;

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 48);
    headerUpdatePending = false;
  };

  if (header) {
    updateHeader();

    window.addEventListener(
      "scroll",
      () => {
        if (headerUpdatePending) return;

        headerUpdatePending = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );
  }

  /* ======================================================================
     04 / RESTRAINED SECTION REVEALS
     Content is visible by default. Animation is optional enhancement.
     ====================================================================== */

  const revealElements = [
    ...document.querySelectorAll("[data-reveal]")
  ];

  let revealObserver = null;
  let revealSafetyTimer = null;

  const showElement = (element) => {
    element.classList.add("is-visible");
    revealObserver?.unobserve(element);
  };

  function revealTarget(target) {
    const parentReveal = target.closest?.("[data-reveal]");

    if (parentReveal) {
      showElement(parentReveal);
    }

    if (target.matches?.("[data-reveal]")) {
      showElement(target);
    }

    target.querySelectorAll?.("[data-reveal]").forEach(showElement);
  }

  const showAllContent = () => {
    revealObserver?.disconnect();
    window.clearTimeout(revealSafetyTimer);

    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });

    document.documentElement.classList.remove("reveal-ready");
  };

  const initializeReveals = () => {
    if (
      reducedMotion.matches ||
      !("IntersectionObserver" in window) ||
      !revealElements.length
    ) {
      return;
    }

    try {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              showElement(entry.target);
            }
          });
        },
        {
          threshold: 0,
          rootMargin: "0px 0px 60px 0px"
        }
      );

      revealElements.forEach((element) => {
        const bounds = element.getBoundingClientRect();

        // Leave already visible content untouched during initialization.
        if (bounds.top < window.innerHeight) {
          element.classList.add("is-visible");
        } else {
          revealObserver.observe(element);
        }
      });

      document.documentElement.classList.add("reveal-ready");

      // Fail open rather than leaving content hidden indefinitely.
      revealSafetyTimer = window.setTimeout(showAllContent, 15000);
    } catch {
      showAllContent();
    }
  };

  initializeReveals();

  document.addEventListener("focusin", (event) => {
    const revealElement = event.target.closest?.("[data-reveal]");

    if (revealElement) {
      showElement(revealElement);
    }
  });

  /* ======================================================================
     05 / OPTIONAL PHOTOGRAPHY
     Keep the graphic fallback when an image has not been supplied.
     ====================================================================== */

  const optionalImages = [
    ...document.querySelectorAll(
      ".hero-image-frame > img, .capabilities-media > img"
    )
  ];

  optionalImages.forEach((image) => {
    const frame = image.parentElement;

    const markImageLoaded = () => {
      if (!image.naturalWidth) return;

      image.hidden = false;
      frame?.classList.add("has-photograph");
    };

    const markImageMissing = () => {
      image.hidden = true;
      frame?.classList.remove("has-photograph");
    };

    image.addEventListener("load", markImageLoaded);
    image.addEventListener("error", markImageMissing);

    if (image.complete) {
      if (image.naturalWidth) {
        markImageLoaded();
      } else {
        markImageMissing();
      }
    }
  });

  /* ======================================================================
     06 / PROTOTYPE FORM
     Never imply that an inquiry has been sent.
     ====================================================================== */

  const projectForm = document.querySelector("#project-form");
  const formNotice = document.querySelector("#form-notice");

  if (projectForm) {
    projectForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (formNotice) {
        formNotice.setAttribute("role", "status");
        formNotice.textContent =
          "This is a private preview. Inquiry submission is not connected, " +
          "and no project information has been sent.";
      }
    });
  }

  /* ======================================================================
     07 / PREFERENCES & PAGE LIFECYCLE
     ====================================================================== */

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      showAllContent();
    }
  });

  window.addEventListener("beforeprint", showAllContent);

  window.addEventListener("pagehide", () => {
    closeMenu();
    showAllContent();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      synchronizeNavigation();
      showAllContent();
    }

    updateHeader();
  });

  /* ======================================================================
     08 / COPYRIGHT
     ====================================================================== */

  const copyrightYear = document.querySelector("#copyright-year");

  if (copyrightYear) {
    copyrightYear.textContent = String(new Date().getFullYear());
  }
})();
