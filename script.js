(() => {
  "use strict";

  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const header = document.querySelector("#site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  const mobileViewport = window.matchMedia("(max-width: 900px)");

  const main = document.querySelector("main");
  const footer = document.querySelector(".site-footer");

  let menuIsOpen = false;
  let previousBodyOverflow = "";
  let focusBeforeMenu = null;

  /* -----------------------------------------------------------------------
     MOBILE NAVIGATION
     ----------------------------------------------------------------------- */

  const getNavigationLinks = () => {
    if (!navigation) return [];
    return [...navigation.querySelectorAll("a[href]")];
  };

  const setBackgroundInert = (inert) => {
    [main, footer].forEach((element) => {
      if (element) element.inert = inert;
    });
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!header || !menuToggle || !navigation) return;

    const wasOpen = menuIsOpen;

    menuIsOpen = false;

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");

    document.body.classList.remove("menu-open");

    if (wasOpen) {
      document.body.style.overflow = previousBodyOverflow;
    }

    setBackgroundInert(false);

    navigation.hidden = mobileViewport.matches;

    if (restoreFocus && wasOpen) {
      const focusTarget =
        focusBeforeMenu instanceof HTMLElement &&
        focusBeforeMenu.isConnected &&
        !focusBeforeMenu.hidden
          ? focusBeforeMenu
          : menuToggle;

      focusTarget.focus({ preventScroll: true });
    }
  };

  const openMenu = () => {
    if (
      !header ||
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

    setBackgroundInert(true);

    getNavigationLinks()[0]?.focus({ preventScroll: true });
  };

  const synchronizeNavigation = () => {
    if (!header || !menuToggle || !navigation) return;

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

    navigation.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");

      if (!link || !menuIsOpen) return;

      const href = link.getAttribute("href");
      const target =
        href?.startsWith("#") && href.length > 1
          ? document.getElementById(href.slice(1))
          : null;

      closeMenu();

      if (target) {
        const hadTabIndex = target.hasAttribute("tabindex");

        if (!hadTabIndex) {
          target.setAttribute("tabindex", "-1");
        }

        target.focus({ preventScroll: true });

        if (!hadTabIndex) {
          target.addEventListener(
            "blur",
            () => target.removeAttribute("tabindex"),
            { once: true }
          );
        }
      } else {
        menuToggle.focus({ preventScroll: true });
      }
    });
  }

  /* -----------------------------------------------------------------------
     HEADER SCROLL STATE
     ----------------------------------------------------------------------- */

  if (header) {
    let scrollUpdatePending = false;

    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 48);
      scrollUpdatePending = false;
    };

    updateHeader();

    window.addEventListener(
      "scroll",
      () => {
        if (scrollUpdatePending) return;

        scrollUpdatePending = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true }
    );
  }

  /* -----------------------------------------------------------------------
     SECTION REVEALS
     ----------------------------------------------------------------------- */

  const revealElements = [
    ...document.querySelectorAll("[data-reveal]")
  ];

  let revealObserver = null;
  let revealSafetyTimer = null;

  const showAllSections = () => {
    revealObserver?.disconnect();
    window.clearTimeout(revealSafetyTimer);

    revealElements.forEach((element) => {
      element.classList.add("is-visible");
    });

    document.documentElement.classList.remove("reveal-ready");
  };

  if (
    !motionPreference.matches &&
    "IntersectionObserver" in window &&
    revealElements.length
  ) {
    try {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0,
          rootMargin: "0px 0px 40px 0px"
        }
      );

      revealElements.forEach((element) => {
        revealObserver.observe(element);
      });

      document.documentElement.classList.add("reveal-ready");

      document.addEventListener("focusin", (event) => {
        const section = event.target.closest?.("[data-reveal]");

        if (section) {
          section.classList.add("is-visible");
          revealObserver?.unobserve(section);
        }
      });

      // Never leave content hidden indefinitely.
      revealSafetyTimer = window.setTimeout(showAllSections, 12000);
    } catch {
      showAllSections();
    }
  }

  /* -----------------------------------------------------------------------
     DELIVERY PROCESS INDICATOR
     ----------------------------------------------------------------------- */

  const processSteps = [
    ...document.querySelectorAll(".process-step")
  ];

  const processFill = document.querySelector(".process-indicator-fill");
  const processCount = document.querySelector(".process-indicator-count");

  const updateProcess = () => {
    if (!processSteps.length) return;

    const readingPosition = window.innerHeight * 0.52;
    let activeIndex = 0;

    processSteps.forEach((step, index) => {
      if (step.getBoundingClientRect().top <= readingPosition) {
        activeIndex = index;
      }
    });

    processSteps.forEach((step, index) => {
      step.classList.toggle("is-active", index === activeIndex);
    });

    if (processFill) {
      const progress = (activeIndex + 1) / processSteps.length;
      processFill.style.transform = `scaleX(${progress})`;
    }

    if (processCount) {
      const current = String(activeIndex + 1).padStart(2, "0");
      const total = String(processSteps.length).padStart(2, "0");

      processCount.textContent = `${current} — ${total}`;
    }
  };

  if (processSteps.length) {
    let processUpdatePending = false;

    const scheduleProcessUpdate = () => {
      if (processUpdatePending) return;

      processUpdatePending = true;

      window.requestAnimationFrame(() => {
        updateProcess();
        processUpdatePending = false;
      });
    };

    updateProcess();

    window.addEventListener("scroll", scheduleProcessUpdate, {
      passive: true
    });

    window.addEventListener("resize", scheduleProcessUpdate, {
      passive: true
    });
  }

  /* -----------------------------------------------------------------------
     HERO ROUTE ANIMATION
     ----------------------------------------------------------------------- */

  const hero = document.querySelector(".hero");
  const surfaceRoute = document.querySelector(".route-path-surface");
  const signal = document.querySelector(".route-signal");
  const signalGlow = document.querySelector(".route-signal-glow");

  let heroStartFrame = null;
  let signalFrame = null;
  let signalTimer = null;
  let heroFinishTimer = null;

  const hideSignal = () => {
    [signal, signalGlow].forEach((element) => {
      if (element) element.setAttribute("opacity", "0");
    });
  };

  const stopHeroAnimation = () => {
    window.cancelAnimationFrame(heroStartFrame);
    window.cancelAnimationFrame(signalFrame);
    window.clearTimeout(signalTimer);
    window.clearTimeout(heroFinishTimer);

    hero?.classList.remove("is-animating");

    hideSignal();
  };

  const animateSignal = () => {
    if (
      motionPreference.matches ||
      document.hidden ||
      !surfaceRoute ||
      !signal ||
      !signalGlow
    ) {
      return;
    }

    const heroBounds = hero?.getBoundingClientRect();

    if (
      !heroBounds ||
      heroBounds.bottom <= 0 ||
      heroBounds.top >= window.innerHeight
    ) {
      return;
    }

    const routeLength = surfaceRoute.getTotalLength();
    const duration = 1700;
    let startedAt = null;

    const tick = (timestamp) => {
      if (motionPreference.matches || document.hidden) {
        hideSignal();
        return;
      }

      if (startedAt === null) startedAt = timestamp;

      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const point = surfaceRoute.getPointAtLength(routeLength * progress);

      const fadeIn = Math.min(progress / 0.12, 1);
      const fadeOut = Math.min((1 - progress) / 0.15, 1);
      const opacity = Math.max(0, Math.min(fadeIn, fadeOut));

      [signal, signalGlow].forEach((element) => {
        element.setAttribute("cx", String(point.x));
        element.setAttribute("cy", String(point.y));
      });

      signal.setAttribute("opacity", String(opacity));
      signalGlow.setAttribute("opacity", String(opacity * 0.65));

      if (progress < 1) {
        signalFrame = window.requestAnimationFrame(tick);
      } else {
        hideSignal();
      }
    };

    signalFrame = window.requestAnimationFrame(tick);
  };

  if (hero && !motionPreference.matches && !document.hidden) {
    heroStartFrame = window.requestAnimationFrame(() => {
      if (motionPreference.matches || document.hidden) return;

      hero.classList.add("is-animating");

      signalTimer = window.setTimeout(animateSignal, 3250);

      heroFinishTimer = window.setTimeout(() => {
        hero.classList.remove("is-animating");
      }, 5300);
    });
  }

  /* -----------------------------------------------------------------------
     USER PREFERENCES & PAGE LIFECYCLE
     ----------------------------------------------------------------------- */

  motionPreference.addEventListener("change", (event) => {
    if (!event.matches) return;

    showAllSections();
    stopHeroAnimation();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroAnimation();
    }
  });

  window.addEventListener("pagehide", () => {
    closeMenu();
    stopHeroAnimation();
    showAllSections();
  });

  window.addEventListener("pageshow", () => {
    updateProcess();
  });

  /* -----------------------------------------------------------------------
     PROTOTYPE FORM SAFEGUARD
     ----------------------------------------------------------------------- */

  const projectForm = document.querySelector("#project-form");

  if (projectForm) {
    projectForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const notice = document.querySelector("#form-notice");

      if (notice) {
        notice.textContent =
          "This is a preview only. Project inquiries are not being sent.";

        notice.setAttribute("role", "status");
      }
    });
  }

  /* -----------------------------------------------------------------------
     FOOTER YEAR
     ----------------------------------------------------------------------- */

  const copyrightYear = document.querySelector("#copyright-year");

  if (copyrightYear) {
    copyrightYear.textContent = String(new Date().getFullYear());
  }
})();
