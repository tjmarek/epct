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

  /* ======================================================================
     01 / INDEPENDENT GRAPHIC ASSEMBLIES
     Expand the shared symbol so each illustration's internal groups can
     respond independently to its surrounding CSS state.
     ====================================================================== */

  const assemblySymbol = document.querySelector(
    "#infrastructure-assembly"
  );

  if (assemblySymbol) {
    document
      .querySelectorAll('use[href="#infrastructure-assembly"]')
      .forEach((instance) => {
        const group = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );

        group.classList.add("assembly-instance");

        [...assemblySymbol.children].forEach((child) => {
          group.appendChild(child.cloneNode(true));
        });

        instance.replaceWith(group);
      });
  }

  /* ======================================================================
     02 / MOBILE NAVIGATION
     ====================================================================== */

  let menuIsOpen = false;
  let focusBeforeMenu = null;
  let previousBodyOverflow = "";

  const backgroundInertStates = new Map();

  const getNavigationLinks = () => {
    if (!navigation) return [];

    return [...navigation.querySelectorAll("a[href]")];
  };

  const lockBackground = () => {
    [main, footer].forEach((element) => {
      if (!element) return;

      backgroundInertStates.set(
        element,
        element.hasAttribute("inert")
      );

      element.setAttribute("inert", "");
    });
  };

  const unlockBackground = () => {
    backgroundInertStates.forEach((wasInert, element) => {
      if (wasInert) {
        element.setAttribute("inert", "");
      } else {
        element.removeAttribute("inert");
      }
    });

    backgroundInertStates.clear();
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
     03 / SECTION REVEALS
     All content is visible unless enhancement initializes successfully.
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

  const revealTarget = (target) => {
    const parentReveal = target.closest?.("[data-reveal]");

    if (parentReveal) {
      showElement(parentReveal);
    }

    target.querySelectorAll?.("[data-reveal]").forEach(showElement);
  };

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
        if (element.getBoundingClientRect().top < window.innerHeight) {
          element.classList.add("is-visible");
        } else {
          revealObserver.observe(element);
        }
      });

      document.documentElement.classList.add("reveal-ready");

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
     04 / NATIVE ANCHOR NAVIGATION
     Preserve browser scrolling, URL fragments, and modifier-key behavior.
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
  });

  /* ======================================================================
     05 / HERO ASSEMBLY
     A single entrance sequence. No loops or continuous rendering.
     ====================================================================== */

  const hero = document.querySelector(".hero");
  const heroAssembly = document.querySelector(
    ".hero-assembly .assembly-instance"
  );

  let heroFrameOne = null;
  let heroFrameTwo = null;
  let heroSafetyTimer = null;

  const settleHero = () => {
    window.cancelAnimationFrame(heroFrameOne);
    window.cancelAnimationFrame(heroFrameTwo);
    window.clearTimeout(heroSafetyTimer);

    hero?.classList.remove("is-preparing", "is-assembled");
  };

  const initializeHero = () => {
    if (
      !hero ||
      !heroAssembly ||
      reducedMotion.matches ||
      document.hidden ||
      window.scrollY > window.innerHeight * 0.5
    ) {
      return;
    }

    hero.classList.add("is-preparing");

    heroFrameOne = window.requestAnimationFrame(() => {
      heroFrameTwo = window.requestAnimationFrame(() => {
        if (reducedMotion.matches || document.hidden) {
          settleHero();
          return;
        }

        hero.classList.add("is-assembled");
        hero.classList.remove("is-preparing");
      });
    });

    heroSafetyTimer = window.setTimeout(settleHero, 2400);
  };

  initializeHero();

  /* ======================================================================
     06 / CAPABILITY STORY
     Read scroll position only when requested; update only on state changes.
     ====================================================================== */

  const capabilityStory = document.querySelector(
    "[data-capability-story]"
  );

  const capabilityStage = document.querySelector(".capability-stage");

  const capabilityPassages = [
    ...document.querySelectorAll(".capability-passage[data-discipline]")
  ];

  const stageLabel = capabilityStage?.querySelector(".stage-label");
  const stageCount = capabilityStage?.querySelector(".stage-count");

  const disciplineLabels = {
    design: "Engineering & design",
    permitting: "Permitting & coordination",
    construction: "Construction & installation"
  };

  let activeDiscipline = "";

  const setActiveDiscipline = (passage, index) => {
    if (!capabilityStage || !passage) return;

    const discipline = passage.dataset.discipline;

    if (!discipline || discipline === activeDiscipline) return;

    activeDiscipline = discipline;
    capabilityStage.dataset.activeDiscipline = discipline;

    if (stageLabel) {
      stageLabel.textContent =
        disciplineLabels[discipline] || discipline;
    }

    if (stageCount) {
      const current = String(index + 1).padStart(2, "0");
      const total = String(capabilityPassages.length).padStart(2, "0");

      stageCount.textContent = `${current} / ${total}`;
    }

    capabilityPassages.forEach((item) => {
      item.classList.toggle("is-active", item === passage);
    });
  };

  const updateCapabilityStory = () => {
    if (
      !capabilityStory ||
      !capabilityStage ||
      !capabilityPassages.length
    ) {
      return;
    }

    const headerHeight =
      header?.getBoundingClientRect().height || 0;

    const readingLine =
      headerHeight +
      Math.max(0, window.innerHeight - headerHeight) * 0.48;

    let activeIndex = 0;

    capabilityPassages.forEach((passage, index) => {
      if (passage.getBoundingClientRect().top <= readingLine) {
        activeIndex = index;
      }
    });

    setActiveDiscipline(
      capabilityPassages[activeIndex],
      activeIndex
    );
  };

  /* ======================================================================
     07 / SHARED SCROLL & RESIZE SCHEDULER
     ====================================================================== */

  let viewportFrame = null;

  const updateViewport = () => {
    viewportFrame = null;

    header?.classList.toggle("is-scrolled", window.scrollY > 48);

    updateCapabilityStory();
  };

  const scheduleViewportUpdate = () => {
    if (viewportFrame !== null) return;

    viewportFrame = window.requestAnimationFrame(updateViewport);
  };

  updateViewport();

  window.addEventListener("scroll", scheduleViewportUpdate, {
    passive: true
  });

  window.addEventListener("resize", scheduleViewportUpdate, {
    passive: true
  });

  window.addEventListener("load", scheduleViewportUpdate, {
    once: true
  });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleViewportUpdate).catch(() => {});
  }

  /* ======================================================================
     08 / USER PREFERENCES & PAGE LIFECYCLE
     ====================================================================== */

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      settleHero();
      showAllContent();
    }

    scheduleViewportUpdate();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      settleHero();
    } else {
      scheduleViewportUpdate();
    }
  });

  window.addEventListener("beforeprint", () => {
    settleHero();
    showAllContent();
  });

  window.addEventListener("pagehide", () => {
    closeMenu();
    settleHero();
    showAllContent();

    if (viewportFrame !== null) {
      window.cancelAnimationFrame(viewportFrame);
      viewportFrame = null;
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      synchronizeNavigation();
      settleHero();
      showAllContent();
    }

    scheduleViewportUpdate();
  });

  /* ======================================================================
     09 / COPYRIGHT
     ====================================================================== */

  const copyrightYear = document.querySelector("#copyright-year");

  if (copyrightYear) {
    copyrightYear.textContent = String(new Date().getFullYear());
  }
})();
